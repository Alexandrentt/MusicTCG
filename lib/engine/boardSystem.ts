import { GameState, PlayedCard, Card, PlayerState } from '../../types/types';
import { generateUUID } from '../utils';

/**
 * INVOCAR: Tomar una carta de la mano y ponerla en el tablero
 */
export function playCardToLane(
    gameState: GameState,
    playerId: 'player_A' | 'player_B',
    cardId: string,
    targetLaneId: string
): GameState {
    const player = gameState.players[playerId];
    const isYourTurn = gameState.activePlayer === playerId;

    if (!isYourTurn) throw new Error("❌ No es tu turno");

    const card = player.zones.hand.find(c => c.id === cardId);
    if (!card) throw new Error(`❌ Carta ${cardId} no está en tu mano`);

    const lane = gameState.board.lanes.find(l => l.laneId === targetLaneId);
    if (!lane) throw new Error(`❌ Lane ${targetLaneId} no existe`);

    const isYourSide = playerId === 'player_A';
    const occupiedSlot = isYourSide ? lane.yourCard : lane.rivalCard;

    if (occupiedSlot) throw new Error(`❌ Lane ${targetLaneId} ya tiene una carta.`);
    if (card.cost > player.energy.current) throw new Error(`❌ No tienes energía suficiente.`);
    if (card.type === 'EVENT') throw new Error(`❌ Los Eventos van al BACKSTAGE, no al tablero.`);

    const playedCard: PlayedCard = {
        ...card,
        instanceId: generateUUID(),
        currentAtk: card.atk,
        currentDef: card.def,
        isTapped: true, // Pánico Escénico
        isTapped90: false,
        damageThisTurn: 0,
        laneId: targetLaneId,
        inBackstage: false,
        visualEffect: 'entrance_animation',
    };

    player.zones.hand = player.zones.hand.filter(c => c.id !== cardId);
    player.energy.current -= card.cost;

    if (isYourSide) lane.yourCard = playedCard;
    else lane.rivalCard = playedCard;

    player.zones.board.push(playedCard);

    return gameState;
}

/**
 * REEMPLAZAR: Sacar una carta del tablero (→ Backstage) e invocar una nueva
 */
export function replaceCardInLane(
    gameState: GameState,
    playerId: 'player_A' | 'player_B',
    cardInstanceId: string,
    newCardId: string,
    targetLaneId: string
): GameState {
    const player = gameState.players[playerId];
    if (gameState.activePlayer !== playerId) throw new Error("❌ No es tu turno");

    const oldCard = player.zones.board.find(c => c.instanceId === cardInstanceId);
    if (!oldCard) throw new Error(`❌ Carta ${cardInstanceId} no encontrada en tablero`);

    const newCard = player.zones.hand.find(c => c.id === newCardId);
    if (!newCard) throw new Error(`❌ Carta ${newCardId} no está en tu mano`);

    const lane = gameState.board.lanes.find(l => l.laneId === targetLaneId);
    if (!lane) throw new Error(`❌ Lane ${targetLaneId} inválida`);

    const REPLACEMENT_COST = 1;
    const totalCost = REPLACEMENT_COST + newCard.cost;

    if (totalCost > player.energy.current) throw new Error(`❌ No tienes energía.`);

    // Sacar vieja
    const isYourSide = playerId === 'player_A';
    if (isYourSide) lane.yourCard = undefined;
    else lane.rivalCard = undefined;

    oldCard.laneId = undefined;
    oldCard.inBackstage = true;
    oldCard.isTapped = false; // Reset para reactivación posterior
    oldCard.currentDef = oldCard.def;
    oldCard.currentAtk = oldCard.atk;

    player.zones.backstage.push(oldCard);
    player.zones.board = player.zones.board.filter(c => c.instanceId !== cardInstanceId);

    // Invocar nueva
    const playedCard: PlayedCard = {
        ...newCard,
        instanceId: generateUUID(),
        currentAtk: newCard.atk,
        currentDef: newCard.def,
        isTapped: true,
        isTapped90: false,
        laneId: targetLaneId,
        inBackstage: false,
        damageThisTurn: 0,
        visualEffect: 'replacement_entrance',
    };

    if (isYourSide) lane.yourCard = playedCard;
    else lane.rivalCard = playedCard;

    player.zones.board.push(playedCard);
    player.zones.hand = player.zones.hand.filter(c => c.id !== newCardId);
    player.energy.current -= totalCost;

    return gameState;
}

/**
 * REACTIVAR: Traer una carta del Backstage de vuelta al tablero
 */
export function reactivateCardFromBackstage(
    gameState: GameState,
    playerId: 'player_A' | 'player_B',
    cardInstanceId: string,
    targetLaneId: string
): GameState {
    const player = gameState.players[playerId];
    if (gameState.activePlayer !== playerId) throw new Error("❌ No es tu turno");

    const backstageCard = player.zones.backstage.find(
        c => c.instanceId === cardInstanceId && c.inBackstage === true
    );

    if (!backstageCard) throw new Error(`❌ Carta no encontrada en Backstage.`);
    if (backstageCard.type === 'EVENT') throw new Error(`❌ Los Eventos no se pueden reactivar.`);

    if (backstageCard.cost > player.energy.current) throw new Error(`❌ No tienes energía.`);

    const lane = gameState.board.lanes.find(l => l.laneId === targetLaneId);
    if (!lane) throw new Error(`❌ Lane inválida`);

    const isYourSide = playerId === 'player_A';
    const occupiedSlot = isYourSide ? lane.yourCard : lane.rivalCard;
    if (occupiedSlot) throw new Error(`❌ Lane ocupada.`);

    backstageCard.laneId = targetLaneId;
    backstageCard.inBackstage = false;
    backstageCard.isTapped = true; // Pánico Escénico al volver

    if (isYourSide) lane.yourCard = backstageCard;
    else lane.rivalCard = backstageCard;

    player.zones.backstage = player.zones.backstage.filter(c => c.instanceId !== cardInstanceId);
    player.zones.board.push(backstageCard);
    player.energy.current -= backstageCard.cost;

    return gameState;
}
