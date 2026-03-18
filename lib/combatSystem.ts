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

import { MasterCardTemplate } from './cardGenerator';
import { GeneratedAbility, Trigger, Effect, Target } from './abilityEngine';
import { GameStateEngine, DetailedPhase } from './gameStateEngine';
import { TurnPhaseManager } from './turnPhaseManager';
// ============================================
// TIPOS Y ENUMS
// ============================================

export enum TurnPhase {
  OPENING = 'opening', // Endrezar + Robar
  MAIN = 'main', // Acciones del jugador
  CLOSING = 'closing', // Efectos pasivos
}

export enum CardState {
  UNTAPPED = 'untapped', // Enderezada (vertical)
  TAPPED = 'tapped', // Girada (horizontal)
}

export enum CombatType {
  CLASH = 'clash', // El Choque: Ambas cartas se dañan
  AMBUSH = 'ambush', // La Emboscada: Solo atacante daña
  DIRECT = 'direct', // Ataque Directo a Reputación
}

export enum GameEndCondition {
  KNOCKOUT = 'knockout', // Reputación = 0
  HYPE_WIN = 'hype_win', // Hype >= 20
  FORGOTTEN = 'forgotten', // Mazo vacío (se debe robar sin poder)
  DRAW = 'draw', // Empate
}

// ============================================
// ESTRUCTURAS DE JUEGO
// ============================================

export interface PlayedCard {
  cardId: string;
  card: MasterCardTemplate;
  state: CardState;
  currentDef: number; // DEF actual (puede reducirse por daño)
  temporaryBoosts?: {
    atkBonus: number;
    defBonus: number;
    untilEndOfTurn: boolean;
  };
  permanentDiscos?: number; // Discos de Oro (bonificadores permanentes)
  isSilenced?: boolean; // GDD 8: Silenciado
}

export interface PlayerZones {
  deckCount: number; // Cartas restantes en Playlist
  handCount: number; // Cartas en mano
  promotionZone: PlayedCard[]; // Zona de Promoción (Energía boca abajo)
  mainStage: PlayedCard[]; // Escenario (Criaturas)
  backstage: PlayedCard[]; // Backstage (Eventos)
}

export interface PlayerState {
  playerId: string;
  reputation: number; // Vidas base = 30 (GDD 5.1)
  hype: number; // Contador de fama (0-20, GDD 5.2)
  energyCurrent: number;
  energyMax: number;
  zones: PlayerZones;
}

export interface GameState {
  matchId: string;
  turn: number;
  phase: TurnPhase;
  activePlayer: string; // player_A o player_B
  players: {
    player_A: PlayerState;
    player_B: PlayerState;
  };
  isGameOver: boolean;
  winner?: string;
  endCondition?: GameEndCondition;
  pendingReaction?: ReactionState; // Para La Réplica
  history: GameAction[];
  _phaseState?: any;  // ← ESTA LÍNEA DEBE ESTAR

}

export interface ReactionState {
  // GDD 4.2: La Réplica
  attackerId: string;
  targetId: string;
  combatType: CombatType;
  declaredDamage: number;
  defenderId: string;
  remainingTime: number; // En ms
}

export interface GameAction {
  turn: number;
  actor: string;
  action: string;
  details: any;
  timestamp: number;
}

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
    player.zones.mainStage.forEach((card) => {
      card.state = CardState.UNTAPPED;
    });

    // Endrezar Backstage
    player.zones.backstage.forEach((card) => {
      card.state = CardState.UNTAPPED;
    });

    // Endrezar Zona de Promoción (Energía)
    player.zones.promotionZone.forEach((card) => {
      card.state = CardState.UNTAPPED;
    });

    // Restaurar Energía a máximo
    player.energyCurrent = player.energyMax;
  }

  private static drawCard(player: PlayerState): void {
    // GDD 5.3: Si el mazo tiene 0 cartas y se debe robar, pierde por "Olvido"
    if (player.zones.deckCount === 0) {
      // La condición de victoria se chequea después
      return;
    }

    player.zones.deckCount--;
    player.zones.handCount++;

    // En el juego real, el servidor sacará una carta del mazo de Supabase
  }

  private static resolveEndOfTurnEffects(
    player: PlayerState,
    gameState: GameState
  ): void {
    // Resolver efectos que dicen "Al final de tu turno..."
    // Esto se implemente con el Effect Stack

    // GDD 8.2.A: OUTRO - Cuando una carta es destruida
    // Se resuelven cuando la carta va al Archivo
  }
}

