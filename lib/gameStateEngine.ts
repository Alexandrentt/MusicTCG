/**
 * MOTOR DE FASES DEL TURNO - MusicTCG
 * gameStateEngine.ts (NUEVO ARCHIVO)
 * 
 * Máquina de estados que gestiona:
 * 1. Las 5 fases del turno
 * 2. Qué acciones son válidas en cada fase
 * 3. Transiciones entre fases
 * 4. Validación de estado del juego
 * 
 * Este archivo REEMPLAZA y expande la lógica básica de TurnManager en combatSystem.ts
 * combatSystem.ts ahora solo gestiona COMBATE, este archivo gestiona TODO el turno
 */

import { GameState, TurnPhase, PlayerState, PlayedCard, CardState } from '../types/types';
// ============================================
// ENUMS PARA FASES DETALLADAS
// ============================================

export enum DetailedPhase {
    // Fase de Inicio
    START_BEGINNING_EFFECTS = 'start_beginning_effects', // Resolver "Al inicio"
    START_UNTAP = 'start_untap', // Endrezar cartas
    START_ENERGY_GENERATION = 'start_energy_generation', // Generar energía

    // Fase de Robo
    DRAW_DRAW_CARD = 'draw_draw_card', // Sacar 1 carta

    // Fase Principal (puede repetirse)
    MAIN_PLAY_CARDS = 'main_play_cards', // Invocar cartas
    MAIN_ACTIVATE_ABILITIES = 'main_activate_abilities', // Activar habilidades
    MAIN_DECLARE_ATTACKERS = 'main_declare_attackers', // Declarar atacantes

    // Fase de Combate
    COMBAT_RESOLVE_ATTACKS = 'combat_resolve_attacks', // Resolver daño
    COMBAT_PROCESS_REACTIONS = 'combat_process_reactions', // La Réplica

    // Fase Final
    END_CLEANUP = 'end_cleanup', // Destruir cartas, resolver efectos
    END_PASS_TURN = 'end_pass_turn', // Pasar turno
}

// ============================================
// VALIDACIÓN DE ACCIONES
// ============================================

export enum ValidAction {
    // Acciones de Fase Principal
    PLAY_CARD = 'play_card',
    PROMOTE_CARD = 'promote_card',
    ACTIVATE_ABILITY = 'activate_ability',

    // Acciones de Combate
    DECLARE_ATTACKER = 'declare_attacker',
    DECLARE_BLOCKER = 'declare_blocker',
    RESOLVE_COMBAT = 'resolve_combat',

    // Acciones generales
    PASS_PHASE = 'pass_phase',
    UNDO_ACTION = 'undo_action',

    // Reacciones
    PROCESS_REACTION = 'process_reaction',
}

// ============================================
// RESULTADO DE VALIDACIÓN
// ============================================

export interface ActionValidation {
    valid: boolean;
    reason?: string;
    allowedActions: ValidAction[];
    currentPhase: DetailedPhase;
    canPassPhase: boolean;
}

// ============================================
// ESTADO DE LA FASE ACTUAL
// ============================================

// AGREGAR ANTES de "export class GameStateEngine"

export interface PhaseState {
    currentPhase: DetailedPhase;
    mainPhaseCount: number;
    declaredAttackers: string[];
    currentAction?: {
        action: ValidAction;
        data: any;
        timestamp: number;
    };
    isWaitingForOpponent: boolean;
    pendingValidation: boolean;
}

// ============================================
// MOTOR PRINCIPAL - MÁQUINA DE ESTADOS
// ============================================

export class GameStateEngine {
    /**
     * Núcleo de la máquina de estados del juego
     * Garantiza que SOLO acciones válidas puedan ejecutarse
     */

