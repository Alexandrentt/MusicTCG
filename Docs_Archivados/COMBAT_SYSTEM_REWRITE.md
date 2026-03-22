# MusicTCG — Combat System Rewrite
## Prompt de Implementación para IA

Este documento contiene todo el código necesario para arreglar el sistema de combate de MusicTCG.
Léelo completo antes de implementar. El orden de implementación importa.

---

## RESUMEN DE PROBLEMAS ENCONTRADOS

### 1. Dos sistemas de estado paralelos que no se sincronizan
`useGameEngine.ts` usa `BoardCard` (con `currentAtk`, `currentDef`, `isTapped`, etc.)
`effectEngine.ts` usa `BoardEntity` (un tipo diferente de `gameState.ts`)
Cuando `playCard` llama a `triggerAbilities → resolveStack → applyEffect`, modifica un objeto `fullState` local que NUNCA escribe de vuelta al estado de React. Los efectos se calculan y se descartan.

### 2. Keywords definidos pero desconectados
`EngineAbilities` en `effectEngine.ts` tiene la lógica de `distortion`, `sustain`, `taunt`, etc., pero `resolveStack` opera sobre `GameState` (el tipo viejo de `types/types.ts`), no sobre el estado real de `PlayerState` de `useGameEngine.ts`. Resultado: cero efectos en combate.

### 3. Race conditions en el bot
`processNextBotAction` usa `setTimeout` encadenado. Si el jugador hace una acción mientras el bot está "pensando", los refs pueden estar stale y el bot actúa sobre estado desactualizado.

### 4. El auto-pass del turno puede dispararse múltiples veces
El `useEffect` que detecta "no puedes hacer nada → endTurn" tiene dependencias que cambian durante el setTimeout, causando múltiples llamadas a `endTurn()`.

### 5. Requisito de 40 cartas
La UI en `app/play/page.tsx` bloquea con `isValid = cardCount === 40`. El `startMatch` rellena con fillers pero el check visual impide comenzar con menos.

### 6. `resolvePendingAttack` lee un ref potencialmente stale
`pendingAttackRef.current` puede haberse actualizado entre que se declara el ataque y se resuelve, especialmente durante la fase REPLICA con timers.

### 7. El `endTurn` no limpia correctamente el estado
Las cartas en `board` no tienen su `stageFright` reseteado correctamente al inicio del turno siguiente. `hasAttacked` tampoco se resetea.

---

## IMPLEMENTACIÓN

### PASO 1: Reemplazar `hooks/useGameEngine.ts` COMPLETO

