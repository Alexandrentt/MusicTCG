/**
 * GESTOR DE FASES ESPECÍFICAS - MusicTCG
 * turnPhaseManager.ts (NUEVO ARCHIVO)
 * 
 * Ejecuta la lógica específica de cada fase del turno
 * Este archivo COMPLEMENTA a gameStateEngine.ts
 * 
 * gameStateEngine.ts = Validación + Transiciones
 * turnPhaseManager.ts = Ejecución + Lógica de fase
 */

import { GameState, PlayedCard, CardState, PlayerState, Trigger, Effect } from '../types/types';
import { GameStateEngine, DetailedPhase, PhaseState } from './gameStateEngine';
import { CombatResolver } from './combatSystem';

// ============================================
// RESULTADO DE EJECUCIÓN DE FASE
// ============================================

export interface PhaseExecutionResult {
    success: boolean;
    error?: string;
    gameState: GameState;
    phaseLogs: string[]; // Para debugging
}

// ============================================
// EJECUTOR DE FASES
// ============================================

export class TurnPhaseManager {
    /**
     * Ejecutor principal de fases
     * Cuando un jugador pasa una fase, esta función ejecuta la lógica
     */

    static executeTurnPhase(
        gameState: GameState,
        phase: DetailedPhase
    ): PhaseExecutionResult {
        const logs: string[] = [];

        try {
            const activePlayer = this.getActivePlayer(gameState);

            switch (phase) {
                // ==================
                // FASE DE INICIO
                // ==================
                case DetailedPhase.START_BEGINNING_EFFECTS:
                    logs.push('🎬 Fase de Inicio: Resolviendo efectos...');
                    this.resolveBeginningEffects(gameState, logs);
                    break;

                case DetailedPhase.START_UNTAP:
                    logs.push('🔄 Enderezando cartas...');
                    this.untapAllCards(activePlayer, logs);
                    break;

                case DetailedPhase.START_ENERGY_GENERATION:
                    logs.push('⚡ Generando energía...');
                    GameStateEngine.generateEnergy(gameState);
                    logs.push(
                        `   → ${activePlayer.playerId} recibe ${activePlayer.energy.max} de energía`
                    );
                    break;

                // ==================
                // FASE DE ROBO
                // ==================
                case DetailedPhase.DRAW_DRAW_CARD:
                    logs.push('🎴 Robando carta...');
                    const drawSuccess = GameStateEngine.drawCard(gameState);
                    if (!drawSuccess) {
                        logs.push('   ⚠️ ¡Mazo vacío! Victoria por Olvido');
                        return {
                            success: false,
                            error: 'Mazo vacío - Derrota por Olvido',
                            gameState,
                            phaseLogs: logs,
                        };
                    }
                    logs.push(
                        `   → ${activePlayer.playerId} robó 1 carta. Mano: ${activePlayer.zones.handCount}`
                    );
                    break;

                // ==================
                // FASE PRINCIPAL
                // ==================
                case DetailedPhase.MAIN_PLAY_CARDS:
                    logs.push('🎭 Fase Principal iniciada');
                    logs.push(
                        `   → Energía disponible: ${activePlayer.energy.current} / ${activePlayer.energy.max}`
                    );
                    logs.push(`   → Cartas en mano: ${activePlayer.zones.handCount}`);
                    // No hay lógica automática, el jugador elige acciones
                    break;

                case DetailedPhase.MAIN_ACTIVATE_ABILITIES:
                    logs.push('✨ Activando habilidades...');
                    // Lógica para habilidades activables
                    break;

                case DetailedPhase.MAIN_DECLARE_ATTACKERS:
                    logs.push('⚔️  Declarando atacantes...');
                    // Los atacantes ya fueron declarados en MAIN_PLAY_CARDS
                    const declaredCount = gameState._phaseState?.declaredAttackers?.length || 0;
                    logs.push(`   → ${declaredCount} atacante(s) declarado(s)`);
                    break;

                // ==================
                // FASE DE COMBATE
                // ==================
                case DetailedPhase.COMBAT_RESOLVE_ATTACKS:
                    logs.push('⚔️  Resolviendo combate...');
                    const combatLogs = this.resolveCombat(gameState);
                    logs.push(...combatLogs);
                    break;

                case DetailedPhase.COMBAT_PROCESS_REACTIONS:
                    logs.push('🛡️  Procesando reacciones...');
                    if (gameState.pendingReaction) {
                        logs.push(
                            `   → Hay una reacción pendiente de ${gameState.pendingReaction.defenderId}`
                        );
                        logs.push(`   → Tiempo restante: ${gameState.pendingReaction.remainingTime}ms`);
                    } else {
                        logs.push('   → Sin reacciones pendientes');
                    }
                    break;

                // ==================
                // FASE FINAL
                // ==================
                case DetailedPhase.END_CLEANUP:
                    logs.push('🧹 Limpieza de fin de turno...');
                    const cleanupLogs = this.cleanupEndOfTurn(gameState);
                    logs.push(...cleanupLogs);
                    break;

                case DetailedPhase.END_PASS_TURN:
                    logs.push('➡️  Pasando turno al rival...');
                    const nextPlayer =
                        gameState.activePlayer === 'player_A' ? 'player_B' : 'player_A';
                    logs.push(`   → Turno ${gameState.turn + 1} para ${nextPlayer}`);
                    break;

                default:
                    return {
                        success: false,
                        error: `Fase desconocida: ${phase}`,
                        gameState,
                        phaseLogs: logs,
                    };
            }

            return {
                success: true,
                gameState,
                phaseLogs: logs,
            };
        } catch (error) {
            return {
                success: false,
                error: (error as Error).message,
                gameState,
                phaseLogs: logs,
            };
        }
    }

