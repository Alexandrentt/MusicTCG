import { GameState, PlayerState, Card, GameEndCondition, TurnPhase } from '../../types/types';

/**
 * SISTEMA DE SACRIFICIO (ENERGY RAMP) - MusicTCG
 * 
 * Permite a los jugadores convertir cartas de su mano en energía máxima permanente.
 * Regla Core: 1 sacrificio por turno durante la Fase Principal.
 */

/**
 * Calcula la energía total disponible para un jugador
 */
export function calculatePlayerEnergy(player: PlayerState): number {
    // Energía = Base del turno + Bonificador por sacrificios permanentes
    return (player.energy.basePerTurn || 0) + (player.energy.permanentFromSacrifices || 0);
}

/**
 * Ejecuta el sacrificio de una carta de la mano
 */
export function sacrificeCardForEnergy(
    gameState: GameState,
    playerId: 'player_A' | 'player_B',
    cardId: string
): GameState {
    const player = gameState.players[playerId];
    const isYourTurn = gameState.activePlayer === playerId;
    const phase = gameState.phase;

    // 1. VALIDACIONES
    if (!isYourTurn) {
        throw new Error("No es tu turno");
    }

    if (phase !== TurnPhase.MAIN) {
        throw new Error("Solo puedes sacrificar cartas durante la Fase Principal");
    }

    if (player.energy.sacrificesThisTurn >= 1) {
        throw new Error("Ya has realizado un sacrificio este turno (Límite: 1)");
    }

    // 2. BUSCAR CARTA EN MANO
    const cardIndex = player.zones.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
        throw new Error(`La carta con ID ${cardId} no está en tu mano`);
    }

    const card = player.zones.hand[cardIndex];

    // 3. EJECUTAR SACRIFICIO
    // Remover de la mano
    player.zones.hand.splice(cardIndex, 1);
    player.zones.handCount = player.zones.hand.length;

    // Inicializar energyZone si no existe (seguridad)
    if (!player.zones.energyZone) {
        player.zones.energyZone = { cards: [], currentCount: 0 };
    }

    // Agregar a la Zona de Energía
    player.zones.energyZone.cards.push(card);
    player.zones.energyZone.currentCount++;

    // Actualizar estadísticas de energía
    player.energy.permanentFromSacrifices = (player.energy.permanentFromSacrifices || 0) + 1;
    player.energy.sacrificesThisTurn = 1;

    // Recalcular energía actual y máxima
    const newMax = calculatePlayerEnergy(player);
    player.energy.max = newMax;
    player.energy.current++; // Al sacrificar, ganamos +1 de energía disponible inmediatamente

    // 4. LOG DE ACCIÓN
    if (!gameState.history) gameState.history = [];
    gameState.history.push({
        turn: gameState.turn,
        actor: playerId,
        action: 'SACRIFICE',
        details: { cardName: card.name, cardId: card.id, newEnergyMax: newMax },
        timestamp: Date.now()
    });

    console.log(`🔥 [SACRIFICIO] ${player.playerId} sacrificó "${card.name}". Nueva Energía Máxima: ${newMax}`);

    return gameState;
}

/**
 * Validador para la UI
 */
export function canPlayerSacrifice(gameState: GameState, playerId: 'player_A' | 'player_B'): { can: boolean; reason?: string } {
    const player = gameState.players[playerId];

    if (gameState.activePlayer !== playerId) return { can: false, reason: "No es tu turno" };
    if (gameState.phase !== TurnPhase.MAIN) return { can: false, reason: "Solo en Fase Principal" };
    if (player.energy.sacrificesThisTurn >= 1) return { can: false, reason: "Ya sacrificaste este turno" };
    if (player.zones.hand.length === 0) return { can: false, reason: "Mano vacía" };

    return { can: true };
}
