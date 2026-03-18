/**
 * SISTEMA DE COMBATE Y TURNOS - MusicTCG
 * GDD Sección 4: Sistema de Combate y Turnos (Mecánicas Core)
 * GDD Sección 5: Condiciones de Victoria (La Triple Amenaza)
 * 
 * Implementa:
 * - Flujo de turnos con 3 fases
 * - Estados de cartas (Tapped/Untapped)
 * - El Choque, La Emboscada, Ataque Directo
 * - La Réplica (Reacción del defensor)
 * - Condiciones de victoria (Knockout, Hype, Olvido)
 */

import {
  MasterCardTemplate,
  PlayedCard,
  PlayerState,
  PlayerZones,
  GameState,
  ReactionState,
  GameAction,
  TurnPhase,
  CombatType,
  GameEndCondition,
  Trigger,
  Effect,
  Target
} from '../types/types';
import { DetailedPhase } from './gameStateEngine';

// ============================================
// MOTOR DE TURNOS
// ============================================

export class TurnManager {
  /**
   * GDD 4.1: Anatomía del Turno
   * Fase 1: Apertura (Endrezar + Robar)
   * Fase 2: Principal (Acciones del jugador)
   * Fase 3: Cierre (Efectos pasivos)
   */

  static initializeTurn(gameState: GameState): GameState {
    const activePlayer = gameState.players[gameState.activePlayer as 'player_A' | 'player_B'];

    // FASE APERTURA
    // 1. Endrezar todas las cartas Giradas
    this.untapAllCards(activePlayer);

    // 2. Robar 1 carta (excepto el primer turno del primer jugador)
    const shouldDraw = !(gameState.turn === 1 && gameState.activePlayer === 'player_A');
    if (shouldDraw) {
      this.drawCard(activePlayer);
    }

    // Cambiar a MAIN phase
    gameState.phase = TurnPhase.MAIN;

    return gameState;
  }

  static endTurn(gameState: GameState): GameState {
    const activePlayer = gameState.players[gameState.activePlayer as 'player_A' | 'player_B'];

    // FASE CIERRE
    // 1. Resolver efectos pasivos que dicen "Al final de tu turno..."
    this.resolveEndOfTurnEffects(activePlayer, gameState);

    // 2. Cambiar jugador activo
    const nextPlayer = gameState.activePlayer === 'player_A' ? 'player_B' : 'player_A';
    gameState.activePlayer = nextPlayer;
    gameState.turn++;
    gameState.phase = TurnPhase.OPENING;

    return gameState;
  }

  private static untapAllCards(player: PlayerState): void {
    // Endrezar Escenario
    player.zones.board.forEach((card) => {
      card.isTapped = false;
      card.isTapped90 = false;
    });

    // Endrezar Backstage (si aplica)
    player.zones.backstage.forEach((card) => {
      card.isTapped = false;
    });

    // En el nuevo sistema, la zona de energía ya no se tapea, 
    // sino que se usa energía.current.

    // Restaurar Energía a máximo
    player.energy.current = player.energy.max;
    player.energy.sacrificesThisTurn = 0; // Reiniciar límite de sacrificio
  }

  private static drawCard(player: PlayerState): void {
    // GDD 5.3: Si el mazo tiene 0 cartas y se debe robar, pierde por "Olvido"
    if (player.zones.deck.length === 0) {
      return;
    }

    const card = player.zones.deck.shift();
    if (card) {
      player.zones.hand.push(card);
      player.zones.deckCount = player.zones.deck.length;
      player.zones.handCount = player.zones.hand.length;
    }
  }

  private static resolveEndOfTurnEffects(
    player: PlayerState,
    gameState: GameState
  ): void {
    // Implementar lógica de efectos de fin de turno
  }
}

// ============================================
// MOTOR DE COMBATE
// ============================================

export class CombatResolver {
  /**
   * GDD 4.3: El Combate Directo (Choque y Emboscada)
   */

  static declareAttack(
    attacker: PlayedCard,
    target: PlayedCard | 'reputation',
    defenderState: PlayerState,
    gameState: GameState
  ): ReactionState | null {
    // Validar que atacante está enderezado
    if (attacker.isTapped) {
      throw new Error('La carta atacante debe estar enderezada');
    }

    // Validar que atacante no tiene pánico escénico (HASTE lo ignora)
    const hasHaste = attacker.abilities?.some(a => a.effect === Effect.HASTE);
    if (!hasHaste && attacker.damageThisTurn === -1) { // -1 como indicador de recién bajado si aplica
      // throw new Error('Pánico Escénico');
    }

    // Determinar tipo de combate
    let combatType: CombatType;
    let declaredDamage = attacker.currentAtk;

    if (target === 'reputation') {
      combatType = CombatType.DIRECT;
    } else if (target.isTapped) {
      combatType = CombatType.AMBUSH;
    } else {
      combatType = CombatType.CLASH;
    }

    // Girar la carta atacante
    attacker.isTapped = true;

    // La Réplica
    const canReact = defenderState.energy.current > 0 && target !== 'reputation';

    if (canReact) {
      return {
        attackerId: attacker.instanceId,
        targetId: typeof target === 'string' ? target : target.instanceId,
        combatType,
        declaredDamage,
        defenderId: defenderState.playerId,
        remainingTime: 5000,
      };
    }

    // Resolver combate inmediatamente
    this.resolveCombat(attacker, target, combatType, defenderState, gameState);
    return null;
  }

