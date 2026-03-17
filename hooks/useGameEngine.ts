import { useState, useCallback, useEffect, useRef } from 'react';
import { CardData } from '@/lib/engine/generator';

import {
  EngineAbilities,
  pushEffectToStack,
  resolveStack,
  triggerMap
} from '@/lib/engine/effectEngine';
import { TurnPhase } from '@/lib/engine/gameState';

let _instanceCounter = 0;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BoardCard extends CardData {
  instanceId: string;
  isTapped: boolean;
  stageFright: boolean;   // Can't attack turn played (unless Frenzy)
  hasAttacked: boolean;   // For Stealth/Acústico
  currentAtk: number;     // Can be modified by effects
  currentDef: number;
  maxDef: number;         // Stores original def for Sustain
  isSilenced: boolean;
  statuses: string[];
}

export type PlayerKey = 'player' | 'bot';
export type GameOverResult = 'player' | 'bot' | 'draw' | null;

export interface PlayerState {
  hp: number;            // Reputación (starts at 30)
  hype: number;          // Acumula — win at 20
  energy: number;        // Current energy available (Mana Float: carries to opponent's turn for reactions)
  maxEnergy: number;     // Max energy this turn (increases by 1 each turn, capped at 10)
  canPromote: boolean;   // Can sacrifice 1 card per turn for max energy
  hasMulliganed: boolean;
  deck: CardData[];
  hand: CardData[];
  board: BoardCard[];
  backstage: BoardCard[];
  graveyard: CardData[];
}