// ============================================
// MOTOR DE COMBATE
// ============================================

export class CombatResolver {
  /**
   * GDD 4.3: El Combate Directo (Choque y Emboscada)
   * 
   * Escenario A: El Choque - Ambas cartas se dañan
   * Escenario B: La Emboscada - Solo atacante daña
   * Escenario C: Ataque Directo - Va a la Reputación
   */

  static declareAttack(
    attacker: PlayedCard,
    target: PlayedCard | 'reputation',
    defenderState: PlayerState,
    gameState: GameState
  ): ReactionState | null {
    // Validar que atacante está enderezado
    if (attacker.state === CardState.TAPPED) {
      throw new Error('La carta atacante debe estar enderezada');
    }

    // Validar que atacante no tiene pánico escénico (HASTE lo ignora)
    const hasHaste = attacker.card.ability?.effect === Effect.HASTE;
    if (!hasHaste && gameState.turn === 1) {
      throw new Error('Pánico Escénico: No puedes atacar el mismo turno que invoques');
    }

    // Determinar tipo de combate
    let combatType: CombatType;
    let declaredDamage = attacker.card.atk;

    if (target === 'reputation') {
      combatType = CombatType.DIRECT;
    } else if (target.state === CardState.TAPPED) {
      combatType = CombatType.AMBUSH;
    } else {
      combatType = CombatType.CLASH;
    }

    // GDD 4.1: Girar la carta atacante
    attacker.state = CardState.TAPPED;

    // GDD 4.2: La Réplica - Si el defensor tiene energía residual y la carta está enderezada
    const canReact =
      defenderState.energyCurrent > 0 &&
      combatType !== CombatType.DIRECT &&
      target !== 'reputation' &&
      typeof target !== 'string';

    if (canReact) {
      // Crear estado de reacción pendiente
      return {
        attackerId: attacker.cardId,
        targetId: typeof target === 'string' ? target : target.cardId,
        combatType,
        declaredDamage,
        defenderId: defenderState.playerId,
        remainingTime: 5000, // 5 segundos para reaccionar
      };
    }

    // Sin reacción posible, resolver combate inmediatamente
    this.resolveCombat(attacker, target, combatType, defenderState);

    return null;
  }

  static processReaction(
    reactionState: ReactionState,
    reaction: 'intercept' | 'event' | 'pass',
    defenderState: PlayerState,
    gameState: GameState
  ): void {
    if (reaction === 'pass') {
      // Defensor no reacciona, continuar con daño normal
      const attacker = this.findCardById(
        reactionState.attackerId,
        gameState.players.player_A.zones
      ) ||
        this.findCardById(
          reactionState.attackerId,
          gameState.players.player_B.zones
        );

      const target = this.findCardById(reactionState.targetId, defenderState.zones);

      if (attacker && target) {
        this.resolveCombat(attacker, target, reactionState.combatType, defenderState);
      }
    } else if (reaction === 'intercept') {
      // GDD 4.2: Intercepción - Gastar 1 energía para que salte otra carta
      if (defenderState.energyCurrent < 1) {
        throw new Error('No hay energía disponible');
      }

      defenderState.energyCurrent--;

      // Lógica: Seleccionar otra carta enderezada del defensor
      // que reciba el golpe en lugar del objetivo original
      // Implementado en el frontend (selección de usuario)
    } else if (reaction === 'event') {
      // GDD 4.2: Activar Backstage - Usar habilidad de Evento
      // Implementado según el costo de energía del evento
    }
  }

  private static resolveCombat(
    attacker: PlayedCard,
    target: PlayedCard | 'reputation',
    combatType: CombatType,
    defender: PlayerState
  ): void {
    const attackerDamage = attacker.card.atk;
    let defenderDamage = 0;

    if (combatType === CombatType.DIRECT) {
      // Daño directo a Reputación
      defender.reputation -= attackerDamage;
    } else if (combatType === CombatType.AMBUSH) {
      // La Emboscada: Solo atacante daña
      if (typeof target !== 'string') {
        target.currentDef -= attackerDamage;
        if (target.currentDef <= 0) {
          this.destroyCard(target, defender);
        }
      }
    } else if (combatType === CombatType.CLASH) {
      // El Choque: Ambas se dañan
      if (typeof target !== 'string') {
        const targetDamage = target.card.def;

        // Aplicar daño mutuo
        attacker.currentDef -= targetDamage;
        target.currentDef -= attackerDamage;

        // GDD 4.5: Resolver destrucciones
        if (attacker.currentDef <= 0) {
          // El atacante no se destruye en el choque, solo recibe daño
        }

        if (target.currentDef <= 0) {
          this.destroyCard(target, defender);
        }
      }
    }
  }