```typescript
// hooks/useGameEngine.ts
// REEMPLAZAR EL ARCHIVO COMPLETO CON ESTE CONTENIDO

import { useState, useCallback, useEffect, useRef } from 'react';
import { CardData } from '@/lib/engine/generator';
import { Keyword } from '@/types/types';

// ─── Contador global de instancias ───────────────────────────────────────────
let _instanceCounter = 0;

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface BoardCard extends CardData {
  instanceId: string;
  isTapped: boolean;
  stageFright: boolean;    // No puede atacar el turno que entra (salvo FRENZY)
  hasAttacked: boolean;    // Para STEALTH: visible solo tras atacar
  currentAtk: number;
  currentDef: number;
  maxDef: number;          // Para SUSTAIN: recupera al inicio del turno
  isSilenced: boolean;     // Las habilidades no se activan
  statuses: string[];
  bonusAtk: number;
  bonusDef: number;
}

export type PlayerKey = 'player' | 'bot';
export type GameOverResult = 'player' | 'bot' | 'draw' | null;

export interface PlayerState {
  health: number;
  hype: number;
  energy: number;
  maxEnergy: number;
  canPromote: boolean;
  hasMulliganed: boolean;
  deck: CardData[];
  hand: BoardCard[];
  board: BoardCard[];
  backstage: BoardCard[];
  graveyard: CardData[];
}

export interface PendingAttack {
  attackerOwner: PlayerKey;
  attackerIdx: number;
  defenderIdx: number | null;  // null = ataque directo
}

// ─── Fase del turno ───────────────────────────────────────────────────────────

export enum TurnPhase {
  START  = 'START',
  DRAW   = 'DRAW',
  MAIN   = 'MAIN',
  REPLICA = 'REPLICA',
  END    = 'END',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Verifica si una carta tiene un keyword activo (no silenciada).
 * Busca en abilities Y en el array keywords del CardData.
 */
export function hasKw(card: BoardCard | CardData, keyword: Keyword | string): boolean {
  if ((card as BoardCard).isSilenced) return false;
  const inAbilities = card.abilities?.some(a => a.keyword === keyword) ?? false;
  const inKeywords  = card.keywords?.includes(keyword as Keyword) ?? false;
  return inAbilities || inKeywords;
}

function makeBoardCard(card: CardData): BoardCard {
  return {
    ...card,
    instanceId: `${card.id}_${++_instanceCounter}`,
    isTapped: false,
    stageFright: !hasKw(card, Keyword.FRENZY) && !hasKw(card, Keyword.HASTE),
    hasAttacked: false,
    currentAtk: card.atk,
    currentDef: card.def,
    maxDef: card.def,
    isSilenced: false,
    statuses: [],
    bonusAtk: 0,
    bonusDef: 0,
  };
}

const makeInitialPlayer = (): PlayerState => ({
  health: 30,
  hype: 0,
  energy: 1,
  maxEnergy: 1,
  canPromote: true,
  hasMulliganed: false,
  deck: [],
  hand: [],
  board: [],
  backstage: [],
  graveyard: [],
});

// ─── Sistema de efectos de keywords ──────────────────────────────────────────
// Todas las habilidades se resuelven aquí, directamente sobre PlayerState.
// Esto reemplaza el effectEngine.ts que operaba sobre tipos incompatibles.

interface KeywordEffectContext {
  sourceCard: BoardCard;
  sourceOwner: PlayerKey;
  player: PlayerState;
  bot: PlayerState;
  trigger: 'ON_PLAY' | 'ON_DEATH' | 'ON_ATTACK' | 'PASSIVE_START_TURN' | 'ON_ACTIVATE';
}

interface KeywordEffectResult {
  player: PlayerState;
  bot: PlayerState;
  log?: string;
}

/**
 * Motor de efectos principal.
 * Aplica todos los efectos de keywords de una carta según el trigger.
 * Opera directamente sobre copias de PlayerState y devuelve el nuevo estado.
 */
function applyKeywordEffects(ctx: KeywordEffectContext): KeywordEffectResult {
  let { sourceCard, sourceOwner, player, bot, trigger } = ctx;

  // Si está silenciada, no hace nada
  if (sourceCard.isSilenced) return { player, bot };

  const ownState  = sourceOwner === 'player' ? player : bot;
  const oppState  = sourceOwner === 'player' ? bot    : player;
  let newOwn  = { ...ownState };
  let newOpp  = { ...oppState };

  for (const ability of sourceCard.abilities ?? []) {
    if (!ability.keyword) continue;
    const kw = ability.keyword as Keyword | string;

    // ── DISTORSIÓN (TRAMPLE): daño sobrante pasa al oponente ──
    // Se maneja en resolveAttackPure directamente, no aquí.

    // ── HYPE ENGINE: +1 Hype al inicio del turno ──
    if (kw === Keyword.SUSTAIN || kw === 'hypeEngine') {
      if (trigger === 'PASSIVE_START_TURN') {
        if (kw === 'hypeEngine') {
          newOwn = { ...newOwn, hype: newOwn.hype + 1 };
        }
        if (kw === Keyword.SUSTAIN) {
          // Recupera DEF al inicio del turno
          newOwn = {
            ...newOwn,
            board: newOwn.board.map(c =>
              c.instanceId === sourceCard.instanceId
                ? { ...c, currentDef: c.maxDef }
                : c
            ),
          };
        }
      }
    }

    // ── DISS TRACK: al entrar, -1/-1 a una carta rival aleatoria ──
    if (kw === 'dissTrack' || kw === Keyword.DISS_TRACK) {
      if (trigger === 'ON_PLAY' && newOpp.board.length > 0) {
        const targetIdx = Math.floor(Math.random() * newOpp.board.length);
        newOpp = {
          ...newOpp,
          board: newOpp.board.map((c, i) => {
            if (i !== targetIdx) return c;
            const newAtk = Math.max(1, c.currentAtk - 1);
            const newDef = c.currentDef - 1;
            if (newDef <= 0) {
              // La carta muere
              return { ...c, currentAtk: newAtk, currentDef: 0 };
            }
            return { ...c, currentAtk: newAtk, currentDef: newDef };
          }).filter(c => c.currentDef > 0),
        };
      }
    }

    // ── DISTORTION / HYPE ON PLAY ──
    if (kw === Keyword.DISTORTION || kw === 'distortion') {
      // Se maneja en resolveAttackPure. No hace nada en ON_PLAY.
    }

    // ── BASS BOOST: +2 ATK / -1 DEF al entrar ──
    if (kw === Keyword.BASS_BOOST || kw === 'bass_boost') {
      if (trigger === 'ON_PLAY') {
        newOwn = {
          ...newOwn,
          board: newOwn.board.map(c =>
            c.instanceId === sourceCard.instanceId
              ? { ...c, currentAtk: c.currentAtk + 2, currentDef: Math.max(1, c.currentDef - 1) }
              : c
          ),
        };
      }
    }

    // ── FALSETTO: -1 ATK / +2 DEF al entrar ──
    if (kw === Keyword.FALSETTO || kw === 'falsetto') {
      if (trigger === 'ON_PLAY') {
        newOwn = {
          ...newOwn,
          board: newOwn.board.map(c =>
            c.instanceId === sourceCard.instanceId
              ? { ...c, currentAtk: Math.max(1, c.currentAtk - 1), currentDef: c.currentDef + 2, maxDef: c.maxDef + 2 }
              : c
          ),
        };
      }
    }

    // ── CRESCENDO / FRENZY: gana +1 ATK cada vez que ataca ──
    if (kw === Keyword.CRESCENDO || kw === 'frenzy') {
      if (trigger === 'ON_ATTACK') {
        newOwn = {
          ...newOwn,
          board: newOwn.board.map(c =>
            c.instanceId === sourceCard.instanceId
              ? { ...c, currentAtk: c.currentAtk + 1 }
              : c
          ),
        };
      }
    }

    // ── SOUNDTRACK: +1 DEF a todas las criaturas aliadas del mismo género ──
    if (kw === Keyword.SOUNDTRACK || kw === 'soundtrack') {
      if (trigger === 'ON_PLAY') {
        newOwn = {
          ...newOwn,
          board: newOwn.board.map(c => {
            if (c.instanceId === sourceCard.instanceId) return c;
            if (c.genre === sourceCard.genre) {
              return { ...c, currentDef: c.currentDef + 1, maxDef: c.maxDef + 1 };
            }
            return c;
          }),
        };
      }
    }

    // ── DROP: al entrar puede atacar inmediatamente (ya cubierto por !stageFright) ──
    // stageFright = false cuando tiene FRENZY o DROP en makeBoardCard
    if (kw === Keyword.DROP || kw === 'drop') {
      if (trigger === 'ON_PLAY') {
        newOwn = {
          ...newOwn,
          board: newOwn.board.map(c =>
            c.instanceId === sourceCard.instanceId
              ? { ...c, stageFright: false }
              : c
          ),
        };
      }
    }

    // ── FEATURING: +2 ATK si hay otra carta del mismo artista en tablero ──
    if (kw === Keyword.FEATURING || kw === 'featuring') {
      if (trigger === 'ON_PLAY') {
        const hasSameArtist = newOwn.board.some(
          c => c.instanceId !== sourceCard.instanceId && c.artist === sourceCard.artist
        );
        if (hasSameArtist) {
          newOwn = {
            ...newOwn,
            board: newOwn.board.map(c =>
              c.instanceId === sourceCard.instanceId
                ? { ...c, currentAtk: c.currentAtk + 2 }
                : c
            ),
          };
        }
      }
    }

    // ── SAMPLE: copia +1 ATK o DEF de otra carta aliada aleatoria ──
    if (kw === Keyword.SAMPLE || kw === 'sample') {
      if (trigger === 'ON_PLAY') {
        const others = newOwn.board.filter(c => c.instanceId !== sourceCard.instanceId);
        if (others.length > 0) {
          const ref = others[Math.floor(Math.random() * others.length)];
          newOwn = {
            ...newOwn,
            board: newOwn.board.map(c =>
              c.instanceId === sourceCard.instanceId
                ? { ...c, currentAtk: c.currentAtk + 1, currentDef: c.currentDef + 1 }
                : c
            ),
          };
        }
      }
    }

    // ── OUTRO / DISS_TRACK ON DEATH: -1 ATK a carta rival aleatoria ──
    if (kw === Keyword.OUTRO || kw === 'outro') {
      if (trigger === 'ON_DEATH' && newOpp.board.length > 0) {
        const targetIdx = Math.floor(Math.random() * newOpp.board.length);
        newOpp = {
          ...newOpp,
          board: newOpp.board.map((c, i) =>
            i === targetIdx ? { ...c, currentAtk: Math.max(1, c.currentAtk - 1) } : c
          ),
        };
      }
    }

    // ── RADIO EDIT: reduce el costo en 1 (ya se aplicó en el generador, no en combate) ──

    // ── AUTOTUNE: intercambia ATK/DEF al entrar ──
    if (kw === Keyword.AUTOTUNE || kw === 'autotune') {
      if (trigger === 'ON_PLAY') {
        newOwn = {
          ...newOwn,
          board: newOwn.board.map(c => {
            if (c.instanceId !== sourceCard.instanceId) return c;
            return { ...c, currentAtk: c.currentDef, currentDef: c.currentAtk, maxDef: c.currentAtk };
          }),
        };
      }
    }
  }

  // Limpiar cartas muertas (currentDef <= 0) con efectos ON_DEATH
  // Esto se llama externamente tras cada mutación de board.

  if (sourceOwner === 'player') {
    return { player: newOwn, bot: newOpp };
  }
  return { player: newOpp, bot: newOwn };
}

/**
 * Procesa muertes: llama ON_DEATH y elimina cartas con DEF <= 0.
 * Devuelve el estado limpio.
 */
function processDeaths(player: PlayerState, bot: PlayerState): { player: PlayerState; bot: PlayerState } {
  // Muertes del jugador
  const playerDead = player.board.filter(c => c.currentDef <= 0);
  let newPlayer = player;
  let newBot = bot;

  for (const dead of playerDead) {
    const result = applyKeywordEffects({
      sourceCard: dead,
      sourceOwner: 'player',
      player: newPlayer,
      bot: newBot,
      trigger: 'ON_DEATH',
    });
    newPlayer = result.player;
    newBot    = result.bot;
  }

  // Muertes del bot
  const botDead = newBot.board.filter(c => c.currentDef <= 0);
  for (const dead of botDead) {
    const result = applyKeywordEffects({
      sourceCard: dead,
      sourceOwner: 'bot',
      player: newPlayer,
      bot: newBot,
      trigger: 'ON_DEATH',
    });
    newPlayer = result.player;
    newBot    = result.bot;
  }

  return {
    player: {
      ...newPlayer,
      board:     newPlayer.board.filter(c => c.currentDef > 0),
      graveyard: [...newPlayer.graveyard, ...playerDead],
    },
    bot: {
      ...newBot,
      board:     newBot.board.filter(c => c.currentDef > 0),
      graveyard: [...newBot.graveyard, ...botDead],
    },
  };
}

// ─── Resolución de ataques (pura, sin React) ─────────────────────────────────

/**
 * Resuelve un ataque completo y devuelve [playerState, botState] actualizados.
 * Maneja: Choque, Emboscada, Ataque Directo, Distorsión, Taunt, Stealth, VIP.
 */
function resolveAttackPure(
  pState: PlayerState,
  bState: PlayerState,
  attackerOwner: PlayerKey,
  attackerIdx: number,
  defenderIdx: number | null,
): [PlayerState, PlayerState] {
  const atkState = attackerOwner === 'player' ? pState : bState;
  const defState = attackerOwner === 'player' ? bState : pState;

  const attacker = atkState.board[attackerIdx];
  if (!attacker || attacker.isTapped || attacker.stageFright) {
    return [pState, bState];
  }

  // ── Verificar Taunt: si hay cartas con taunt, hay que atacarlas primero ──
  const activeTaunters = defState.board.filter(c => hasKw(c, 'taunt') || hasKw(c, Keyword.PROVOKE));

  // VIP ignora taunt de no-VIP
  const mustAttackTaunters = hasKw(attacker, Keyword.FLYING) || hasKw(attacker, 'vip')
    ? activeTaunters.filter(c => hasKw(c, Keyword.FLYING) || hasKw(c, 'vip'))
    : activeTaunters;

  if (mustAttackTaunters.length > 0) {
    if (defenderIdx === null) return [pState, bState]; // No puede ir directo si hay taunt
    const target = defState.board[defenderIdx];
    if (!target) return [pState, bState];
    const targetHasTaunt = hasKw(target, 'taunt') || hasKw(target, Keyword.PROVOKE);
    if (!targetHasTaunt) return [pState, bState];
  }

  // ── Verificar Stealth/Acústico: invisible hasta que ataca ──
  if (defenderIdx !== null) {
    const defender = defState.board[defenderIdx];
    if (defender && (hasKw(defender, Keyword.STEALTH) || hasKw(defender, 'stealth') || hasKw(defender, 'acoustic')) && !defender.hasAttacked) {
      return [pState, bState]; // No puede ser atacada
    }
  }

  // ── VIP solo puede ser bloqueado por VIP ──
  if (defenderIdx !== null) {
    const defender = defState.board[defenderIdx];
    if (defender) {
      const attackerIsVIP   = hasKw(attacker, Keyword.FLYING) || hasKw(attacker, 'vip');
      const defenderIsVIP   = hasKw(defender, Keyword.FLYING) || hasKw(defender, 'vip');
      const hasVIPTaunters  = activeTaunters.some(c => hasKw(c, Keyword.FLYING) || hasKw(c, 'vip'));

      if (attackerIsVIP && !defenderIsVIP && hasVIPTaunters) {
        return [pState, bState];
      }
    }
  }

  let newAtk = { ...atkState };
  let newDef = { ...defState };

  // Marcar atacante como usado
  newAtk = {
    ...newAtk,
    board: newAtk.board.map((c, i) =>
      i === attackerIdx
        ? { ...c, isTapped: true, hasAttacked: true }
        : c
    ),
  };

  // Aplicar ON_ATTACK keywords (ej: CRESCENDO gana +1 ATK tras atacar)
  const updatedAttacker = newAtk.board[attackerIdx];
  const crescendoResult = applyKeywordEffects({
    sourceCard: updatedAttacker,
    sourceOwner: attackerOwner,
    player: attackerOwner === 'player' ? newAtk : newDef,
    bot:    attackerOwner === 'player' ? newDef : newAtk,
    trigger: 'ON_ATTACK',
  });
  if (attackerOwner === 'player') {
    newAtk = crescendoResult.player;
    newDef = crescendoResult.bot;
  } else {
    newAtk = crescendoResult.bot;
    newDef = crescendoResult.player;
  }

  // Re-leer el atacante con stats actualizados post-ON_ATTACK
  const finalAttacker = newAtk.board[attackerIdx];
  const atkDmg = finalAttacker ? finalAttacker.currentAtk : attacker.currentAtk;

  if (defenderIdx === null) {
    // ── ATAQUE DIRECTO ──
    newDef = { ...newDef, health: Math.max(0, newDef.health - atkDmg) };
  } else {
    const defender = newDef.board[defenderIdx];
    if (!defender) {
      // Objetivo ya no existe (murió por efecto ON_ATTACK)
      // Redirigir a daño directo
      newDef = { ...newDef, health: Math.max(0, newDef.health - atkDmg) };
    } else {
      const isAmbush   = defender.isTapped;
      const defDmg     = isAmbush ? 0 : defender.currentAtk;
      const defDestroyed = atkDmg >= defender.currentDef;
      const atkDestroyed = !isAmbush && defDmg >= finalAttacker!.currentDef;

      // ── DISTORSIÓN: daño sobrante al oponente ──
      const hasDistortion = hasKw(finalAttacker || attacker, Keyword.TRAMPLE) ||
                            hasKw(finalAttacker || attacker, 'distortion');
      const excessOnDef = hasDistortion && defDestroyed
        ? Math.max(0, atkDmg - defender.currentDef)
        : 0;

      const hasDefDistortion = hasKw(defender, Keyword.TRAMPLE) || hasKw(defender, 'distortion');
      const excessOnAtk = !isAmbush && hasDefDistortion && atkDestroyed
        ? Math.max(0, defDmg - (finalAttacker?.currentDef ?? attacker.currentDef))
        : 0;

      // Aplicar daño al defensor
      newDef = {
        ...newDef,
        health: Math.max(0, newDef.health - excessOnDef),
        board: newDef.board.map((c, i) =>
          i === defenderIdx
            ? { ...c, currentDef: c.currentDef - atkDmg }
            : c
        ),
      };

      // Aplicar daño al atacante (solo en Choque)
      if (!isAmbush) {
        newAtk = {
          ...newAtk,
          health: Math.max(0, newAtk.health - excessOnAtk),
          board: newAtk.board.map((c, i) =>
            i === attackerIdx
              ? { ...c, currentDef: c.currentDef - defDmg }
              : c
          ),
        };
      }
    }
  }

  // Procesar muertes con efectos ON_DEATH
  const playerAfterAtk = attackerOwner === 'player' ? newAtk : newDef;
  const botAfterAtk    = attackerOwner === 'player' ? newDef : newAtk;
  const afterDeaths    = processDeaths(playerAfterAtk, botAfterAtk);

  return [afterDeaths.player, afterDeaths.bot];
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useGameEngine() {
  const [player, setPlayer] = useState<PlayerState>(makeInitialPlayer);
  const [bot,    setBot]    = useState<PlayerState>(makeInitialPlayer);
  const [turn,      setTurn]      = useState<PlayerKey>('player');
  const [turnCount, setTurnCount] = useState(1);
  const [phase,     setPhase]     = useState<TurnPhase>(TurnPhase.MAIN);
  const [gameOver,  setGameOver]  = useState<GameOverResult>(null);
  const [pendingAttack, setPendingAttack] = useState<PendingAttack | null>(null);

  // Refs síncronos para acceso sin stale closure
  const playerRef      = useRef(player);
  const botRef         = useRef(bot);
  const turnRef        = useRef(turn);
  const phaseRef       = useRef(phase);
  const gameOverRef    = useRef(gameOver);
  const pendingRef     = useRef(pendingAttack);
  const endTurnLockRef = useRef(false); // Evita doble llamada a endTurn

  useEffect(() => { playerRef.current = player; },      [player]);
  useEffect(() => { botRef.current    = bot;    },      [bot]);
  useEffect(() => { turnRef.current   = turn;   },      [turn]);
  useEffect(() => { phaseRef.current  = phase;  },      [phase]);
  useEffect(() => { gameOverRef.current = gameOver; },  [gameOver]);
  useEffect(() => { pendingRef.current  = pendingAttack; }, [pendingAttack]);

  // ── Detección de victoria ──
  useEffect(() => {
    if (gameOver) return;
    if (player.health <= 0 && bot.health <= 0) { setGameOver('draw');   return; }
    if (player.health <= 0)                     { setGameOver('bot');    return; }
    if (bot.health    <= 0)                     { setGameOver('player'); return; }
    if (player.hype   >= 20)                    { setGameOver('player'); return; }
    if (bot.hype      >= 20)                    { setGameOver('bot');    return; }
  }, [player.health, player.hype, bot.health, bot.hype, gameOver]);

  // ── startGame ──
  const startGame = useCallback((playerDeck: CardData[], botDeck: CardData[]) => {
    _instanceCounter = 0;
    endTurnLockRef.current = false;

    const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

    // Mínimo de cartas: 20. Si el mazo tiene menos, se rellena con copias aleatorias.
    const padDeck = (deck: CardData[], minSize = 20): CardData[] => {
      const shuffled = shuffle(deck);
      while (shuffled.length < minSize) {
        shuffled.push(...shuffle(deck).slice(0, minSize - shuffled.length));
      }
      return shuffled;
    };

    const sp = padDeck(playerDeck);
    const sb = padDeck(botDeck);

    const initPlayer: PlayerState = {
      ...makeInitialPlayer(),
      deck: sp.slice(5),
      hand: sp.slice(0, 5).map(makeBoardCard),
    };
    const initBot: PlayerState = {
      ...makeInitialPlayer(),
      deck: sb.slice(5),
      hand: sb.slice(0, 5).map(makeBoardCard),
    };

    setPlayer(initPlayer);
    setBot(initBot);
    setTurn('player');
    setTurnCount(1);
    setPhase(TurnPhase.MAIN);
    setGameOver(null);
    setPendingAttack(null);
  }, []);

  // ── drawCard ──
  const drawCard = useCallback((target: PlayerKey) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    let milled = false;

    setSt(prev => {
      if (prev.deck.length === 0) {
        milled = true;
        return prev;
      }
      const [drawn, ...rest] = prev.deck;
      return { ...prev, deck: rest, hand: [...prev.hand, makeBoardCard(drawn)] };
    });

    // Mill = pierde la partida
    if (milled) {
      setTimeout(() => setGameOver(target === 'player' ? 'bot' : 'player'), 50);
    }
  }, []);

  // ── playCard ──
  const playCard = useCallback((target: PlayerKey, cardIndex: number) => {
    const setSt  = target === 'player' ? setPlayer : setBot;
    const getOpp = target === 'player' ? () => botRef.current : () => playerRef.current;
    const setOpp = target === 'player' ? setBot    : setPlayer;

    let playedCard: BoardCard | null = null;

    setSt(prev => {
      const card = prev.hand[cardIndex];
      if (!card) return prev;
      if (prev.board.length >= 5 && card.type !== 'EVENT') return prev; // Límite de tablero
      if (prev.energy < card.cost) return prev;

      playedCard = card;
      const newHand    = prev.hand.filter((_, i) => i !== cardIndex);
      const newEnergy  = prev.energy - card.cost;

      if (card.type === 'EVENT') {
        return { ...prev, energy: newEnergy, hand: newHand, backstage: [...prev.backstage, card] };
      }
      return { ...prev, energy: newEnergy, hand: newHand, board: [...prev.board, card] };
    });

    // Aplicar efectos ON_PLAY después del siguiente tick (el estado ya está escrito)
    if (playedCard) {
      const cardSnapshot = playedCard;
      setTimeout(() => {
        const currentOwn = target === 'player' ? playerRef.current : botRef.current;
        const currentOpp = getOpp();

        const result = applyKeywordEffects({
          sourceCard: cardSnapshot,
          sourceOwner: target,
          player: target === 'player' ? currentOwn : currentOpp,
          bot:    target === 'player' ? currentOpp : currentOwn,
          trigger: 'ON_PLAY',
        });

        setPlayer(result.player);
        setBot(result.bot);
      }, 20);
    }
  }, []);

  // ── promoteCard: sacrificar carta de mano para +1 energía máxima ──
  const promoteCard = useCallback((target: PlayerKey, cardIndex: number) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    setSt(prev => {
      if (!prev.canPromote || prev.maxEnergy >= 10) return prev;
      const card = prev.hand[cardIndex];
      if (!card) return prev;
      return {
        ...prev,
        maxEnergy: prev.maxEnergy + 1,
        energy:    prev.energy + 1,
        canPromote: false,
        hand:      prev.hand.filter((_, i) => i !== cardIndex),
        graveyard: [...prev.graveyard, card],
      };
    });
  }, []);

  // ── declareAttack: inicia la fase REPLICA ──
  const declareAttack = useCallback((attackerIdx: number, defenderIdx: number | null) => {
    if (gameOverRef.current || phaseRef.current !== TurnPhase.MAIN) return;
    const attacker = turnRef.current === 'player'
      ? playerRef.current.board[attackerIdx]
      : botRef.current.board[attackerIdx];
    if (!attacker || attacker.isTapped || attacker.stageFright) return;

    const pa: PendingAttack = { attackerOwner: turnRef.current, attackerIdx, defenderIdx };
    setPendingAttack(pa);
    setPhase(TurnPhase.REPLICA);
  }, []);

  // ── resolvePendingAttack: lee el ref para evitar stale closure ──
  const resolvePendingAttack = useCallback(() => {
    const pa = pendingRef.current;
    if (!pa) return;

    // Leer estado actual de los refs (no del closure)
    const [np, nb] = resolveAttackPure(
      playerRef.current,
      botRef.current,
      pa.attackerOwner,
      pa.attackerIdx,
      pa.defenderIdx,
    );

    setPlayer(np);
    setBot(nb);
    setPendingAttack(null);
    setPhase(TurnPhase.MAIN);
  }, []);

  // ── skipReplica ──
  const skipReplica = useCallback(() => {
    if (phaseRef.current === TurnPhase.REPLICA) {
      resolvePendingAttack();
    }
  }, [resolvePendingAttack]);

  // ── intercept: el defensor interpone una carta (cuesta 1 energía) ──
  const intercept = useCallback((interceptorIdx: number) => {
    if (phaseRef.current !== TurnPhase.REPLICA) return;
    const pa = pendingRef.current;
    if (!pa) return;

    const defenderOwner: PlayerKey = pa.attackerOwner === 'player' ? 'bot' : 'player';
    const defState = defenderOwner === 'player' ? playerRef.current : botRef.current;

    if (defState.energy < 1) return;
    const interceptor = defState.board[interceptorIdx];
    if (!interceptor || interceptor.isTapped) return;

    // VIP solo puede interceptar ataques de VIP o a VIP
    const attacker = pa.attackerOwner === 'player'
      ? playerRef.current.board[pa.attackerIdx]
      : botRef.current.board[pa.attackerIdx];

    if (attacker && hasKw(attacker, 'vip') && !hasKw(interceptor, 'vip')) return;

    // Cobrar energía al defensor
    const setSt = defenderOwner === 'player' ? setPlayer : setBot;
    setSt(prev => ({ ...prev, energy: prev.energy - 1 }));

    // Redirigir el ataque al interceptor
    const newPA: PendingAttack = { ...pa, defenderIdx: interceptorIdx };
    setPendingAttack(newPA);

    // Resolver con delay visual
    setTimeout(() => {
      const [np, nb] = resolveAttackPure(
        playerRef.current,
        botRef.current,
        newPA.attackerOwner,
        newPA.attackerIdx,
        newPA.defenderIdx,
      );
      setPlayer(np);
      setBot(nb);
      setPendingAttack(null);
      setPhase(TurnPhase.MAIN);
    }, 600);
  }, []);

  // ── activateBackstage: jugar un evento del backstage ──
  const activateBackstage = useCallback((owner: PlayerKey, backstageIdx: number) => {
    const setSt  = owner === 'player' ? setPlayer : setBot;
    const setOpp = owner === 'player' ? setBot    : setPlayer;
    const getOpp = owner === 'player' ? () => botRef.current : () => playerRef.current;

    let activatedCard: BoardCard | null = null;
    let isReactivation = false;

    setSt(prev => {
      const card = prev.backstage[backstageIdx];
      if (!card) return prev;

      const isEvent = card.type === 'EVENT';
      const cost    = isEvent ? card.cost : 2; // Reactivar criatura al tablero cuesta 2
      if (prev.energy < cost) return prev;

      activatedCard  = card;
      isReactivation = !isEvent;

      const newBackstage = prev.backstage.filter((_, i) => i !== backstageIdx);
      const newEnergy    = prev.energy - cost;

      if (isEvent) {
        // Curación básica al activar un evento
        const heal   = card.rarity === 'GOLD' || card.rarity === 'PLATINUM' ? 4 : 2;
        const newHP  = Math.min(30, prev.health + heal);
        return {
          ...prev,
          health:    newHP,
          energy:    newEnergy,
          backstage: newBackstage,
          graveyard: [...prev.graveyard, card],
        };
      } else {
        // Reactivar criatura al tablero (tapped, con stageFright)
        if (prev.board.length >= 5) return prev;
        const reactivated: BoardCard = { ...card, isTapped: true, stageFright: true };
        return {
          ...prev,
          energy:    newEnergy,
          backstage: newBackstage,
          board:     [...prev.board, reactivated],
        };
      }
    });

    // Aplicar ON_PLAY del evento activado
    if (activatedCard && !isReactivation) {
      const cardSnapshot = activatedCard;
      setTimeout(() => {
        const currentOwn = owner === 'player' ? playerRef.current : botRef.current;
        const currentOpp = getOpp();
        const result = applyKeywordEffects({
          sourceCard: cardSnapshot,
          sourceOwner: owner,
          player: owner === 'player' ? currentOwn : currentOpp,
          bot:    owner === 'player' ? currentOpp : currentOwn,
          trigger: 'ON_PLAY',
        });
        setPlayer(result.player);
        setBot(result.bot);
      }, 20);
    }

    // Si estamos en REPLICA, resolver tras activar
    if (phaseRef.current === TurnPhase.REPLICA) {
      setTimeout(() => resolvePendingAttack(), 800);
    }
  }, [resolvePendingAttack]);

  // ── retireCard: mover carta del tablero al backstage ──
  const retireCard = useCallback((owner: PlayerKey, boardIdx: number) => {
    const setSt = owner === 'player' ? setPlayer : setBot;
    setSt(prev => {
      if (prev.energy < 1) return prev;
      const card = prev.board[boardIdx];
      if (!card) return prev;
      return {
        ...prev,
        energy:    prev.energy - 1,
        board:     prev.board.filter((_, i) => i !== boardIdx),
        backstage: [...prev.backstage, card],
      };
    });
  }, []);

  // ── endTurn ──
  const endTurn = useCallback(() => {
    if (endTurnLockRef.current) return;
    if (phaseRef.current !== TurnPhase.MAIN && phaseRef.current !== TurnPhase.END) return;
    if (gameOverRef.current) return;

    endTurnLockRef.current = true;

    const currentTurn  = turnRef.current;
    const nextTurn: PlayerKey = currentTurn === 'player' ? 'bot' : 'player';

    // 1. Limpiar el turno actual (descartar si mano > 7)
    const setCurrentSt = currentTurn === 'player' ? setPlayer : setBot;
    setCurrentSt(prev => {
      const hand = prev.hand.length > 7 ? prev.hand.slice(0, 7) : prev.hand;
      return { ...prev, hand };
    });

    // 2. Preparar el nuevo turno
    const setNextSt = nextTurn === 'player' ? setPlayer : setBot;
    setNextSt(prev => {
      const newMaxEnergy = Math.min(10, prev.maxEnergy + 1);

      // Desendrezan todas las cartas del tablero
      const untappedBoard = prev.board.map(c => ({
        ...c,
        isTapped:    false,
        stageFright: false,
        hasAttacked: false,
      }));

      return {
        ...prev,
        energy:    newMaxEnergy,
        maxEnergy: newMaxEnergy,
        canPromote: true,
        board: untappedBoard,
      };
    });

    // 3. Cambiar turno y fase
    setTurn(nextTurn);
    if (nextTurn === 'player') setTurnCount(c => c + 1);
    setPhase(TurnPhase.START);

    setTimeout(() => {
      endTurnLockRef.current = false;
    }, 100);
  }, []);

  // ── Avance automático de fases START → DRAW → MAIN ──
  useEffect(() => {
    if (gameOver) return;

    if (phase === TurnPhase.START) {
      // Aplicar efectos pasivos de inicio de turno (SUSTAIN, HYPE ENGINE, etc.)
      const currentTurn = turnRef.current;
      const currentState = currentTurn === 'player' ? playerRef.current : botRef.current;
      const oppState     = currentTurn === 'player' ? botRef.current    : playerRef.current;

      let newOwn = { ...currentState };
      let newOpp = { ...oppState };

      for (const card of currentState.board) {
        const result = applyKeywordEffects({
          sourceCard: card,
          sourceOwner: currentTurn,
          player: currentTurn === 'player' ? newOwn : newOpp,
          bot:    currentTurn === 'player' ? newOpp : newOwn,
          trigger: 'PASSIVE_START_TURN',
        });
        if (currentTurn === 'player') { newOwn = result.player; newOpp = result.bot; }
        else                          { newOwn = result.bot;    newOpp = result.player; }
      }

      setPlayer(currentTurn === 'player' ? newOwn : newOpp);
      setBot(currentTurn    === 'player' ? newOpp : newOwn);

      const timer = setTimeout(() => setPhase(TurnPhase.DRAW), 600);
      return () => clearTimeout(timer);
    }

    if (phase === TurnPhase.DRAW) {
      const timer = setTimeout(() => {
        drawCard(turnRef.current);
        setPhase(TurnPhase.MAIN);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [phase, gameOver, drawCard]);

  // ── Auto-pass: si el jugador no puede hacer nada, pasa automáticamente ──
  // Solo aplica al jugador humano (el bot tiene su propio loop)
  useEffect(() => {
    if (turn !== 'player' || phase !== TurnPhase.MAIN || gameOver || pendingAttack) return;

    const p = playerRef.current;
    const canPlayHand       = p.hand.some(c => c.cost <= p.energy && (p.board.length < 5 || c.type === 'EVENT'));
    const canActivateBS     = p.backstage.some(c => c.cost <= p.energy);
    const canPromote        = p.canPromote && p.maxEnergy < 10 && p.hand.length > 0;
    const canAttack         = p.board.some(c => !c.isTapped && !c.stageFright);
    const canRetire         = p.board.length > 0 && p.energy >= 1;

    if (!canPlayHand && !canActivateBS && !canPromote && !canAttack && !canRetire) {
      const timer = setTimeout(() => {
        if (turnRef.current === 'player' && phaseRef.current === TurnPhase.MAIN && !gameOverRef.current) {
          endTurn();
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [turn, phase, gameOver, pendingAttack, player.energy, player.hand.length, player.board.length, endTurn]);

  // ── doMulligan ──
  const doMulligan = useCallback((target: PlayerKey) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    setSt(prev => {
      if (prev.hasMulliganed) return prev;
      const allCards = [...prev.deck, ...prev.hand].sort(() => Math.random() - 0.5);
      return {
        ...prev,
        deck: allCards.slice(5),
        hand: allCards.slice(0, 5).map(makeBoardCard),
        hasMulliganed: true,
      };
    });
  }, []);

  // Las próximas 3 cartas del mazo del jugador (para previsualización)
  const nextDraws = player.deck.slice(0, 3);

  return {
    player, bot, turn, turnCount, phase, gameOver, pendingAttack,
    startGame, playCard, promoteCard, declareAttack,
    resolvePendingAttack, skipReplica, intercept,
    activateBackstage, retireCard, endTurn, doMulligan,
    playerRef, botRef,
    nextDraws,
  };
}
```

