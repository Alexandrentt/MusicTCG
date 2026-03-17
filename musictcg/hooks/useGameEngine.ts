import { useState, useCallback, useEffect, useRef } from 'react';
import { CardData } from '@/lib/engine/generator';

let _instanceCounter = 0;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BoardCard extends CardData {
  instanceId: string;
  isTapped: boolean;
  stageFright: boolean;   // Can't attack turn played (unless Frenzy)
  hasAttacked: boolean;   // For Stealth/Acústico
  currentAtk: number;     // Can be modified by effects
  currentDef: number;
}

export type PlayerKey = 'player' | 'bot';
export type GamePhase = 'main' | 'replica' | 'end';
export type GameOverResult = 'player' | 'bot' | 'draw' | null;

export interface PlayerState {
  hp: number;            // Reputación (starts at 30)
  hype: number;          // Acumula — win at 20
  energy: number;        // Current energy available (Mana Float: carries to opponent's turn for reactions)
  maxEnergy: number;     // Max energy this turn (increases by 1 each turn, capped at 10)
  canPromote: boolean;   // Can sacrifice 1 card per turn for max energy
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
    // Stage Fright: can't attack turn played, UNLESS card has Frenzy/Tempo
    stageFright: !hasKw(card, 'frenzy'),
    hasAttacked: false,
    currentAtk: card.stats.atk,
    currentDef: card.stats.def,
  };
}

const makeInitial = (): PlayerState => ({
  hp: 30, hype: 0, energy: 1, maxEnergy: 1, canPromote: true,
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
  const [phase, setPhase] = useState<GamePhase>('main');
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
    setPlayer({ ...makeInitial(), deck: sp.slice(5), hand: sp.slice(0, 5) });
    setBot({ ...makeInitial(), deck: sb.slice(5), hand: sb.slice(0, 5) });
    setTurn('player');
    setTurnCount(1);
    setPhase('main');
    setGameOver(null);
    setPendingAttack(null);
  }, []);

  // ── drawCard (mill check built-in) ──
  const drawCard = useCallback((target: PlayerKey) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    let mill = false;
    setSt(prev => {
      if (prev.deck.length === 0) { mill = true; return prev; }
      const [drawn, ...rest] = prev.deck;
      return { ...prev, deck: rest, hand: [...prev.hand, drawn] };
    });
    if (mill) setTimeout(() => setGameOver(target === 'player' ? 'bot' : 'player'), 50);
  }, []);

  // ── playCard ──
  const playCard = useCallback((target: PlayerKey, cardIndex: number) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    setSt(prev => {
      const card = prev.hand[cardIndex];
      if (!card || prev.energy < card.cost) return prev;
      const newHand = prev.hand.filter((_, i) => i !== cardIndex);
      const newEnergy = prev.energy - card.cost;

      if (card.type === 'EVENT') {
        const backstageCard = makeBoardCard(card);
        return { ...prev, energy: newEnergy, hand: newHand, backstage: [...prev.backstage, backstageCard] };
      }

      const boardCard = makeBoardCard(card);

      // DissTrack intro: -1 ATK / -1 DEF to a random opponent creature (applied on play)
      // This will be applied in a separate effect in the future
      return { ...prev, energy: newEnergy, hand: newHand, board: [...prev.board, boardCard] };
    });
  }, []);

  // ── attack ──
  const declareAttack = useCallback((attackerIdx: number, defenderIdx: number | null) => {
    if (gameOverRef.current || phaseRef.current !== 'main') return;
    setPendingAttack({
      attackerOwner: turnRef.current,
      attackerIdx,
      defenderIdx,
    });
    setPhase('replica');
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
    setPhase('main');
  }, []);

  const skipReplica = useCallback(() => {
    if (phaseRef.current === 'replica') {
      resolvePendingAttack();
    }
  }, [resolvePendingAttack]);

  const intercept = useCallback((interceptorIdx: number) => {
    if (phaseRef.current !== 'replica') return;
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
      setPlayer(p => ({ ...p, energy: p.energy - 1 }));
    } else {
      setBot(b => ({ ...b, energy: b.energy - 1 }));
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
    
    setSt(prev => {
      const card = prev.backstage[backstageIdx];
      if (!card || prev.energy < card.cost) return prev;
      cardCost = card.cost;
      
      const newBackstage = prev.backstage.filter((_, i) => i !== backstageIdx);
      
      // Apply backstage effect (for now just heal 2, later we'll add specific effects)
      const newHp = Math.min(prev.hp + 2, 20);

      return {
        ...prev,
        hp: newHp,
        energy: prev.energy - card.cost,
        backstage: newBackstage,
        graveyard: [...prev.graveyard, card]
      };
    });

    // If activated during replica phase, it resolves the attack immediately (or intercepts)
    if (phaseRef.current === 'replica' && cardCost > 0) { // Only if it was actually activated
      setTimeout(() => {
        resolvePendingAttack();
      }, 800);
    }
  }, [resolvePendingAttack]);

  // ── endTurn ──
  const endTurn = useCallback(() => {
    if (phaseRef.current !== 'main') return;
    const currentTurn = turnRef.current;
    const nextTurn: PlayerKey = currentTurn === 'player' ? 'bot' : 'player';

    // Process START of next player's turn
    const nextSetter = nextTurn === 'player' ? setPlayer : setBot;
    nextSetter(prev => {
      // Untap all cards, remove Stage Fright
      const untappedBoard = prev.board.map(c => {
        let newDef = c.currentDef;
        // Sustain: heal to max def at start of turn
        if (hasKw(c, 'sustain')) {
          newDef = c.stats.def;
        }
        return { ...c, isTapped: false, stageFright: false, currentDef: newDef };
      });

      // Aura — Soundtrack: grant +1 DEF to all other cards while on stage
      const hasSoundtrack = untappedBoard.some(c => hasKw(c, 'soundtrack'));
      const newBoard = hasSoundtrack
        ? untappedBoard.map(c => hasKw(c, 'soundtrack') ? c : { ...c, currentDef: c.currentDef + 1 })
        : untappedBoard;

      // Hype Engine passive: +1 hype per untapped hypeEngine card at turn start
      const hypeGain = newBoard.filter(c => hasKw(c, 'hypeEngine')).length;

      return {
        ...prev,
        canPromote: true,
        energy: prev.maxEnergy, // Refresh energy at START of YOUR turn (Mana Float complete)
        hype: Math.min(prev.hype + hypeGain, 20),
        board: newBoard,
      };
    });

    setTurn(nextTurn);
    if (nextTurn === 'player') setTurnCount(c => c + 1);
    setPhase('main');

    // Draw card for next player (slight delay to allow state to settle)
    setTimeout(() => drawCard(nextTurn), 30);
  }, [drawCard]);

  // ── promoteCard ──
  const promoteCard = useCallback((target: PlayerKey, cardIndex: number) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    setSt(prev => {
      if (!prev.canPromote || prev.maxEnergy >= 10) return prev;
      const card = prev.hand[cardIndex];
      if (!card) return prev;
      const newHand = prev.hand.filter((_, i) => i !== cardIndex);
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
    startGame, playCard, promoteCard, declareAttack, resolvePendingAttack, skipReplica, intercept, activateBackstage, endTurn,
    // Expose for external use
    playerRef, botRef,
  };
}