    static validateAction(
        gameState: GameState,
        action: ValidAction,
        actorId: string,
        actionData?: any
    ): ActionValidation {
        const activePlayer = this.getActivePlayer(gameState);
        const phaseState = this.getPhaseState(gameState);

        // Validación básica
        if (activePlayer.playerId !== actorId) {
            return {
                valid: false,
                reason: 'No es tu turno',
                allowedActions: [],
                currentPhase: phaseState.currentPhase,
                canPassPhase: false,
            };
        }

        // Validar acción según fase actual
        const validation = this.validateActionForPhase(
            action,
            phaseState.currentPhase,
            gameState,
            actionData
        );

        return validation;
    }

    /**
     * GDD 4.1: Flujo de turnos
     * APERTURA → ROBO → PRINCIPAL → COMBATE → CIERRE
     */
    private static validateActionForPhase(
        action: ValidAction,
        phase: DetailedPhase,
        gameState: GameState,
        actionData?: any
    ): ActionValidation {
        const allowedActions: ValidAction[] = [];
        const activePlayer = this.getActivePlayer(gameState);

        switch (phase) {
            // ==================
            // FASE DE INICIO
            // ==================
            case DetailedPhase.START_BEGINNING_EFFECTS:
                allowedActions.push(ValidAction.PASS_PHASE);
                return {
                    valid: action === ValidAction.PASS_PHASE,
                    reason:
                        action !== ValidAction.PASS_PHASE
                            ? 'En esta fase solo puedes pasar'
                            : undefined,
                    allowedActions,
                    currentPhase: phase,
                    canPassPhase: true,
                };

            case DetailedPhase.START_UNTAP:
                allowedActions.push(ValidAction.PASS_PHASE);
                return {
                    valid: action === ValidAction.PASS_PHASE,
                    reason:
                        action !== ValidAction.PASS_PHASE
                            ? 'En esta fase solo puedes pasar'
                            : undefined,
                    allowedActions,
                    currentPhase: phase,
                    canPassPhase: true,
                };

            case DetailedPhase.START_ENERGY_GENERATION:
                allowedActions.push(ValidAction.PASS_PHASE);
                return {
                    valid: action === ValidAction.PASS_PHASE,
                    reason:
                        action !== ValidAction.PASS_PHASE
                            ? 'En esta fase solo puedes pasar'
                            : undefined,
                    allowedActions,
                    currentPhase: phase,
                    canPassPhase: true,
                };

            // ==================
            // FASE DE ROBO
            // ==================
            case DetailedPhase.DRAW_DRAW_CARD:
                allowedActions.push(ValidAction.PASS_PHASE);
                return {
                    valid: action === ValidAction.PASS_PHASE,
                    reason:
                        action !== ValidAction.PASS_PHASE
                            ? 'Debes robar una carta'
                            : undefined,
                    allowedActions,
                    currentPhase: phase,
                    canPassPhase: false,
                };

            // ==================
            // FASE PRINCIPAL
            // ==================
            case DetailedPhase.MAIN_PLAY_CARDS:
                allowedActions.push(
                    ValidAction.PLAY_CARD,
                    ValidAction.PROMOTE_CARD,
                    ValidAction.ACTIVATE_ABILITY,
                    ValidAction.DECLARE_ATTACKER,
                    ValidAction.PASS_PHASE,
                    ValidAction.UNDO_ACTION
                );

                // Validar específicamente cada acción
                if (action === ValidAction.PLAY_CARD) {
                    return this.validatePlayCard(gameState, actionData);
                } else if (action === ValidAction.PROMOTE_CARD) {
                    return this.validatePromoteCard(gameState, actionData);
                } else if (action === ValidAction.ACTIVATE_ABILITY) {
                    return this.validateActivateAbility(gameState, actionData);
                } else if (action === ValidAction.DECLARE_ATTACKER) {
                    return this.validateDeclareAttacker(gameState, actionData);
                }

                return {
                    valid: allowedActions.includes(action),
                    reason:
                        !allowedActions.includes(action)
                            ? `Acción no permitida en esta fase`
                            : undefined,
                    allowedActions,
                    currentPhase: phase,
                    canPassPhase: true,
                };

            // ==================
            // FASE DE COMBATE
            // ==================
            case DetailedPhase.COMBAT_RESOLVE_ATTACKS:
                allowedActions.push(ValidAction.RESOLVE_COMBAT, ValidAction.PASS_PHASE);

                if (action === ValidAction.RESOLVE_COMBAT) {
                    // Validar que hay atacantes declarados
                    const phaseState = this.getPhaseState(gameState);
                    if (phaseState.declaredAttackers.length === 0) {
                        return {
                            valid: false,
                            reason: 'No hay atacantes declarados',
                            allowedActions,
                            currentPhase: phase,
                            canPassPhase: true,
                        };
                    }
                }

                return {
                    valid: allowedActions.includes(action),
                    reason:
                        !allowedActions.includes(action)
                            ? `Acción no permitida en esta fase`
                            : undefined,
                    allowedActions,
                    currentPhase: phase,
                    canPassPhase: true,
                };

            case DetailedPhase.COMBAT_PROCESS_REACTIONS:
                allowedActions.push(
                    ValidAction.PROCESS_REACTION,
                    ValidAction.PASS_PHASE
                );

                return {
                    valid: allowedActions.includes(action),
                    reason:
                        !allowedActions.includes(action)
                            ? `Debes procesar la reacción o pasar`
                            : undefined,
                    allowedActions,
                    currentPhase: phase,
                    canPassPhase: true,
                };

            // ==================
            // FASE FINAL
            // ==================
            case DetailedPhase.END_CLEANUP:
                allowedActions.push(ValidAction.PASS_PHASE);
                return {
                    valid: action === ValidAction.PASS_PHASE,
                    reason:
                        action !== ValidAction.PASS_PHASE
                            ? 'En esta fase solo puedes pasar'
                            : undefined,
                    allowedActions,
                    currentPhase: phase,
                    canPassPhase: false,
                };

            case DetailedPhase.END_PASS_TURN:
                allowedActions.push(ValidAction.PASS_PHASE);
                return {
                    valid: action === ValidAction.PASS_PHASE,
                    reason:
                        action !== ValidAction.PASS_PHASE
                            ? 'Debes pasar el turno'
                            : undefined,
                    allowedActions,
                    currentPhase: phase,
                    canPassPhase: false,
                };

            default:
                return {
                    valid: false,
                    reason: 'Fase desconocida',
                    allowedActions: [],
                    currentPhase: phase,
                    canPassPhase: false,
                };
        }
    }