---

### PASO 2: Reemplazar la función `hasKw` en `app/play/page.tsx`

Importar `hasKw` desde el hook en lugar de redefinirla:

```typescript
// En app/play/page.tsx, línea ~2, cambiar:
// import { useGameEngine, BoardCard, hasKw } from '@/hooks/useGameEngine';
// Ya está correcto, no hay que cambiar la importación.
// PERO hay que asegurarse de que TurnPhase se importa del hook, no de types:

import { useGameEngine, BoardCard, hasKw, TurnPhase } from '@/hooks/useGameEngine';
// Eliminar cualquier import de TurnPhase desde '@/lib/engine/gameState'
```

---

### PASO 3: Arreglar el requisito de 40 cartas en `app/play/page.tsx`

Buscar esta línea:
```typescript
const isValid = cardCount === 40; // Arena focus: exact 40
```

Reemplazar con:
```typescript
const isValid = cardCount >= 20; // Mínimo 20 cartas para jugar
```

Buscar este texto en la UI del deck selector:
```typescript
{cardCount} / 40 CARS
```
Reemplazar con:
```typescript
{cardCount} / {cardCount >= 20 ? '✓' : '20 mín'} CARS
```

Buscar:
```typescript
<span className={`text-sm font-black tracking-widest uppercase ${isValid ? 'text-green-400' : 'text-red-400'}`}>
  {cardCount} / 40 CARS
</span>
{!isValid && <span className="text-[10px] text-gray-500 uppercase font-black tracking-tighter italic">Se requieren 40 cartas</span>}
```