export interface PendingAttack {
  attackerOwner: PlayerKey;
  attackerIdx: number;
  defenderIdx: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function hasKw(card: CardData, keyword: string): boolean {
  return card.abilities?.some(a => a.keyword === keyword) ?? false;
}

function makeBoardCard(card: CardData): BoardCard {
  return {
    ...card,
    instanceId: `${card.id}_${++_instanceCounter}`,
    isTapped: false,
    stageFright: !hasKw(card, 'frenzy'),
    hasAttacked: false,
    currentAtk: card.stats.atk,
    currentDef: card.stats.def,
    maxDef: card.stats.def,
    isSilenced: false,
    statuses: [],
  };
}

const makeInitial = (): PlayerState => ({
  hp: 30, hype: 0, energy: 1, maxEnergy: 1, canPromote: true, hasMulliganed: false,
  deck: [], hand: [], board: [], backstage: [], graveyard: [],
});

// ─── Core combat resolution (pure function, no state mutations) ─────────────

/**
 * Resolves an attack and returns updated [playerState, botState].
 * Handles: Clash (vs untapped), Ambush (vs tapped), Direct attack,
 * Distorsión (trample excess damage), Muro de Sonido (taunt) enforcement.
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
  if (!attacker || attacker.isTapped || attacker.stageFright) return [pState, bState];

  // ── Muro de Sonido / Taunt enforcement ──
  const activeTaunters = defState.board.filter(c => hasKw(c, 'taunt') && !c.isTapped);
  const mustAttackTaunters = hasKw(attacker, 'vip')
    ? activeTaunters.filter(c => hasKw(c, 'vip'))
    : activeTaunters;

  if (mustAttackTaunters.length > 0) {
    // If there are taunters we MUST hit, check if current target is one of them
    if (defenderIdx === null) return [pState, bState];
    const target = defState.board[defenderIdx];
    if (!target || !hasKw(target, 'taunt')) return [pState, bState];
    // If I'm VIP and there's a VIP taunter, I can't hit a non-VIP taunter
    if (hasKw(attacker, 'vip') && !hasKw(target, 'vip') && activeTaunters.some(c => hasKw(c, 'vip'))) {
      return [pState, bState];
    }
  }

  // ── Acústico / Stealth enforcement ──
  if (defenderIdx !== null) {
    const defender = defState.board[defenderIdx];
    if (defender && hasKw(defender, 'stealth') && !defender.hasAttacked) {
      // Cannot target stealth cards that haven't attacked yet
      return [pState, bState];
    }
  }

  // ── VIP / Flying enforcement ──
  if (defenderIdx !== null) {
    const defender = defState.board[defenderIdx];
    if (defender && hasKw(attacker, 'vip') && !hasKw(defender, 'vip')) {
      // VIP can only be blocked by other VIPs? 
      // Actually, in TCGs usually it's "cannot be blocked EXCEPT by VIP".
      // But here the attacker chooses the target. 
      // So if the attacker is VIP, it can bypass taunt? 
      // Let's say VIP can attack directly even if there are taunters, UNLESS taunter is also VIP.
      const activeVipTaunters = defState.board.filter(c => hasKw(c, 'taunt') && !c.isTapped && hasKw(c, 'vip'));
      if (activeVipTaunters.length > 0) {
        // Must attack VIP taunter
        if (!hasKw(defender, 'taunt') || !hasKw(defender, 'vip')) return [pState, bState];
      }
    }
  }

  let newAtk: PlayerState = { ...atkState };
  let newDef: PlayerState = { ...defState };

  // ── Direct attack to Reputation ──
  if (defenderIdx === null) {
    const dmg = attacker.currentAtk;
    newDef = { ...newDef, hp: newDef.hp - dmg };
    newAtk = {
      ...newAtk,
      board: newAtk.board.map((c, i) =>
        i === attackerIdx ? { ...c, isTapped: true, hasAttacked: true } : c
      ),
    };
  } else {
    // ── Creature combat ──
    const defender = defState.board[defenderIdx];
    if (!defender) return [pState, bState];

    const isAmbush = defender.isTapped; // Ambush: defender doesn't retaliate
    const atkDmg = attacker.currentAtk;
    const defDmg = isAmbush ? 0 : defender.currentAtk;

    const defDestroyed = atkDmg >= defender.currentDef;
    const atkDestroyed = !isAmbush && defDmg >= attacker.currentDef;

    // Distorsión (trample): excess damage pierces to Reputation
    const excessOnDef = hasKw(attacker, 'distortion') && defDestroyed
      ? Math.max(0, atkDmg - defender.currentDef) : 0;
    const excessOnAtk = !isAmbush && hasKw(defender, 'distortion') && atkDestroyed
      ? Math.max(0, defDmg - attacker.currentDef) : 0;

    // Update attacker
    newAtk = {
      ...newAtk,
      hp: newAtk.hp - excessOnAtk,
      board: atkDestroyed
        ? newAtk.board.filter((_, i) => i !== attackerIdx)
        : newAtk.board.map((c, i) =>
          i === attackerIdx
            ? { ...c, isTapped: true, hasAttacked: true, currentDef: c.currentDef - defDmg }
            : c
        ),
      graveyard: atkDestroyed ? [...newAtk.graveyard, attacker] : newAtk.graveyard,
    };

    // Update defender
    newDef = {
      ...newDef,
      hp: newDef.hp - excessOnDef,
      board: defDestroyed
        ? newDef.board.filter((_, i) => i !== defenderIdx)
        : newDef.board.map((c, i) =>
          i === defenderIdx
            ? { ...c, currentDef: c.currentDef - atkDmg }
            : c
        ),
      graveyard: defDestroyed ? [...newDef.graveyard, defender] : newDef.graveyard,
    };
  }

  // Reconstruct [player, bot] from owner perspective
  if (attackerOwner === 'player') return [newAtk, newDef];
  return [newDef, newAtk];
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGameEngine() {
  const [player, setPlayer] = useState<PlayerState>(makeInitial);
  const [bot, setBot] = useState<PlayerState>(makeInitial);
  const [turn, setTurn] = useState<PlayerKey>('player');
  const [turnCount, setTurnCount] = useState(1);
  const [phase, setPhase] = useState<TurnPhase>(TurnPhase.MAIN);
  const [gameOver, setGameOver] = useState<GameOverResult>(null);
  const [pendingAttack, setPendingAttack] = useState<PendingAttack | null>(null);

  // Refs — gives bot AI / callbacks access to latest state without stale closures
  const playerRef = useRef(player);
  const botRef = useRef(bot);
  const turnRef = useRef(turn);
  const phaseRef = useRef(phase);
  const gameOverRef = useRef(gameOver);
  const pendingAttackRef = useRef(pendingAttack);

  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { botRef.current = bot; }, [bot]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { pendingAttackRef.current = pendingAttack; }, [pendingAttack]);

  // ── Win condition watcher ──
  useEffect(() => {
    if (gameOver) return;
    const p = player, b = bot;
    if (p.hp <= 0 && b.hp <= 0) { setTimeout(() => setGameOver('draw'), 0); return; }
    if (p.hp <= 0) { setTimeout(() => setGameOver('bot'), 0); return; }
    if (b.hp <= 0) { setTimeout(() => setGameOver('player'), 0); return; }
    if (p.hype >= 20) { setTimeout(() => setGameOver('player'), 0); return; }
    if (b.hype >= 20) { setTimeout(() => setGameOver('bot'), 0); return; }
  }, [player, bot, gameOver]);

  // ── startGame ──
  const startGame = useCallback((playerDeck: CardData[], botDeck: CardData[]) => {
    _instanceCounter = 0;
    const sp = [...playerDeck].sort(() => Math.random() - 0.5);
    const sb = [...botDeck].sort(() => Math.random() - 0.5);

    // Create Beat Drop card
    const beatDrop: CardData = {
      id: 'beat_drop_' + Date.now(),
      type: 'EVENT',
      stats: { atk: 0, def: 0 },
      cost: 0,
      rarity: 'BRONZE',
      abilities: [{ keyword: 'beat_drop', description: 'Beat Drop (Coin)' }],
      name: 'Beat Drop',
      artist: 'Tempo',
      album: 'Utility',
      genre: 'Utility',
      artUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/91/33/c8/9133c8bf-53a5-10eb-0649-bf6b0e980dd2/source/100x100bb.jpg',
      themeColor: '#eab308'
    };

    setPlayer({ ...makeInitial(), deck: sp.slice(5), hand: sp.slice(0, 5) });
    setBot({ ...makeInitial(), deck: sb.slice(5), hand: [...sb.slice(0, 5), beatDrop] }); // P2 gets 5 cards + Beat Drop (and will draw 1 on their turn)
    setTurn('player');
    setTurnCount(1);
    setPhase(TurnPhase.MAIN);
    setGameOver(null);
    setPendingAttack(null);
  }, []);

  // ── doMulligan ──
  const doMulligan = useCallback((target: PlayerKey) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    setSt((prev: PlayerState) => {
      if (prev.hasMulliganed) return prev;
      // Shuffle hand back into deck and draw 5 new cards
      const newDeck = [...prev.deck, ...prev.hand.filter((c: CardData) => !c.id.startsWith('beat_drop'))].sort(() => Math.random() - 0.5);

      const newHand = newDeck.slice(0, 5);
      // Keep beat drop if had one
      const hasBeatDrop = prev.hand.find((c: CardData) => c.id.startsWith('beat_drop'));
      if (hasBeatDrop) {
        newHand.push(hasBeatDrop);
      }

      return {
        ...prev,
        deck: newDeck.slice(5),
        hand: newHand,
        hasMulliganed: true
      };
    });
  }, []);

  // ── drawCard (mill check built-in) ──
  const drawCard = useCallback((target: PlayerKey) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    let mill = false;
    setSt((prev: PlayerState) => {
      if (prev.deck.length === 0) { mill = true; return prev; }
      const [drawn, ...rest] = prev.deck;
      return { ...prev, deck: rest, hand: [...prev.hand, drawn] };
    });
    if (mill) setTimeout(() => setGameOver(target === 'player' ? 'bot' : 'player'), 50);
  }, []);

  // ── playCard ──
  const triggerAbilities = useCallback((trigger: string, sourceInstanceId: string, currentGameState: any) => {
    // This is a bridge between the Hook state and the Engine
    const board = [...currentGameState.player.board, ...currentGameState.bot.board];
    const card = board.find((c: BoardCard) => c.instanceId === sourceInstanceId);
    if (!card || card.isSilenced) return;

    card.abilities?.forEach((ability: any) => {
      const keywordEffect = EngineAbilities.find(e => e.keyword === ability.keyword);
      if (keywordEffect && keywordEffect.trigger === trigger) {
        keywordEffect.resolve(currentGameState, sourceInstanceId);
      }
    });
  }, []);

  const playCard = useCallback((target: PlayerKey, cardIndex: number) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    let playedInstanceId = '';

    setSt((prev: PlayerState) => {
      const card = prev.hand[cardIndex];
      if (!card || prev.energy < card.cost) return prev;
      const newHand = prev.hand.filter((_, i) => i !== cardIndex);
      const newEnergy = prev.energy - card.cost;

      if (card.type === 'EVENT') {
        const backstageCard = makeBoardCard(card);
        playedInstanceId = backstageCard.instanceId;
        return { ...prev, energy: newEnergy, hand: newHand, backstage: [...prev.backstage, backstageCard] };
      }

      const boardCard = makeBoardCard(card);
      playedInstanceId = boardCard.instanceId;
      return { ...prev, energy: newEnergy, hand: newHand, board: [...prev.board, boardCard] };
    });

    // After state update, we trigger the Intro effects
    setTimeout(() => {
      if (playedInstanceId) {
        const fullState = {
          player: playerRef.current,
          bot: botRef.current,
          activePlayer: turnRef.current.toUpperCase() as any,
          effectStack: [],
          isGameOver: false,
          winner: null
        };
        triggerAbilities('ON_PLAY', playedInstanceId, fullState);
        resolveStack(fullState as any);
        // Sync back state
        setPlayer({ ...playerRef.current, hp: (fullState.player as any).health, hype: (fullState.player as any).hype });
        setBot({ ...botRef.current, hp: (fullState.bot as any).health, hype: (fullState.bot as any).hype });
      }
    }, 10);
  }, [triggerAbilities]);

  // ── attack ──
  const declareAttack = useCallback((attackerIdx: number, defenderIdx: number | null) => {
    if (gameOverRef.current || phaseRef.current !== TurnPhase.MAIN) return;
    setPendingAttack({
      attackerOwner: turnRef.current,
      attackerIdx,
      defenderIdx,
    });
    setPhase(TurnPhase.REPLICA);
  }, []);

  const resolvePendingAttack = useCallback(() => {
    const pa = pendingAttackRef.current;
    if (!pa) return;
    const [np, nb] = resolveAttackPure(
      playerRef.current,
      botRef.current,
      pa.attackerOwner,
      pa.attackerIdx,
      pa.defenderIdx
    );
    setPlayer(np);
    setBot(nb);
    setPendingAttack(null);
    setPhase(TurnPhase.MAIN);
  }, []);

  const skipReplica = useCallback(() => {
    if (phaseRef.current === TurnPhase.REPLICA) {
      resolvePendingAttack();
    }
  }, [resolvePendingAttack]);

  const intercept = useCallback((interceptorIdx: number) => {
    if (phaseRef.current !== TurnPhase.REPLICA) return;
    const pa = pendingAttackRef.current;
    if (!pa) return;

    const defenderOwner = pa.attackerOwner === 'player' ? 'bot' : 'player';
    const defState = defenderOwner === 'player' ? playerRef.current : botRef.current;

    if (defState.energy < 1) return;

    const interceptor = defState.board[interceptorIdx];
    if (!interceptor || interceptor.isTapped) return;

    // VIP check: non-VIP cannot intercept VIP
    const attackerOwner = pa.attackerOwner;
    const attackerState = attackerOwner === 'player' ? playerRef.current : botRef.current;
    const attacker = attackerState.board[pa.attackerIdx];
    if (attacker && hasKw(attacker, 'vip') && !hasKw(interceptor, 'vip')) {
      return;
    }

    if (defenderOwner === 'player') {
      setPlayer((p: PlayerState) => ({ ...p, energy: p.energy - 1 }));
    } else {
      setBot((b: PlayerState) => ({ ...b, energy: b.energy - 1 }));
    }

    setPendingAttack({
      ...pa,
      defenderIdx: interceptorIdx
    });

    setTimeout(() => {
      resolvePendingAttack();
    }, 800);
  }, [resolvePendingAttack]);

  const activateBackstage = useCallback((owner: PlayerKey, backstageIdx: number) => {
    const setSt = owner === 'player' ? setPlayer : setBot;
    let cardCost = 0;

    setSt((prev: PlayerState) => {
      const card = prev.backstage[backstageIdx];
      if (!card || prev.energy < card.cost) return prev;
      cardCost = card.cost;

      const newBackstage = prev.backstage.filter((_, i) => i !== backstageIdx);

      // Apply backstage effect (for now just heal 2, later we'll add specific effects)
      let newHp = Math.min(prev.hp + 2, 20);
      let newEnergy = prev.energy - card.cost;

      // Handle Beat Drop
      if (card.id.startsWith('beat_drop')) {
        newEnergy += 1;
        newHp = prev.hp; // Reset hp back, no healing from beat_drop
      }

      return {
        ...prev,
        hp: newHp,
        energy: newEnergy,
        backstage: newBackstage,
        graveyard: [...prev.graveyard, card]
      };
    });

    // If activated during replica phase, it resolves the attack immediately (or intercepts)
    if (phaseRef.current === TurnPhase.REPLICA && cardCost > 0) { // Only if it was actually activated
      setTimeout(() => {
        resolvePendingAttack();
      }, 800);
    }
  }, [resolvePendingAttack]);

  // ── advancePhase (New logic replacing endTurn) ──
  const advancePhase = useCallback(() => {
    if (gameOverRef.current) return;

    const currentPhase = phaseRef.current;
    const currentTurn = turnRef.current;

    switch (currentPhase) {
      case TurnPhase.START:
        setPhase(TurnPhase.DRAW);
        setTimeout(() => drawCard(currentTurn), 100);
        break;

      case TurnPhase.DRAW:
        setPhase(TurnPhase.MAIN);
        break;

      case TurnPhase.MAIN:
        // Transition to COMBAT or END directly?
        // Let's stick to a linear flow for now or allow UI to jump
        setPhase(TurnPhase.END);
        break;

      case TurnPhase.COMBAT:
        setPhase(TurnPhase.MAIN);
        break;

      case TurnPhase.END:
        const nextTurn: PlayerKey = currentTurn === 'player' ? 'bot' : 'player';

        // End of turn cleanup
        const currentSetter = currentTurn === 'player' ? setPlayer : setBot;
        currentSetter((prev: PlayerState) => {
          // Discard down to 10
          const newHand = prev.hand.length > 10 ? prev.hand.slice(0, 10) : prev.hand;
          const discard = prev.hand.length > 10 ? prev.hand.slice(10) : [];
          return { ...prev, hand: newHand, graveyard: [...prev.graveyard, ...discard] };
        });

        setTurn(nextTurn);
        if (nextTurn === 'player') setTurnCount(c => c + 1);
        setPhase(TurnPhase.START);

        // Process START of next turn triggers
        const nextSetter = nextTurn === 'player' ? setPlayer : setBot;
        nextSetter((prev: PlayerState) => {
          const nextFullState: any = {
            player: nextTurn === 'player' ? prev : playerRef.current,
            bot: nextTurn === 'bot' ? prev : botRef.current,
            activePlayer: nextTurn.toUpperCase(),
            effectStack: [],
          };

          // Untap and triggers
          const untapedBoard = prev.board.map(c => ({
            ...c,
            isTapped: false,
            stageFright: false,
            hasAttacked: false,
          }));

          untapedBoard.forEach(card => {
            triggerAbilities('ON_PHASE_START', card.instanceId, nextFullState);
          });

          resolveStack(nextFullState);

          return {
            ...prev,
            canPromote: true,
            energy: prev.maxEnergy, // Refresh energy
            board: untapedBoard,
            hp: nextTurn === 'player' ? nextFullState.player.hp : nextFullState.bot.hp,
            hype: nextTurn === 'player' ? nextFullState.player.hype : nextFullState.bot.hype,
          };
        });

        break;
    }
  }, [drawCard, triggerAbilities]);

  const endTurn = useCallback(() => {
    if (phaseRef.current === TurnPhase.MAIN || phaseRef.current === TurnPhase.COMBAT) {
      setPhase(TurnPhase.END);
      setTimeout(advancePhase, 100);
    }
  }, [advancePhase]);

  // ── promoteCard ──
  const promoteCard = useCallback((target: PlayerKey, cardIndex: number) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    setSt((prev: PlayerState) => {
      if (!prev.canPromote || prev.maxEnergy >= 10) return prev;
      const card = prev.hand[cardIndex];
      if (!card) return prev;
      const newHand = prev.hand.filter((_: any, i: number) => i !== cardIndex);
      return {
        ...prev,
        maxEnergy: prev.maxEnergy + 1,
        canPromote: false,
        hand: newHand,
        graveyard: [...prev.graveyard, card]
      };
    });
  }, []);

  return {
    player, bot, turn, turnCount, phase, gameOver, pendingAttack,
    startGame, playCard, promoteCard, declareAttack, resolvePendingAttack, skipReplica, intercept, activateBackstage, endTurn, doMulligan,
    // Expose for external use
    playerRef, botRef,
  };
}
