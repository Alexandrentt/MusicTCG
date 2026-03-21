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
  START = 'START',
  DRAW = 'DRAW',
  MAIN = 'MAIN',
  REPLICA = 'REPLICA',
  END = 'END',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Verifica si una carta tiene un keyword activo (no silenciada).
 * Busca en abilities Y en el array keywords del CardData.
 */
export function hasKw(card: BoardCard | CardData, keyword: Keyword | string): boolean {
  if ((card as BoardCard).isSilenced) return false;
  const inAbilities = card.abilities?.some(a => a.keyword === keyword) ?? false;
  const inKeywords = card.keywords?.includes(keyword as Keyword) ?? false;
  return inAbilities || inKeywords;
}

function makeBoardCard(card: CardData): BoardCard {
  return {
    ...card,
    instanceId: `${card.id}_${++_instanceCounter}`,
    isTapped: false,
    stageFright: !hasKw(card, Keyword.FRENZY)
      && !hasKw(card, Keyword.HASTE)
      && !hasKw(card, Keyword.DROP)
      && !hasKw(card, 'drop')
      && !hasKw(card, 'frenzy'),
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

  const ownState = sourceOwner === 'player' ? player : bot;
  const oppState = sourceOwner === 'player' ? bot : player;
  let newOwn = { ...ownState };
  let newOpp = { ...oppState };

  for (const ability of sourceCard.abilities ?? []) {
    if (!ability.keyword) continue;
    const kw = ability.keyword as Keyword | string;

    // ── DISTORSIÓN (TRAMPLE): daño sobrante pasa al oponente ──
    // Se maneja en resolveAttackPure directamente, no aquí.

    // ── HYPE ENGINE: +1 Hype al inicio del turno ──
    const isHypeEngine = (kw === 'hypeEngine' || kw === Keyword.HYPE_ENGINE || (kw as string) === 'hype_engine');
    const isSustain = (kw === Keyword.SUSTAIN || (kw as string) === 'sustain');

    if (isHypeEngine || isSustain) {
      if (trigger === 'PASSIVE_START_TURN') {
        if (isHypeEngine) {
          newOwn = { ...newOwn, hype: newOwn.hype + 1 };
        }
        if (isSustain) {
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
          newOwn = {
            ...newOwn,
            board: newOwn.board.map(c =>
              c.instanceId === sourceCard.instanceId
                ? { ...c, currentAtk: c.currentAtk + 1, currentDef: c.currentDef + 1, maxDef: c.maxDef + 1 }
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
    newBot = result.bot;
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
    newBot = result.bot;
  }

  return {
    player: {
      ...newPlayer,
      board: newPlayer.board.filter(c => c.currentDef > 0),
      graveyard: [...newPlayer.graveyard, ...playerDead],
    },
    bot: {
      ...newBot,
      board: newBot.board.filter(c => c.currentDef > 0),
      graveyard: [...newBot.graveyard, ...botDead],
    },
  };
}

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

  // ── Verificar Taunt ──
  const activeTaunters = defState.board.filter(c => hasKw(c, 'taunt') || hasKw(c, Keyword.PROVOKE));

  const mustAttackTaunters = hasKw(attacker, Keyword.FLYING) || hasKw(attacker, 'vip')
    ? activeTaunters.filter(c => hasKw(c, Keyword.FLYING) || hasKw(c, 'vip'))
    : activeTaunters;

  if (mustAttackTaunters.length > 0) {
    if (defenderIdx === null) return [pState, bState];
    const target = defState.board[defenderIdx];
    if (!target) return [pState, bState];
    const targetHasTaunt = hasKw(target, 'taunt') || hasKw(target, Keyword.PROVOKE);
    if (!targetHasTaunt) return [pState, bState];
  }

  // ── Verificar Stealth ──
  if (defenderIdx !== null) {
    const defender = defState.board[defenderIdx];
    if (defender && (hasKw(defender, Keyword.STEALTH) || hasKw(defender, 'stealth') || hasKw(defender, 'acoustic')) && !defender.hasAttacked) {
      return [pState, bState];
    }
  }

  // ── VIP ──
  if (defenderIdx !== null) {
    const defender = defState.board[defenderIdx];
    if (defender) {
      const attackerIsVIP = hasKw(attacker, Keyword.FLYING) || hasKw(attacker, 'vip');
      const defenderIsVIP = hasKw(defender, Keyword.FLYING) || hasKw(defender, 'vip');
      const hasVIPTaunters = activeTaunters.some(c => hasKw(c, Keyword.FLYING) || hasKw(c, 'vip'));

      if (attackerIsVIP && !defenderIsVIP && hasVIPTaunters) {
        return [pState, bState];
      }
    }
  }

  let newAtk = { ...atkState };
  let newDef = { ...defState };

  newAtk = {
    ...newAtk,
    board: newAtk.board.map((c, i) =>
      i === attackerIdx
        ? { ...c, isTapped: true, hasAttacked: true }
        : c
    ),
  };

  const updatedAttacker = newAtk.board[attackerIdx];
  const crescendoResult = applyKeywordEffects({
    sourceCard: updatedAttacker,
    sourceOwner: attackerOwner,
    player: attackerOwner === 'player' ? newAtk : newDef,
    bot: attackerOwner === 'player' ? newDef : newAtk,
    trigger: 'ON_ATTACK',
  });
  if (attackerOwner === 'player') {
    newAtk = crescendoResult.player;
    newDef = crescendoResult.bot;
  } else {
    newAtk = crescendoResult.bot;
    newDef = crescendoResult.player;
  }

  const finalAttacker = newAtk.board[attackerIdx];
  const atkDmg = finalAttacker ? finalAttacker.currentAtk : attacker.currentAtk;

  if (defenderIdx === null) {
    newDef = { ...newDef, health: Math.max(0, newDef.health - atkDmg) };
  } else {
    const defender = newDef.board[defenderIdx];
    if (!defender) {
      newDef = { ...newDef, health: Math.max(0, newDef.health - atkDmg) };
    } else {
      const isAmbush = defender.isTapped;
      const defDmg = isAmbush ? 0 : defender.currentAtk;
      const defDestroyed = atkDmg >= defender.currentDef;
      const atkDestroyed = !isAmbush && defDmg >= finalAttacker!.currentDef;

      const hasDistortion = hasKw(finalAttacker || attacker, Keyword.TRAMPLE) ||
        hasKw(finalAttacker || attacker, 'distortion');
      const excessOnDef = hasDistortion && defDestroyed
        ? Math.max(0, atkDmg - defender.currentDef)
        : 0;

      const hasDefDistortion = hasKw(defender, Keyword.TRAMPLE) || hasKw(defender, 'distortion');
      const excessOnAtk = !isAmbush && hasDefDistortion && atkDestroyed
        ? Math.max(0, defDmg - (finalAttacker?.currentDef ?? attacker.currentDef))
        : 0;

      newDef = {
        ...newDef,
        health: Math.max(0, newDef.health - excessOnDef),
        board: newDef.board.map((c, i) =>
          i === defenderIdx
            ? { ...c, currentDef: c.currentDef - atkDmg }
            : c
        ),
      };

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

  const playerAfterAtk = attackerOwner === 'player' ? newAtk : newDef;
  const botAfterAtk = attackerOwner === 'player' ? newDef : newAtk;
  const afterDeaths = processDeaths(playerAfterAtk, botAfterAtk);

  return [afterDeaths.player, afterDeaths.bot];
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useGameEngine() {
  const [player, setPlayer] = useState<PlayerState>(makeInitialPlayer);
  const [bot, setBot] = useState<PlayerState>(makeInitialPlayer);
  const [turn, setTurn] = useState<PlayerKey>('player');
  const [turnCount, setTurnCount] = useState(1);
  const [phase, setPhase] = useState<TurnPhase>(TurnPhase.MAIN);
  const [gameOver, setGameOver] = useState<GameOverResult>(null);
  const [pendingAttack, setPendingAttack] = useState<PendingAttack | null>(null);

  const playerRef = useRef(player);
  const botRef = useRef(bot);
  const turnRef = useRef(turn);
  const phaseRef = useRef(phase);
  const gameOverRef = useRef(gameOver);
  const pendingRef = useRef(pendingAttack);
  const endTurnLockRef = useRef(false);

  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { botRef.current = bot; }, [bot]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { pendingRef.current = pendingAttack; }, [pendingAttack]);

  useEffect(() => {
    if (gameOver) return;
    if (player.health <= 0 && bot.health <= 0) { setGameOver('draw'); return; }
    if (player.health <= 0) { setGameOver('bot'); return; }
    if (bot.health <= 0) { setGameOver('player'); return; }
    if (player.hype >= 20) { setGameOver('player'); return; }
    if (bot.hype >= 20) { setGameOver('bot'); return; }
  }, [player.health, player.hype, bot.health, bot.hype, gameOver]);

  const startGame = useCallback((playerDeck: CardData[], botDeck: CardData[]) => {
    _instanceCounter = 0;
    endTurnLockRef.current = false;
    const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
    const padDeck = (deck: CardData[], minSize = 20): CardData[] => {
      const shuffled = shuffle(deck);
      while (shuffled.length < minSize) {
        shuffled.push(...shuffle(deck).slice(0, minSize - shuffled.length));
      }
      return shuffled;
    };
    const sp = padDeck(playerDeck);
    const sb = padDeck(botDeck);

    setPlayer({ ...makeInitialPlayer(), deck: sp.slice(5), hand: sp.slice(0, 5).map(makeBoardCard) });
    setBot({ ...makeInitialPlayer(), deck: sb.slice(5), hand: sb.slice(0, 5).map(makeBoardCard) });
    setTurn('player');
    setTurnCount(1);
    setPhase(TurnPhase.MAIN);
    setGameOver(null);
    setPendingAttack(null);
  }, []);

  const drawCard = useCallback((target: PlayerKey) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    let milled = false;
    setSt(prev => {
      if (prev.deck.length === 0) { milled = true; return prev; }
      const [drawn, ...rest] = prev.deck;
      return { ...prev, deck: rest, hand: [...prev.hand, makeBoardCard(drawn)] };
    });
    if (milled) setTimeout(() => setGameOver(target === 'player' ? 'bot' : 'player'), 50);
  }, []);

  const playCard = useCallback((target: PlayerKey, cardIndex: number) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    const getOpp = target === 'player' ? () => botRef.current : () => playerRef.current;
    let playedCard: BoardCard | null = null;

    setSt(prev => {
      const card = prev.hand[cardIndex];
      if (!card) return prev;
      if (prev.board.length >= 5 && card.type !== 'EVENT') return prev;
      if (prev.energy < card.cost) return prev;
      playedCard = card;
      const newHand = prev.hand.filter((_, i) => i !== cardIndex);
      const newEnergy = prev.energy - card.cost;
      if (card.type === 'EVENT') {
        return { ...prev, energy: newEnergy, hand: newHand, backstage: [...prev.backstage, card] };
      }
      return { ...prev, energy: newEnergy, hand: newHand, board: [...prev.board, card] };
    });

    if (playedCard) {
      const cardSnapshot = playedCard;
      setTimeout(() => {
        const currentOwn = target === 'player' ? playerRef.current : botRef.current;
        const currentOpp = getOpp();
        const result = applyKeywordEffects({
          sourceCard: cardSnapshot, sourceOwner: target,
          player: target === 'player' ? currentOwn : currentOpp,
          bot: target === 'player' ? currentOpp : currentOwn,
          trigger: 'ON_PLAY',
        });
        setPlayer(result.player);
        setBot(result.bot);
      }, 20);
    }
  }, []);

  const promoteCard = useCallback((target: PlayerKey, cardIndex: number) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    setSt(prev => {
      if (!prev.canPromote || prev.maxEnergy >= 10) return prev;
      const card = prev.hand[cardIndex];
      if (!card) return prev;
      return {
        ...prev, maxEnergy: prev.maxEnergy + 1, energy: prev.energy + 1, canPromote: false,
        hand: prev.hand.filter((_, i) => i !== cardIndex), graveyard: [...prev.graveyard, card],
      };
    });
  }, []);

  const declareAttack = useCallback((attackerIdx: number, defenderIdx: number | null) => {
    if (gameOverRef.current || phaseRef.current !== TurnPhase.MAIN) return;
    const attacker = turnRef.current === 'player' ? playerRef.current.board[attackerIdx] : botRef.current.board[attackerIdx];
    if (!attacker || attacker.isTapped || attacker.stageFright) return;
    setPendingAttack({ attackerOwner: turnRef.current, attackerIdx, defenderIdx });
    setPhase(TurnPhase.REPLICA);
  }, []);

  const resolvePendingAttack = useCallback(() => {
    const pa = pendingRef.current;
    if (!pa) return;
    const [np, nb] = resolveAttackPure(playerRef.current, botRef.current, pa.attackerOwner, pa.attackerIdx, pa.defenderIdx);
    setPlayer(np);
    setBot(nb);
    setPendingAttack(null);
    setPhase(TurnPhase.MAIN);
  }, []);

  const skipReplica = useCallback(() => {
    if (phaseRef.current === TurnPhase.REPLICA) resolvePendingAttack();
  }, [resolvePendingAttack]);

  const intercept = useCallback((interceptorIdx: number) => {
    if (phaseRef.current !== TurnPhase.REPLICA) return;
    const pa = pendingRef.current;
    if (!pa) return;
    const defenderOwner: PlayerKey = pa.attackerOwner === 'player' ? 'bot' : 'player';
    const defState = defenderOwner === 'player' ? playerRef.current : botRef.current;
    if (defState.energy < 1) return;
    const interceptor = defState.board[interceptorIdx];
    if (!interceptor || interceptor.isTapped) return;
    const attacker = pa.attackerOwner === 'player' ? playerRef.current.board[pa.attackerIdx] : botRef.current.board[pa.attackerIdx];
    if (attacker && hasKw(attacker, 'vip') && !hasKw(interceptor, 'vip')) return;

    const setSt = defenderOwner === 'player' ? setPlayer : setBot;
    setSt(prev => ({ ...prev, energy: prev.energy - 1 }));
    const newPA: PendingAttack = { ...pa, defenderIdx: interceptorIdx };
    setPendingAttack(newPA);
    setTimeout(() => {
      const [np, nb] = resolveAttackPure(playerRef.current, botRef.current, newPA.attackerOwner, newPA.attackerIdx, newPA.defenderIdx);
      setPlayer(np); setBot(nb); setPendingAttack(null); setPhase(TurnPhase.MAIN);
    }, 600);
  }, []);

  const activateBackstage = useCallback((owner: PlayerKey, backstageIdx: number) => {
    const setSt = owner === 'player' ? setPlayer : setBot;
    const getOpp = owner === 'player' ? () => botRef.current : () => playerRef.current;
    let activatedCard: BoardCard | null = null;
    let isReactivation = false;

    setSt(prev => {
      const card = prev.backstage[backstageIdx];
      if (!card) return prev;
      const isEvent = card.type === 'EVENT';
      const cost = isEvent ? card.cost : 2;
      if (prev.energy < cost) return prev;
      activatedCard = card;
      isReactivation = !isEvent;
      const newBackstage = prev.backstage.filter((_, i) => i !== backstageIdx);
      const newEnergy = prev.energy - cost;
      if (isEvent) {
        const heal = card.rarity === 'GOLD' || card.rarity === 'PLATINUM' ? 4 : 2;
        return { ...prev, health: Math.min(30, prev.health + heal), energy: newEnergy, backstage: newBackstage, graveyard: [...prev.graveyard, card] };
      } else {
        if (prev.board.length >= 5) return prev;
        return { ...prev, energy: newEnergy, backstage: newBackstage, board: [...prev.board, { ...card, isTapped: true, stageFright: true }] };
      }
    });

    if (activatedCard && !isReactivation) {
      const cardSnapshot = activatedCard;
      setTimeout(() => {
        const currentOwn = owner === 'player' ? playerRef.current : botRef.current;
        const currentOpp = getOpp();
        const result = applyKeywordEffects({
          sourceCard: cardSnapshot, sourceOwner: owner,
          player: owner === 'player' ? currentOwn : currentOpp,
          bot: owner === 'player' ? currentOpp : currentOwn,
          trigger: 'ON_PLAY',
        });
        setPlayer(result.player);
        setBot(result.bot);
      }, 20);
    }
    if (phaseRef.current === TurnPhase.REPLICA) setTimeout(() => resolvePendingAttack(), 800);
  }, [resolvePendingAttack]);

  const retireCard = useCallback((owner: PlayerKey, boardIdx: number) => {
    const setSt = owner === 'player' ? setPlayer : setBot;
    setSt(prev => {
      if (prev.energy < 1) return prev;
      const card = prev.board[boardIdx];
      if (!card) return prev;
      return { ...prev, energy: prev.energy - 1, board: prev.board.filter((_, i) => i !== boardIdx), backstage: [...prev.backstage, card] };
    });
  }, []);

  const endTurn = useCallback(() => {
    if (endTurnLockRef.current) return;
    if (phaseRef.current !== TurnPhase.MAIN && phaseRef.current !== TurnPhase.END) return;
    if (gameOverRef.current) return;
    endTurnLockRef.current = true;
    const currentTurn = turnRef.current;
    const nextTurn: PlayerKey = currentTurn === 'player' ? 'bot' : 'player';

    const setCurrentSt = currentTurn === 'player' ? setPlayer : setBot;
    setCurrentSt(prev => ({ ...prev, hand: prev.hand.length > 7 ? prev.hand.slice(0, 7) : prev.hand }));

    const setNextSt = nextTurn === 'player' ? setPlayer : setBot;
    setNextSt(prev => {
      const newMaxEnergy = Math.min(10, prev.maxEnergy + 1);
      return {
        ...prev, energy: newMaxEnergy, maxEnergy: newMaxEnergy, canPromote: true,
        board: prev.board.map(c => ({ ...c, isTapped: false, stageFright: false, hasAttacked: false })),
      };
    });

    setTurn(nextTurn);
    if (nextTurn === 'player') setTurnCount(c => c + 1);
    setPhase(TurnPhase.START);
    setTimeout(() => { endTurnLockRef.current = false; }, 100);
  }, []);

  useEffect(() => {
    if (gameOver) return;
    if (phase === TurnPhase.START) {
      const currentTurn = turnRef.current;
      const currentState = currentTurn === 'player' ? playerRef.current : botRef.current;
      const oppState = currentTurn === 'player' ? botRef.current : playerRef.current;
      let newOwn = { ...currentState };
      let newOpp = { ...oppState };
      for (const card of currentState.board) {
        const result = applyKeywordEffects({
          sourceCard: card, sourceOwner: currentTurn,
          player: currentTurn === 'player' ? newOwn : newOpp,
          bot: currentTurn === 'player' ? newOpp : newOwn,
          trigger: 'PASSIVE_START_TURN',
        });
        if (currentTurn === 'player') { newOwn = result.player; newOpp = result.bot; }
        else { newOwn = result.bot; newOpp = result.player; }
      }
      setPlayer(currentTurn === 'player' ? newOwn : newOpp);
      setBot(currentTurn === 'player' ? newOpp : newOwn);
      const timer = setTimeout(() => setPhase(TurnPhase.DRAW), 600);
      return () => clearTimeout(timer);
    }
    if (phase === TurnPhase.DRAW) {
      const timer = setTimeout(() => { drawCard(turnRef.current); setPhase(TurnPhase.MAIN); }, 400);
      return () => clearTimeout(timer);
    }
  }, [phase, gameOver, drawCard]);

  useEffect(() => {
    if (turn !== 'player' || phase !== TurnPhase.MAIN || gameOver || pendingAttack) return;
    const p = playerRef.current;
    const canPlayHand = p.hand.some(c => c.cost <= p.energy && (p.board.length < 5 || c.type === 'EVENT'));
    const canActivateBS = p.backstage.some(c => (c.type === 'EVENT' ? c.cost : 2) <= p.energy);
    const canPromote = p.canPromote && p.maxEnergy < 10 && p.hand.length > 0;
    const canAttack = p.board.some(c => !c.isTapped && !c.stageFright);
    const canRetire = p.board.length > 0 && p.energy >= 1;

    if (!canPlayHand && !canActivateBS && !canPromote && !canAttack && !canRetire) {
      const timer = setTimeout(() => {
        if (turnRef.current === 'player' && phaseRef.current === TurnPhase.MAIN && !gameOverRef.current) endTurn();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [turn, phase, gameOver, pendingAttack, player.energy, player.hand.length, player.board.length, endTurn]);

  const doMulligan = useCallback((target: PlayerKey) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    setSt(prev => {
      if (prev.hasMulliganed) return prev;
      const allCards = [...prev.deck, ...prev.hand].sort(() => Math.random() - 0.5);
      return {
        ...prev, deck: allCards.slice(5), hand: allCards.slice(0, 5).map(makeBoardCard), hasMulliganed: true,
      };
    });
  }, []);

  const nextDraws = player.deck.slice(0, 3);

  return {
    player, bot, turn, turnCount, phase, gameOver, pendingAttack,
    startGame, playCard, promoteCard, declareAttack,
    resolvePendingAttack, skipReplica, intercept,
    activateBackstage, retireCard, endTurn, doMulligan,
    playerRef, botRef, turnRef, phaseRef, gameOverRef, pendingRef, nextDraws,
  };
}