  private static destroyCard(card: PlayedCard, owner: PlayerState): void {
    // GDD 4.5: Mover al Archivo
    const index = owner.zones.mainStage.indexOf(card);
    if (index > -1) {
      owner.zones.mainStage.splice(index, 1);
    }

    // Resolver efectos OUTRO (cuando es destruida)
    if (card.card.ability?.trigger === Trigger.OUTRO) {
      // Resolver el efecto
    }

    // En el juego real, la carta va a un array de "Archivo"
  }

  private static findCardById(cardId: string, zones: PlayerZones): PlayedCard | null {
    return (
      zones.mainStage.find((c) => c.cardId === cardId) ||
      zones.backstage.find((c) => c.cardId === cardId) ||
      null
    );
  }
}

// ============================================
// MÁQUINA DE CONDICIONES DE VICTORIA
// ============================================

export class VictoryChecker {
  /**
   * GDD 5: Condiciones de Victoria (La Triple Amenaza)
   * 
   * 1. Knockout / Bancarrota: Reputación = 0
   * 2. Disco de Platino / Hype: Hype >= 20
   * 3. Cancelado / Olvido: Mazo vacío
   */

  static checkVictoryCondition(gameState: GameState): GameEndCondition | null {
    // Chequeo 1: Knockout (GDD 5.1)
    for (const [playerId, playerState] of Object.entries(gameState.players)) {
      if (playerState.reputation <= 0) {
        gameState.isGameOver = true;
        gameState.winner = playerId === 'player_A' ? 'player_B' : 'player_A';
        gameState.endCondition = GameEndCondition.KNOCKOUT;
        return GameEndCondition.KNOCKOUT;
      }
    }

    // Chequeo 2: Hype Win (GDD 5.2)
    for (const [playerId, playerState] of Object.entries(gameState.players)) {
      if (playerState.hype >= 20) {
        gameState.isGameOver = true;
        gameState.winner = playerId;
        gameState.endCondition = GameEndCondition.HYPE_WIN;
        return GameEndCondition.HYPE_WIN;
      }
    }

    // Chequeo 3: Olvido (GDD 5.3)
    // Se activa cuando se intenta robar y el mazo está vacío
    // Esto ocurre en el TurnManager.drawCard()

    // Chequeo de Empate (GDD 5.4)
    // Si ambos pierden simultáneamente
    const playerADead = gameState.players.player_A.reputation <= 0;
    const playerBDead = gameState.players.player_B.reputation <= 0;

    if (playerADead && playerBDead) {
      gameState.isGameOver = true;
      gameState.endCondition = GameEndCondition.DRAW;
      return GameEndCondition.DRAW;
    }

    return null;
  }

  static checkForgettenCondition(gameState: GameState): boolean {
    // Cuando un jugador debe robar y su mazo está vacío (GDD 5.3)
    // Retorna true si alguien ha perdido por Olvido
    return false; // Se implementa en el contexto específico del robo
  }
}

// ============================================
// INICIALIZADOR DE PARTIDA
// ============================================

export function initializeGameState(
  player_A: string,
  player_B: string,
  player_A_Deck: MasterCardTemplate[],
  player_B_Deck: MasterCardTemplate[]
): GameState {
  return {
    matchId: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    turn: 1,
    phase: TurnPhase.OPENING,
    activePlayer: 'player_A',
    players: {
      player_A: {
        playerId: player_A,
        reputation: 30,
        hype: 0,
        energyCurrent: 1,
        energyMax: 1,
        zones: {
          deckCount: player_A_Deck.length,
          handCount: 5,
          promotionZone: [],
          mainStage: [],
          backstage: [],
        },
      },
      player_B: {
        playerId: player_B,
        reputation: 30,
        hype: 0,
        energyCurrent: 1,
        energyMax: 1,
        zones: {
          deckCount: player_B_Deck.length,
          handCount: 5,
          promotionZone: [],
          mainStage: [],
          backstage: [],
        },
      },
    },
    isGameOver: false,
    history: [],
    _phaseState: {  // AGREGAR ESTO
      currentPhase: DetailedPhase.START_BEGINNING_EFFECTS,
      mainPhaseCount: 0,
      declaredAttackers: [],
      isWaitingForOpponent: false,
      pendingValidation: false,
    },
  };
}