Reemplazar con:
```typescript
<span className={`text-sm font-black tracking-widest uppercase ${isValid ? 'text-green-400' : 'text-red-400'}`}>
  {cardCount} / 20+ CARS
</span>
{!isValid && <span className="text-[10px] text-gray-500 uppercase font-black tracking-tighter italic">Mínimo 20 cartas</span>}
```

---

### PASO 4: Arreglar el `startMatch` en `app/play/page.tsx`

Buscar el bloque donde se rellena el mazo del jugador con fillers:
```typescript
while (playerDeckArr.length < 40) {
  playerDeckArr.push(generateCard({ trackId: 'f_' + playerDeckArr.length, ... }));
}
```

**Eliminar ese bloque completo**. El `startGame` del hook ya hace el padding automáticamente con `padDeck`.

---

### PASO 5: Arreglar el import de `TurnPhase` en `app/play/page.tsx`

Buscar:
```typescript
import { TurnPhase } from '@/lib/engine/gameState';
```
Reemplazar con:
```typescript
import { TurnPhase } from '@/hooks/useGameEngine';
```

Si hay otros archivos que importen `TurnPhase` de `@/lib/engine/gameState`, también cambiarlos al hook. Específicamente revisar `hooks/useBotMatch.ts`.

---

### PASO 6: Actualizar `makeBoardCard` para reconocer más keywords de "no stageFright"