    // ============================================
    // VALIDACIONES ESPECÍFICAS DE ACCIONES
    // ============================================

    /**
     * GDD 4.1: Validar invocar una carta
     * - Debe tener suficiente energía
     * - Debe estar en la mano
     * - Debe cumplir requisitos (ej: no puede atacar turno de invocación)
     */
    private static validatePlayCard(
        gameState: GameState,
        actionData: { cardId: string }
    ): ActionValidation {
        const activePlayer = this.getActivePlayer(gameState);

        if (!actionData?.cardId) {
            return {
                valid: false,
                reason: 'ID de carta requerido',
                allowedActions: [ValidAction.PLAY_CARD, ValidAction.PASS_PHASE],
                currentPhase: DetailedPhase.MAIN_PLAY_CARDS,
                canPassPhase: true,
            };
        }

        // Buscar la carta en la mano
        // En la vida real, esto sería más complejo
        // Por ahora, asumir que existe

        return {
            valid: true,
            allowedActions: [ValidAction.PLAY_CARD, ValidAction.PASS_PHASE],
            currentPhase: DetailedPhase.MAIN_PLAY_CARDS,
            canPassPhase: true,
        };
    }

    /**
     * GDD 4.1: Validar promoción (sacrificar para energía)
     * - Máximo 1 por turno
     * - Solo en fase principal
     */
    private static validatePromoteCard(
        gameState: GameState,
        actionData: { cardId: string }
    ): ActionValidation {
        const phaseState = this.getPhaseState(gameState);

        // En el juego real, chequear si ya promovió
        // Por ahora, asumir que es válido

        return {
            valid: true,
            allowedActions: [ValidAction.PLAY_CARD, ValidAction.PASS_PHASE],
            currentPhase: DetailedPhase.MAIN_PLAY_CARDS,
            canPassPhase: true,
        };
    }