    // ============================================
    // LÓGICA DE FASES ESPECÍFICAS
    // ============================================

    /**
     * FASE INICIO: Resolver efectos "Al inicio de tu turno"
     * GDD 8.2.A: Trigger = AURA
     */
    private static resolveBeginningEffects(
        gameState: GameState,
        logs: string[]
    ): void {
        const activePlayer = this.getActivePlayer(gameState);

        // Buscar cartas en el Tablero con trigger AURA
        const auraCards = activePlayer.zones.board.filter(
            (card) => card.abilities.some(a => a.trigger === Trigger.AURA)
        );

        if (auraCards.length === 0) {
            logs.push('   → Sin efectos de aura');
            return;
        }

        logs.push(`   → ${auraCards.length} efecto(s) de aura resuelto(s)`);

        for (const card of auraCards) {
            const firstAura = card.abilities.find(a => a.trigger === Trigger.AURA);
            if (firstAura) {
                logs.push(
                    `   • ${card.name}: ${firstAura.text.substring(0, 50)}...`
                );

                // En la vida real, ejecutar el efecto según Effect
                this.resolveAbilityEffect(gameState, card, logs);
            }
        }
    }

    /**
     * FASE INICIO: Endrezar todas las cartas giradas
     */
    private static untapAllCards(player: PlayerState, logs: string[]): void {
        let untappedCount = 0;

        // Tablero
        player.zones.board.forEach((card) => {
            if (card.isTapped) {
                card.isTapped = false;
                untappedCount++;
            }
            if (card.isTapped90) {
                card.isTapped90 = false;
                untappedCount++;
            }
        });

        // Backstage
        player.zones.backstage.forEach((card) => {
            if (card.isTapped) {
                card.isTapped = false;
                untappedCount++;
            }
        });

        logs.push(`   → ${untappedCount} carta(s) enderezada(s)`);
    }

    /**
     * FASE COMBATE: Resolver todos los ataques declarados
     */
    private static resolveCombat(gameState: GameState): string[] {
        const logs: string[] = [];
        const phaseState = gameState._phaseState as PhaseState;
        const activePlayer = this.getActivePlayer(gameState);
        const inactivePlayer =
            gameState.activePlayer === 'player_A'
                ? gameState.players.player_B
                : gameState.players.player_A;

        if (!phaseState.declaredAttackers || phaseState.declaredAttackers.length === 0) {
            logs.push('   → Sin atacantes declarados');
            return logs;
        }

        logs.push(`   → Resolviendo ${phaseState.declaredAttackers.length} ataque(s)`);

        for (const attackerId of phaseState.declaredAttackers) {
            const attacker = this.findCardById(activePlayer, attackerId);

            if (!attacker) {
                logs.push(`   ⚠️  Atacante ${attackerId} no encontrado`);
                continue;
            }

            logs.push(`   ⚔️  ${attacker.name} (${attacker.atk} ATK)`);

            // El atacante entra en estado Girado
            attacker.isTapped = true;

            // Aquí se llamaría a CombatResolver.declareAttack()
            // que genera la pendingReaction si es necesario
        }

        // Limpiar atacantes declarados
        phaseState.declaredAttackers = [];

        return logs;
    }