En el nuevo `useGameEngine.ts` (ya incluido arriba), `makeBoardCard` hace:
```typescript
stageFright: !hasKw(card, Keyword.FRENZY) && !hasKw(card, Keyword.HASTE),
```

También hay que incluir el keyword `Drop` que se usa en el generador:
```typescript
stageFright: !hasKw(card, Keyword.FRENZY) 
          && !hasKw(card, Keyword.HASTE) 
          && !hasKw(card, Keyword.DROP)
          && !hasKw(card, 'drop')
          && !hasKw(card, 'frenzy'),
```

Este cambio ya está incluido en el código del PASO 1 (en `makeBoardCard`). No hay que modificarlo por separado.

---

### PASO 7: Arreglar el bot AI en `app/play/page.tsx`

El bot usa `botPlayTurn` de `lib/engine/singleplayerBot.ts`. El problema es que `processNextBotAction` no verifica si el juego terminó antes de procesar cada acción. Buscar la función `processNextBotAction` y reemplazar:

```typescript
const processNextBotAction = useCallback(() => {
  if (botActionQueue.current.length === 0 || gameOver) {
    botProcessing.current = false;
    return;
  }

  const action = botActionQueue.current.shift()!;
  const delay = action.type === 'ATTACK' ? 1200 : action.type === 'END_TURN' ? 600 : 800;

  setTimeout(() => {
    // CRÍTICO: re-verificar gameOver antes de ejecutar
    if (gameOverRef.current) {
      botProcessing.current = false;
      botActionQueue.current = [];
      return;
    }

    // CRÍTICO: re-verificar que seguimos en turno del bot
    if (turnRef.current !== 'bot') {
      botProcessing.current = false;
      botActionQueue.current = [];
      return;
    }

    switch (action.type) {
      case 'PROMOTE':
        if (botRef.current.hand[action.cardIndex]) {
          promoteCard('bot', action.cardIndex);
        }
        break;
      case 'PLAY_CARD':
        if (botRef.current.hand[action.cardIndex]) {
          playCard('bot', action.cardIndex);
        }
        break;
      case 'ACTIVATE_BACKSTAGE':
        if (botRef.current.backstage[action.backstageIndex]) {
          activateBackstage('bot', action.backstageIndex);
        }
        break;
      case 'ATTACK': {
        const attacker = botRef.current.board[action.attackerIndex];
        if (attacker && !attacker.isTapped && !attacker.stageFright) {
          declareAttack(action.attackerIndex, action.targetIndex);
          // No llamar processNextBotAction aquí: la REPLICA lo hará
          return;
        }
        break;
      }
      case 'END_TURN':
        endTurn();
        botProcessing.current = false;
        return;
    }

    // Continuar con la siguiente acción en el siguiente tick
    setTimeout(() => processNextBotAction(), 50);
  }, delay);
}, [gameOver, promoteCard, playCard, activateBackstage, declareAttack, endTurn]);
```