    /**
     * Validar activación de habilidades
     * - Debe tener energía suficiente
     * - Debe ser una habilidad activable (Solo)
     */
    private static validateActivateAbility(
        gameState: GameState,
        actionData: { cardId: string; abilityId: string }
    ): ActionValidation {
        return {
            valid: true,
            allowedActions: [ValidAction.PLAY_CARD, ValidAction.PASS_PHASE],
            currentPhase: DetailedPhase.MAIN_PLAY_CARDS,
            canPassPhase: true,
        };
    }

    /**
     * GDD 4.3: Validar declarar atacante
     * - Carta debe estar enderezada
     * - No debe ser primera vez en el Escenario (Pánico Escénico)
     * - Debe cumplir requisitos de ataque (no bloqueada por Provocar)
     */
    private static validateDeclareAttacker(
        gameState: GameState,
        actionData: { cardId: string; targetId: string }
    ): ActionValidation {
        if (!actionData?.cardId || !actionData?.targetId) {
            return {
                valid: false,
                reason: 'ID de atacante y objetivo requeridos',
                allowedActions: [ValidAction.DECLARE_ATTACKER, ValidAction.PASS_PHASE],
                currentPhase: DetailedPhase.MAIN_PLAY_CARDS,
                canPassPhase: true,
            };
        }

        return {
            valid: true,
            allowedActions: [ValidAction.DECLARE_ATTACKER, ValidAction.PASS_PHASE],
            currentPhase: DetailedPhase.MAIN_PLAY_CARDS,
            canPassPhase: true,
        };
    }

    // ============================================
    // TRANSICIONES DE FASES
    // ============================================

    /**
     * GDD 4.1: Transicionar a la siguiente fase
     * Apertura → Robo → Principal → Combate → Cierre → (siguiente turno)
     */
    static transitionToNextPhase(gameState: GameState): GameState {
        const phaseState = this.getPhaseState(gameState);

        let nextPhase: DetailedPhase;

        switch (phaseState.currentPhase) {
            case DetailedPhase.START_BEGINNING_EFFECTS:
                nextPhase = DetailedPhase.START_UNTAP;
                break;

            case DetailedPhase.START_UNTAP:
                nextPhase = DetailedPhase.START_ENERGY_GENERATION;
                break;

            case DetailedPhase.START_ENERGY_GENERATION:
                nextPhase = DetailedPhase.DRAW_DRAW_CARD;
                break;

            case DetailedPhase.DRAW_DRAW_CARD:
                nextPhase = DetailedPhase.MAIN_PLAY_CARDS;
                break;

            case DetailedPhase.MAIN_PLAY_CARDS:
                nextPhase = DetailedPhase.COMBAT_RESOLVE_ATTACKS;
                break;

            case DetailedPhase.COMBAT_RESOLVE_ATTACKS:
                nextPhase = DetailedPhase.COMBAT_PROCESS_REACTIONS;
                break;

            case DetailedPhase.COMBAT_PROCESS_REACTIONS:
                nextPhase = DetailedPhase.END_CLEANUP;
                break;

            case DetailedPhase.END_CLEANUP:
                nextPhase = DetailedPhase.END_PASS_TURN;
                break;

            case DetailedPhase.END_PASS_TURN:
                // Cambiar jugador activo y reiniciar turno
                gameState.activePlayer =
                    gameState.activePlayer === 'player_A' ? 'player_B' : 'player_A';
                gameState.turn++;
                nextPhase = DetailedPhase.START_BEGINNING_EFFECTS;
                break;

            default:
                nextPhase = DetailedPhase.START_BEGINNING_EFFECTS;
        }

        this.setPhaseState(gameState, { ...phaseState, currentPhase: nextPhase });

        return gameState;
    }

