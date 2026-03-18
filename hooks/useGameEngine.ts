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
  health: number;        // Reputación (starts at 30)
  hype: number;          // Acumula — win at 20
  energy: number;        // Current energy available (Mana Float: carries to opponent's turn for reactions)
  maxEnergy: number;     // Max energy this turn (increases by 1 each turn, capped at 10)
  canPromote: boolean;   // Can sacrifice 1 card per turn for max energy
  hasMulliganed: boolean;
  deck: CardData[];
  hand: BoardCard[];     // Updated to BoardCard to have instanceId in hand
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
  health: 30, hype: 0, energy: 1, maxEnergy: 1, canPromote: true, hasMulliganed: false,
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
    if (defenderIdx === null) return [pState, bState];
    const target = defState.board[defenderIdx];
    if (!target || !hasKw(target, 'taunt')) return [pState, bState];
    if (hasKw(attacker, 'vip') && !hasKw(target, 'vip') && activeTaunters.some(c => hasKw(c, 'vip'))) {
      return [pState, bState];
    }
  }

  // ── Acústico / Stealth enforcement ──
  if (defenderIdx !== null) {
    const defender = defState.board[defenderIdx];
    if (defender && hasKw(defender, 'stealth') && !defender.hasAttacked) {
      return [pState, bState];
    }
  }

  // ── VIP / Flying enforcement ──
  if (defenderIdx !== null) {
    const defender = defState.board[defenderIdx];
    if (defender && hasKw(attacker, 'vip') && !hasKw(defender, 'vip')) {
      const activeVipTaunters = defState.board.filter(c => hasKw(c, 'taunt') && !c.isTapped && hasKw(c, 'vip'));
      if (activeVipTaunters.length > 0) {
        if (!hasKw(defender, 'taunt') || !hasKw(defender, 'vip')) return [pState, bState];
      }
    }
  }

  let newAtk: PlayerState = { ...atkState };
  let newDef: PlayerState = { ...defState };

  if (defenderIdx === null) {
    const dmg = attacker.currentAtk;
    newDef = { ...newDef, health: newDef.health - dmg };
    newAtk = {
      ...newAtk,
      board: newAtk.board.map((c, i) =>
        i === attackerIdx ? { ...c, isTapped: true, hasAttacked: true } : c
      ),
    };
  } else {
    const defender = defState.board[defenderIdx];
    if (!defender) return [pState, bState];

    const isAmbush = defender.isTapped;
    const atkDmg = attacker.currentAtk;
    const defDmg = isAmbush ? 0 : defender.currentAtk;

    const defDestroyed = atkDmg >= defender.currentDef;
    const atkDestroyed = !isAmbush && defDmg >= attacker.currentDef;

    const excessOnDef = hasKw(attacker, 'distortion') && defDestroyed
      ? Math.max(0, atkDmg - defender.currentDef) : 0;
    const excessOnAtk = !isAmbush && hasKw(defender, 'distortion') && atkDestroyed
      ? Math.max(0, defDmg - attacker.currentDef) : 0;

    newAtk = {
      ...newAtk,
      health: Math.max(0, newAtk.health - excessOnAtk),
      board: newAtk.board
        .map((c, i) =>
          i === attackerIdx
            ? { ...c, isTapped: true, hasAttacked: true, currentDef: c.currentDef - defDmg }
            : c
        )
        .filter(c => c.currentDef > 0),
      graveyard: [
        ...newAtk.graveyard,
        ...newAtk.board.filter((c, i) => i === attackerIdx && c.currentDef - defDmg <= 0)
      ],
    };

    newDef = {
      ...newDef,
      health: Math.max(0, newDef.health - excessOnDef),
      board: newDef.board
        .map((c, i) =>
          i === defenderIdx
            ? { ...c, currentDef: c.currentDef - atkDmg }
            : c
        )
        .filter(c => c.currentDef > 0),
      graveyard: [
        ...newDef.graveyard,
        ...newDef.board.filter((c, i) => i === defenderIdx && c.currentDef - atkDmg <= 0)
      ],
    };
  }

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

  useEffect(() => {
    if (gameOver) return;
    const p = player, b = bot;
    if (p.health <= 0 && b.health <= 0) { setTimeout(() => setGameOver('draw'), 0); return; }
    if (p.health <= 0) { setTimeout(() => setGameOver('bot'), 0); return; }
    if (b.health <= 0) { setTimeout(() => setGameOver('player'), 0); return; }
    if (p.hype >= 20) { setTimeout(() => setGameOver('player'), 0); return; }
    if (b.hype >= 20) { setTimeout(() => setGameOver('bot'), 0); return; }
  }, [player, bot, gameOver]);

  const startGame = useCallback((playerDeck: CardData[], botDeck: CardData[]) => {
    _instanceCounter = 0;
    const sp = [...playerDeck].sort(() => Math.random() - 0.5);
    const sb = [...botDeck].sort(() => Math.random() - 0.5);

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

    setPlayer({ ...makeInitial(), deck: sp.slice(5), hand: sp.slice(0, 5).map(makeBoardCard) });
    setBot({ ...makeInitial(), deck: sb.slice(5), hand: [...sb.slice(0, 5).map(makeBoardCard), makeBoardCard(beatDrop)] });
    setTurn('player');
    setTurnCount(1);
    setPhase(TurnPhase.MAIN);
    setGameOver(null);
    setPendingAttack(null);
  }, []);

  const doMulligan = useCallback((target: PlayerKey) => {
    setPlayer((p: PlayerState) => {
      const targetState = target === 'player' ? p : botRef.current;
      if (targetState.hasMulliganed) return p;
      const newDeck = [...targetState.deck, ...targetState.hand.filter((c: BoardCard) => !c.id.startsWith('beat_drop'))].sort(() => Math.random() - 0.5);
      const newHand = newDeck.slice(0, 5).map(makeBoardCard);
      const hasBeatDrop = targetState.hand.find((c: BoardCard) => c.id.startsWith('beat_drop'));
      if (hasBeatDrop) newHand.push(hasBeatDrop);

      const newState = { ...targetState, deck: newDeck.slice(5), hand: newHand, hasMulliganed: true };
      if (target === 'player') return newState;
      setBot(newState);
      return p;
    });
  }, []);

  const drawCard = useCallback((target: PlayerKey) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    let mill = false;
    setSt((prev: PlayerState) => {
      if (prev.deck.length === 0) { mill = true; return prev; }
      const [drawn, ...rest] = prev.deck;
      return { ...prev, deck: rest, hand: [...prev.hand, makeBoardCard(drawn)] };
    });
    if (mill) setTimeout(() => setGameOver(target === 'player' ? 'bot' : 'player'), 50);
  }, []);

  const triggerAbilities = useCallback((trigger: string, sourceInstanceId: string, currentGameState: any) => {
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
      if (prev.board.length >= 5 && card.type !== 'EVENT') return prev; // Enforce board limit
      const newHand = prev.hand.filter((_, i) => i !== cardIndex);
      const newEnergy = prev.energy - card.cost;
      playedInstanceId = card.instanceId;

      if (card.type === 'EVENT') {
        return { ...prev, energy: newEnergy, hand: newHand, backstage: [...prev.backstage, card] };
      }
      return { ...prev, energy: newEnergy, hand: newHand, board: [...prev.board, card] };
    });

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
        setPlayer({ ...playerRef.current, health: fullState.player.health, hype: fullState.player.hype });
        setBot({ ...botRef.current, health: fullState.bot.health, hype: fullState.bot.hype });
      }
    }, 10);
  }, [triggerAbilities]);

  const declareAttack = useCallback((attackerIdx: number, defenderIdx: number | null) => {
    if (gameOverRef.current || phaseRef.current !== TurnPhase.MAIN) return;
    setPendingAttack({ attackerOwner: turnRef.current, attackerIdx, defenderIdx });
    setPhase(TurnPhase.REPLICA);
  }, []);

  const resolvePendingAttack = useCallback(() => {
    const pa = pendingAttackRef.current;
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
    const pa = pendingAttackRef.current;
    if (!pa) return;

    const defenderOwner = pa.attackerOwner === 'player' ? 'bot' : 'player';
    const defState = defenderOwner === 'player' ? playerRef.current : botRef.current;
    if (defState.energy < 1) return;

    const interceptor = defState.board[interceptorIdx];
    if (!interceptor || interceptor.isTapped) return;

    const attackerOwner = pa.attackerOwner;
    const attackerState = attackerOwner === 'player' ? playerRef.current : botRef.current;
    const attacker = attackerState.board[pa.attackerIdx];
    if (attacker && hasKw(attacker, 'vip') && !hasKw(interceptor, 'vip')) return;

    const setSt = defenderOwner === 'player' ? setPlayer : setBot;
    setSt((p: PlayerState) => ({ ...p, energy: p.energy - 1 }));

    setPendingAttack({ ...pa, defenderIdx: interceptorIdx });
    setTimeout(() => resolvePendingAttack(), 800);
  }, [resolvePendingAttack]);

  const activateBackstage = useCallback((owner: PlayerKey, backstageIdx: number) => {
    const setSt = owner === 'player' ? setPlayer : setBot;
    let cardCost = 0;
    let reactivatedCard: BoardCard | null = null;

    setSt((prev: PlayerState) => {
      const card = prev.backstage[backstageIdx];
      if (!card) return prev;

      const isReactivation = card.type !== 'EVENT';
      const cost = isReactivation ? 2 : card.cost; // Reactivating a card costs 2 energy

      if (prev.energy < cost) return prev;
      if (isReactivation && prev.board.length >= 5) return prev; // No space to reactivate

      cardCost = cost;
      const newBackstage = prev.backstage.filter((_, i) => i !== backstageIdx);
      let newEnergy = prev.energy - cost;

      if (card.type === 'EVENT') {
        let newHealth = Math.min(prev.health + 2, 30);
        if (card.id.startsWith('beat_drop')) { newEnergy += 1; newHealth = prev.health; }
        return { ...prev, health: newHealth, energy: newEnergy, backstage: newBackstage, graveyard: [...prev.graveyard, card] };
      } else {
        // Reactivate card to board
        reactivatedCard = { ...card, isTapped: true, stageFright: true }; // Reactivated cards start tapped
        return { ...prev, energy: newEnergy, backstage: newBackstage, board: [...prev.board, reactivatedCard] };
      }
    });

    if (phaseRef.current === TurnPhase.REPLICA && cardCost > 0) setTimeout(() => resolvePendingAttack(), 800);
  }, [resolvePendingAttack]);

  const retireCard = useCallback((owner: PlayerKey, boardIdx: number) => {
    const setSt = owner === 'player' ? setPlayer : setBot;
    setSt((prev: PlayerState) => {
      if (prev.energy < 1) return prev; // Retiring costs 1 energy
      const card = prev.board[boardIdx];
      if (!card) return prev;
      return {
        ...prev,
        energy: prev.energy - 1,
        board: prev.board.filter((_, i) => i !== boardIdx),
        backstage: [...prev.backstage, card]
      };
    });
  }, []);

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
        setPhase(TurnPhase.END);
        break;
      case TurnPhase.COMBAT:
        setPhase(TurnPhase.MAIN);
        break;
      case TurnPhase.END:
        const nextTurn: PlayerKey = currentTurn === 'player' ? 'bot' : 'player';
        const currentSetter = currentTurn === 'player' ? setPlayer : setBot;
        currentSetter((prev: PlayerState) => {
          const newHand = prev.hand.length > 10 ? prev.hand.slice(0, 10) : prev.hand;
          const discard = prev.hand.length > 10 ? prev.hand.slice(10) : [];
          return { ...prev, hand: newHand, graveyard: [...prev.graveyard, ...discard] };
        });
        setTurn(nextTurn);
        if (nextTurn === 'player') setTurnCount(c => c + 1);
        setPhase(TurnPhase.START);
        const nextSetter = nextTurn === 'player' ? setPlayer : setBot;
        nextSetter((prev: PlayerState) => {
          const untapedBoard = prev.board.map(c => ({ ...c, isTapped: false, stageFright: false, hasAttacked: false }));
          return { ...prev, canPromote: true, energy: prev.maxEnergy, board: untapedBoard };
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

  const promoteCard = useCallback((target: PlayerKey, cardIndex: number) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    setSt((prev: PlayerState) => {
      if (!prev.canPromote || prev.maxEnergy >= 10) return prev;
      const card = prev.hand[cardIndex];
      if (!card) return prev;
      return { ...prev, maxEnergy: prev.maxEnergy + 1, canPromote: false, hand: prev.hand.filter((_, i) => i !== cardIndex), graveyard: [...prev.graveyard, card] };
    });
  }, []);

  return {
    player, bot, turn, turnCount, phase, gameOver, pendingAttack,
    startGame, playCard, promoteCard, declareAttack, resolvePendingAttack, skipReplica, intercept, activateBackstage, retireCard, endTurn, doMulligan,
    playerRef, botRef,
  };
}