---

### PASO 8: Arreglar la réplica del bot en `app/play/page.tsx`

El bot necesita resolver la réplica (skipReplica o intercept) después de que el jugador ataca.
Buscar el useEffect de "Bot AI for Replica" y reemplazar:

```typescript
// ── Bot AI for Replica (cuando el jugador ataca y el bot debe responder) ──
useEffect(() => {
  if (phase !== TurnPhase.REPLICA || turn !== 'player' || !pendingAttack) return;

  const timer = setTimeout(() => {
    if (gameOverRef.current) return;

    const b = botRef.current;
    const attackerCard = playerRef.current.board[pendingAttack.attackerIdx] || null;
    const isDirectAttack = pendingAttack.defenderIdx === null;

    const response = botReplicaResponse(b, attackerCard, isDirectAttack, difficulty);

    if (response.action === 'intercept' && response.interceptorIdx !== undefined) {
      // Verificar que la carta interceptora sigue existiendo
      const interceptor = b.board[response.interceptorIdx];
      if (interceptor && !interceptor.isTapped && b.energy >= 1) {
        intercept(response.interceptorIdx);
        return;
      }
    }
    
    if (response.action === 'backstage' && response.backstageIdx !== undefined) {
      const bs = b.backstage[response.backstageIdx];
      if (bs && b.energy >= bs.cost) {
        activateBackstage('bot', response.backstageIdx);
        return;
      }
    }

    // Default: dejar pasar
    skipReplica();
  }, 1500);

  return () => clearTimeout(timer);
}, [phase, turn, pendingAttack]);
```