    /**
     * Permitir saltar de MAIN a COMBATE o de COMBATE a MAIN
     */
    static transitionToCombatPhase(gameState: GameState): GameState {
        const phaseState = this.getPhaseState(gameState);

        if (phaseState.currentPhase === DetailedPhase.MAIN_PLAY_CARDS) {
            this.setPhaseState(gameState, {
                ...phaseState,
                currentPhase: DetailedPhase.COMBAT_RESOLVE_ATTACKS,
            });
        }

        return gameState;
    }

    static transitionBackToMain(gameState: GameState): GameState {
        const phaseState = this.getPhaseState(gameState);

        if (phaseState.currentPhase === DetailedPhase.COMBAT_RESOLVE_ATTACKS) {
            this.setPhaseState(gameState, {
                ...phaseState,
                currentPhase: DetailedPhase.MAIN_PLAY_CARDS,
                mainPhaseCount: phaseState.mainPhaseCount + 1,
            });
        }

        return gameState;
    }

    // ============================================
    // HELPERS
    // ============================================

    private static getActivePlayer(gameState: GameState): PlayerState {
        return gameState.players[gameState.activePlayer as 'player_A' | 'player_B'];
    }

    private static getPhaseState(gameState: GameState): PhaseState {
        // En la vida real, esto vendría de una tabla de Supabase
        // Por ahora, extraer del GameState o crear default
        return {
            currentPhase: DetailedPhase.START_BEGINNING_EFFECTS,
            mainPhaseCount: 0,
            declaredAttackers: [],
            isWaitingForOpponent: false,
            pendingValidation: false,
        };
    }

    private static setPhaseState(gameState: GameState, phaseState: PhaseState): void {
        // En la vida real, guardar en Supabase
        // Por ahora, simplemente actualizar en memoria
        (gameState as any)._phaseState = phaseState;
    }

    /**
     * Obtener todas las acciones permitidas en el estado actual
     */
    static getAllowedActions(gameState: GameState): ValidAction[] {
        const phaseState = this.getPhaseState(gameState);
        const activePlayer = this.getActivePlayer(gameState);
        const validation = this.validateAction(
            gameState,
            ValidAction.PLAY_CARD,
            activePlayer.playerId
        );

        return validation.allowedActions;
    }

    /**
     * Verificar si el jugador puede pasar la fase actual
     */
    static canPassPhase(gameState: GameState): boolean {
        const phaseState = this.getPhaseState(gameState);
        const validation = this.validateAction(
            gameState,
            ValidAction.PASS_PHASE,
            this.getActivePlayer(gameState).playerId
        );

        return validation.canPassPhase;
    }

    /**
     * Resolver efectos de "Al inicio de tu turno"
     */
    static resolveBeginningEffects(gameState: GameState): void {
        // Implementar según GDD 8: Efectos con Trigger = "aura"
        // Buscar cartas con trigger AURA en el Escenario del jugador activo
    }

    /**
     * GDD 4.1: Generar energía según número de turno
     * Turno 1 = 1 energía
     * Turno 2 = 2 energía
     * ... hasta 10 máximo
     */
    static generateEnergy(gameState: GameState): void {
        const activePlayer = this.getActivePlayer(gameState);
        const energyGenerated = Math.min(gameState.turn, 10);

        activePlayer.energyMax = energyGenerated;
        activePlayer.energyCurrent = energyGenerated;
    }

    /**
     * GDD 4.1: Robar 1 carta del mazo
     */
    static drawCard(gameState: GameState): boolean {
        const activePlayer = this.getActivePlayer(gameState);

        // GDD 5.3: Si el mazo está vacío, pierde por "Olvido"
        if (activePlayer.zones.deckCount <= 0) {
            return false; // Pérdida por Olvido
        }

        activePlayer.zones.deckCount--;
        activePlayer.zones.handCount++;

        return true;
    }
}

export default GameStateEngine;