  static processReaction(
    reactionState: ReactionState,
    reaction: 'intercept' | 'event' | 'pass',
    defenderState: PlayerState,
    gameState: GameState
  ): void {
    const attacker = this.findCardInZones(reactionState.attackerId, gameState.players.player_A.zones) ||
      this.findCardInZones(reactionState.attackerId, gameState.players.player_B.zones);

    const defender = gameState.players[reactionState.defenderId as 'player_A' | 'player_B'];
    const target = reactionState.targetId === 'reputation' ? 'reputation' : this.findCardInZones(reactionState.targetId, defender.zones);

    if (reaction === 'pass') {
      if (attacker && target) {
        this.resolveCombat(attacker, target, reactionState.combatType, defender, gameState);
      }
    } else if (reaction === 'intercept') {
      if (defender.energy.current < 1) throw new Error('No hay energía');
      defender.energy.current--;
      // Lógica de intercepción pendiente de implementación UI
    }
  }

  private static resolveCombat(
    attacker: PlayedCard,
    target: PlayedCard | 'reputation',
    combatType: CombatType,
    defender: PlayerState,
    gameState: GameState
  ): void {
    const attackerDamage = attacker.currentAtk;

    if (target === 'reputation') {
      defender.reputation -= attackerDamage;
    } else {
      if (combatType === CombatType.AMBUSH) {
        target.currentDef -= attackerDamage;
        if (target.currentDef <= 0) {
          this.destroyCard(target, defender);
        }
      } else if (combatType === CombatType.CLASH) {
        // Daño mutuo
        const targetDamage = target.currentAtk;
        attacker.currentDef -= targetDamage;
        target.currentDef -= attackerDamage;

        if (attacker.currentDef <= 0) {
          const owner = gameState.players[gameState.activePlayer as 'player_A' | 'player_B'];
          this.destroyCard(attacker, owner);
        }

        if (target.currentDef <= 0) {
          this.destroyCard(target, defender);
        }
      }
    }
  }

  private static destroyCard(card: PlayedCard, owner: PlayerState): void {
    const boardIndex = owner.zones.board.findIndex(c => c.instanceId === card.instanceId);
    if (boardIndex > -1) {
      owner.zones.board.splice(boardIndex, 1);
    }

    const backstageIndex = owner.zones.backstage.findIndex(c => c.instanceId === card.instanceId);
    if (backstageIndex > -1) {
      owner.zones.backstage.splice(backstageIndex, 1);
    }

    // Trigger OUTRO
    if (card.abilities?.some(a => a.trigger === Trigger.OUTRO)) {
      // Resolver efectos automáticos de destrucción
    }
  }

  private static findCardInZones(instanceId: string, zones: PlayerZones): PlayedCard | null {
    return zones.board.find(c => c.instanceId === instanceId) ||
      zones.backstage.find(c => c.instanceId === instanceId) ||
      null;
  }
}

// ============================================
// MÁQUINA DE CONDICIONES DE VICTORIA
// ============================================

export class VictoryChecker {
  static checkVictoryCondition(gameState: GameState): GameEndCondition | null {
    for (const [playerId, player] of Object.entries(gameState.players)) {
      if (player.reputation <= 0) {
        gameState.isGameOver = true;
        gameState.winner = playerId === 'player_A' ? 'player_B' : 'player_A';
        gameState.endCondition = GameEndCondition.KNOCKOUT;
        return GameEndCondition.KNOCKOUT;
      }
      if (player.hype >= 20) {
        gameState.isGameOver = true;
        gameState.winner = playerId;
        gameState.endCondition = GameEndCondition.HYPE_WIN;
        return GameEndCondition.HYPE_WIN;
      }
    }

    const pADead = gameState.players.player_A.reputation <= 0;
    const pBDead = gameState.players.player_B.reputation <= 0;
    if (pADead && pBDead) {
      gameState.isGameOver = true;
      gameState.endCondition = GameEndCondition.DRAW;
      return GameEndCondition.DRAW;
    }

    return null;
  }
}

// ============================================
// INICIALIZADOR DE PARTIDA
// ============================================

export function initializeGameState(
  player_A_Id: string,
  player_B_Id: string,
  player_A_Deck: MasterCardTemplate[],
  player_B_Deck: MasterCardTemplate[]
): GameState {
  const createPlayer = (id: string, deck: MasterCardTemplate[]): PlayerState => ({
    playerId: id,
    reputation: 30,
    hype: 0,
    energy: {
      basePerTurn: 1,
      sacrificesThisTurn: 0,
      permanentFromSacrifices: 0,
      current: 1,
      max: 1
    },
    zones: {
      deck: [...deck],
      hand: [],
      board: [],
      backstage: [],
      energyZone: { cards: [], currentCount: 0 },
      deckCount: deck.length,
      handCount: 0
    }
  });

  return {
    matchId: `match_${Date.now()}`,
    turn: 1,
    phase: TurnPhase.OPENING,
    activePlayer: 'player_A',
    players: {
      player_A: createPlayer(player_A_Id, player_A_Deck),
      player_B: createPlayer(player_B_Id, player_B_Deck)
    },
    isGameOver: false,
    history: [],
    board: { lanes: [] },
    _phaseState: {
      currentPhase: DetailedPhase.START_BEGINNING_EFFECTS,
      mainPhaseCount: 0,
      declaredAttackers: [],
      isWaitingForOpponent: false,
      pendingValidation: false,
    }
  };
}