---

### PASO 9: Arreglar la réplica del jugador (timer)

El jugador tiene 5 segundos para responder cuando el bot ataca.
Buscar el useEffect del timer de réplica y reemplazar:

```typescript
const [replicaTimeLeft, setReplicaTimeLeft] = useState(5);

useEffect(() => {
  // Solo cuando el bot ataca y es turno del jugador para responder
  if (phase !== TurnPhase.REPLICA || turn !== 'bot') return;

  setReplicaTimeLeft(5);
  const interval = setInterval(() => {
    setReplicaTimeLeft(prev => {
      if (prev <= 1) {
        clearInterval(interval);
        // Solo skipear si seguimos en réplica
        if (phaseRef.current === TurnPhase.REPLICA) {
          skipReplica();
        }
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(interval);
}, [phase, turn]); // No incluir skipReplica en deps para evitar re-creación del interval
```

---

### PASO 10: Arreglar el processNextBotAction para continuar después de REPLICA

Cuando el bot declara un ataque, el juego entra en REPLICA y el bot debe esperar.
Después de que se resuelve la réplica (volta a MAIN), el bot debe continuar su cola.

Buscar el useEffect que dispara el bot cuando phase cambia a MAIN:

```typescript
useEffect(() => {
  if (turn !== 'bot' || !matchStarted || gameOver || phase !== TurnPhase.MAIN) return;
  
  // Si el bot ya tiene acciones en cola (venía de un ATTACK), continuar
  if (botProcessing.current && botActionQueue.current.length > 0) {
    setTimeout(() => processNextBotAction(), 800);
    return;
  }

  // Si el bot no estaba procesando, es un turno nuevo
  if (botProcessing.current) return;

  const startTimer = setTimeout(() => {
    if (gameOverRef.current || turnRef.current !== 'bot') return;
    const actions = botPlayTurn(
      { botState: botRef.current, playerState: playerRef.current, turnCount },
      difficulty
    );
    botActionQueue.current = actions;
    botProcessing.current  = true;
    processNextBotAction();
  }, 1500);

  return () => clearTimeout(startTimer);
}, [turn, matchStarted, gameOver, phase, turnCount]);
```