    /**
     * FASE FINAL: Limpiar el estado del turno
     * - Destruir cartas con DEF <= 0
     * - Resolver efectos pasivos "Al final de tu turno"
     * - Limpiar bonificadores temporales
     */
    private static cleanupEndOfTurn(gameState: GameState): string[] {
        const logs: string[] = [];
        const activePlayer = this.getActivePlayer(gameState);
        const cardsToDestroy: PlayedCard[] = [];

        // Buscar cartas destruidas (DEF <= 0)
        activePlayer.zones.board.forEach((card: PlayedCard) => {
            if (card.currentDef <= 0) {
                cardsToDestroy.push(card);
                logs.push(`   💀 ${card.name} destruida (DEF: ${card.currentDef})`);
            }
        });

        // Mover cartas destruidas al Archivo
        cardsToDestroy.forEach((card) => {
            const index = activePlayer.zones.board.indexOf(card);
            if (index > -1) {
                activePlayer.zones.board.splice(index, 1);
                // En la vida real, agregar al Archivo (Cementerio)
            }
        });

        logs.push(
            `   🪦 ${cardsToDestroy.length} carta(s) movida(s) al Archivo`
        );

        // Resolver efectos de fin de turno
        const outroCards = activePlayer.zones.board.filter(
            (card) => card.abilities.some(a => a.trigger === Trigger.OUTRO)
        );

        if (outroCards.length > 0) {
            logs.push(`   🔚 Resolviendo ${outroCards.length} efecto(s) de salida`);
            // Los efectos OUTRO se resuelven cuando la carta ES destruida, no al final de turno
        }

        // Limpiar bonificadores temporales
        let cleanedBoosts = 0;
        activePlayer.zones.board.forEach((card: PlayedCard) => {
            if (card.temporaryBoosts?.untilEndOfTurn) {
                card.temporaryBoosts = undefined;
                cleanedBoosts++;
            }
        });

        if (cleanedBoosts > 0) {
            logs.push(`   ✨ ${cleanedBoosts} bonificador(es) temporal(es) expirado(s)`);
        }

        return logs;
    }

    private static resolveAbilityEffect(gameState: GameState, card: PlayedCard, logs: string[]): void {

        if (card.abilities.length === 0) return;

        const ability = card.abilities[0]; // Simplificación
        const effect = ability.effect;

        // Aquí iría la lógica específica para cada Effect
        // Por ahora, solo logging

        switch (effect) {
            case Effect.DAMAGE:
                logs.push(`      → Daño: ${ability.value}`);
                break;

            case Effect.HEAL:
                logs.push(`      → Curación: ${ability.value}`);
                break;

            case Effect.HYPE:
                logs.push(`      → Hype: +${ability.value}`);
                break;

            case Effect.DRAW:
                logs.push(`      → Robar: ${ability.value} carta(s)`);
                break;

            default:
                logs.push(`      → Efecto: ${effect}`);
        }
    }

    // ============================================
    // ACCIONES DEL JUGADOR DURANTE PHASE PRINCIPAL
    // ============================================

    /**
     * Jugar una carta desde la mano
     */
    static playCard(
        gameState: GameState,
        cardId: string,
        targetId?: string
    ): PhaseExecutionResult {
        const activePlayer = this.getActivePlayer(gameState);
        const logs: string[] = [];

        // Buscar carta en la mano
        // En la vida real, consultaría el inventario de Supabase
        // Por ahora, asumir que existe

        logs.push(`🃏 Jugando carta ${cardId}`);
        logs.push(`   → Energía gastada`);

        return {
            success: true,
            gameState,
            phaseLogs: logs,
        };
    }

    /**
     * Sacrificar una carta para generar energía
     */
    static promoteCard(gameState: GameState, cardId: string): PhaseExecutionResult {
        const activePlayer = this.getActivePlayer(gameState);
        const logs: string[] = [];

        logs.push(`📤 Sacrificando carta para energía`);

        activePlayer.energy.max += 1;
        activePlayer.energy.current += 1;

        logs.push(`   → Energía máxima ahora: ${activePlayer.energy.max}`);

        return {
            success: true,
            gameState,
            phaseLogs: logs,
        };
    }

    /**
     * Declarar una carta como atacante
     */
    static declareAttacker(
        gameState: GameState,
        cardId: string,
        targetId: string
    ): PhaseExecutionResult {
        const phaseState = gameState._phaseState as PhaseState;
        const logs: string[] = [];

        // Buscar la carta
        const activePlayer = this.getActivePlayer(gameState);
        const card = this.findCardById(activePlayer, cardId);

        if (!card) {
            return {
                success: false,
                error: `Carta ${cardId} no encontrada`,
                gameState,
                phaseLogs: logs,
            };
        }

        if (card.isTapped) {
            return {
                success: false,
                error: `${card.name} está girada, no puede atacar`,
                gameState,
                phaseLogs: logs,
            };
        }

        // Agregar a atacantes declarados
        if (!phaseState.declaredAttackers) {
            phaseState.declaredAttackers = [];
        }

        phaseState.declaredAttackers.push(cardId);

        logs.push(`⚔️  ${card.name} declarada como atacante`);
        logs.push(`   → Objetivo: ${targetId}`);
        logs.push(
            `   → Atacantes declarados: ${phaseState.declaredAttackers.length}`
        );

        return {
            success: true,
            gameState,
            phaseLogs: logs,
        };
    }

    // ============================================
    // HELPERS
    // ============================================

    private static getActivePlayer(gameState: GameState): PlayerState {
        return gameState.players[gameState.activePlayer as 'player_A' | 'player_B'];
    }

    private static findCardById(
        player: PlayerState,
        cardId: string
    ): PlayedCard | null {
        return (
            player.zones.board.find((c: PlayedCard) =>
                c.id === cardId || c.instanceId === cardId) ||
            player.zones.backstage.find((c) => c.id === cardId || c.instanceId === cardId) ||
            null
        );
    }
}

export default TurnPhaseManager;