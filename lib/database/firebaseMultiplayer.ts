// lib/database/firebaseMultiplayer.ts
import { ref, set, onValue, update, push, get, child, remove, off } from 'firebase/database';
import { rtdb, auth, db } from '../firebase';
import { BattleRoom, BattleMode, BotDifficulty, Challenge } from '../../types/multiplayer';
import { GameState, TurnPhase, GameEndCondition } from '../../types/types';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Crea una sala de batalla y la sube a RTDB
 */
export async function createBattleRoom(room: Partial<BattleRoom>): Promise<string> {
    const roomsRef = ref(rtdb, 'battle_rooms');
    const newRoomRef = push(roomsRef);
    const roomId = newRoomRef.key!;

    const finalRoom: BattleRoom = {
        roomId,
        mode: room.mode || BattleMode.VS_BOT,
        playerA: room.playerA!,
        playerB: room.playerB!,
        gameState: room.gameState!,
        status: 'WAITING',
        createdAt: new Date(),
        ...room
    };

    await set(newRoomRef, finalRoom);
    return roomId;
}

/**
 * Escucha cambios en una sala de batalla específica
 */
export function watchBattleRoom(roomId: string, callback: (room: BattleRoom | null) => void) {
    const roomRef = ref(rtdb, `battle_rooms/${roomId}`);
    onValue(roomRef, (snapshot) => {
        callback(snapshot.val());
    });
    return () => off(roomRef);
}

/**
 * Actualiza el estado del juego en tiempo real
 */
export async function updateBattleGameState(roomId: string, gameState: GameState) {
    const roomRef = ref(rtdb, `battle_rooms/${roomId}/gameState`);
    await set(roomRef, gameState);
}

/**
 * Finaliza la batalla y limpia la sala (o la marca como terminada)
 */
export async function finishBattle(roomId: string, winnerId: string, endCondition: GameEndCondition) {
    const updates: any = {};
    updates[`battle_rooms/${roomId}/status`] = 'FINISHED';
    updates[`battle_rooms/${roomId}/winnerId`] = winnerId;
    updates[`battle_rooms/${roomId}/gameState/isGameOver`] = true;
    updates[`battle_rooms/${roomId}/gameState/winner`] = winnerId;
    updates[`battle_rooms/${roomId}/gameState/endCondition`] = endCondition;

    await update(ref(rtdb), updates);
}

/**
 * Envía un reto a un amigo
 */
export async function sendChallenge(fromUserId: string, toUserId: string, deckId: string): Promise<string> {
    const challengeId = `${fromUserId}_vs_${toUserId}_${Date.now()}`;
    const challenge: Challenge = {
        challengeId,
        fromUserId,
        toUserId,
        deckId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
        status: 'PENDING'
    };

    await set(ref(rtdb, `challenges/${toUserId}/${challengeId}`), challenge);
    return challengeId;
}

/**
 * Acepta un reto y crea la sala
 */
export async function acceptChallenge(challenge: Challenge, receiverDeckId: string): Promise<string> {
    // Lógica para crear la BattleRoom...
    // Retornar roomId
    // Actualizar status del reto
    const roomId = `room_${challenge.challengeId}`;

    // Mover a la creación de sala real...
    return roomId;
}

/**
 * Inicializa una batalla contra BOT
 */
export async function createBotBattle(
    playerUserId: string,
    playerUsername: string,
    playerDeckId: string,
    difficulty: BotDifficulty
): Promise<string> {
    // 1. Obtener deck del jugador desde Firestore
    const playerDeckRef = doc(db, `users/${playerUserId}/decks/${playerDeckId}`);
    const snap = await getDoc(playerDeckRef);
    if (!snap.exists()) throw new Error("Mazo no encontrado");

    // 2. Generar estado inicial (Placeholder por ahora)
    // TODO: Importar initializeGameState desde el combatSystem o engine
    const initialGameState: any = {
        matchId: `bot_${Date.now()}`,
        turn: 1,
        phase: TurnPhase.OPENING,
        activePlayer: 'player_A',
        players: {
            player_A: { /* ... */ },
            player_B: { /* BOT ... */ }
        },
        isGameOver: false,
        board: { lanes: [] },
        history: []
    };

    const roomId = await createBattleRoom({
        mode: BattleMode.VS_BOT,
        playerA: { userId: playerUserId, username: playerUsername, deckId: playerDeckId },
        playerB: { username: `Bot - ${difficulty}`, botDifficulty: difficulty },
        gameState: initialGameState
    });

    return roomId;
}