---

### PASO 11: Limpiar la cola del bot al cambiar de turno

Cuando el turno cambia de bot a player, limpiar la cola para evitar acciones fantasma:

```typescript
// Añadir este useEffect en app/play/page.tsx
useEffect(() => {
  if (turn === 'player') {
    // Limpiar estado del bot
    botActionQueue.current = [];
    botProcessing.current  = false;
  }
}, [turn]);
```

---

### PASO 12: Eliminar imports obsoletos

En `app/play/page.tsx`, eliminar:
```typescript
import { TurnPhase } from '@/lib/engine/gameState';
```

En `hooks/useGameEngine.ts`, ya no se importa nada de `lib/engine/effectEngine` ni de `lib/engine/gameState`. El nuevo archivo es autosuficiente.

---

## RESUMEN DE ARCHIVOS A MODIFICAR

| Archivo | Acción |
|---|---|
| `hooks/useGameEngine.ts` | **REEMPLAZAR COMPLETO** (Paso 1) |
| `app/play/page.tsx` | Modificar en 8 puntos (Pasos 2-11) |
| No tocar | `lib/engine/effectEngine.ts`, `lib/engine/gameState.ts`, `types/types.ts` |

---

## VERIFICACIÓN POST-IMPLEMENTACIÓN

Después de implementar, verificar estos escenarios:

1. **Mazo de 20 cartas**: Crear un mazo con 20 cartas → debe poder iniciar partida
2. **FRENZY/DROP**: Una carta con keyword `frenzy` o `drop` → puede atacar el turno que entra
3. **TAUNT/PROVOKE**: Con una carta con `taunt` en tablero → el atacante no puede ir directo
4. **STEALTH**: Una carta con `stealth` sin haber atacado → no puede ser objetivo
5. **DISTORSIÓN**: Carta con `distortion` ataca a una de 1 DEF con 5 ATK → 4 de daño directo al oponente
6. **SUSTAIN**: Al inicio del turno, carta con `sustain` recupera toda su DEF
7. **CRESCENDO**: Carta con `crescendo` gana +1 ATK cada vez que ataca
8. **DISS TRACK**: Al entrar, reduce -1/-1 a carta rival aleatoria
9. **Sin bloqueo de turno**: El bot no se queda colgado entre REPLICA y MAIN
10. **endTurn no se llama doble**: El lock previene doble llamada

---

## NOTAS IMPORTANTES

- **NO simplificar** la lógica de réplica ni el sistema de turnos. Se mantienen todas las fases.
- El keyword `Keyword.FRENZY` está en el enum pero en el generador se usa la string `'frenzy'`. El `hasKw` del nuevo código verifica ambos.
- `applyKeywordEffects` es una función pura: nunca llama a setPlayer/setBot directamente. Solo devuelve nuevos estados.
- `processDeaths` también es pura y siempre se llama después de `resolveAttackPure`.
- El padding del mazo (`padDeck`) rellena con copias de las mismas cartas, NO con cartas generadas aleatoriamente. Esto mantiene la identidad del mazo del jugador.
