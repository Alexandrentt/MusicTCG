import { NextRequest, NextResponse } from 'next/server';
import { generateBotDeck } from '@/lib/engine/botDeckGenerator';
import { calculateDeckPowerScore } from '@/lib/engine/deckPowerCalculator';
import { GameState, TurnPhase } from '@/types/types';
import { BotDifficulty } from '@/types/multiplayer';

export async function POST(req: NextRequest) {
    try {
        const { deckCards, difficulty } = await req.json();

        if (!deckCards || deckCards.length === 0) {
            return NextResponse.json({ error: 'Mazo inválido o vacío' }, { status: 400 });
        }

        // Calcular el poder del mazo del jugador
        const playerPowerScore = calculateDeckPowerScore(deckCards);
        console.log(`Poder del mazo del jugador: ${playerPowerScore.finalScore.toFixed(1)}`);

        // Generar mazo del bot adaptado (o según dificultad elegida)
        const botConfig = await generateBotDeck(playerPowerScore.finalScore, difficulty);

        console.log(`Bot generado: ${botConfig.userId} (${botConfig.difficulty})`);

        // Usar un ID de jugador temporal o validarlo con tokens si se desea (simulado 'user_local' por ahora)
        const playerId = 'player_A';
        const botId = 'player_B';

        const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const initialGameState: GameState = {
            matchId,
            turn: 1,
            phase: TurnPhase.OPENING,
            activePlayer: playerId, // El jugador siempre empieza (o podría ser aleatorio)
            players: {
                player_A: {
                    playerId: playerId,
                    reputation: 30, // GAME_CONSTANTS.STARTING_REPUTATION
                    hype: 0,
                    energy: { basePerTurn: 1, sacrificesThisTurn: 0, permanentFromSacrifices: 0, current: 1, max: 1 },
                    zones: {
                        deck: deckCards,
                        hand: [],
                        board: [],
                        backstage: [],
                        energyZone: { cards: [], currentCount: 0 },
                        deckCount: deckCards.length,
                        handCount: 0,
                    },
                },
                player_B: {
                    playerId: botId,
                    reputation: 30,
                    hype: 0,
                    energy: { basePerTurn: 1, sacrificesThisTurn: 0, permanentFromSacrifices: 0, current: 1, max: 1 },
                    zones: {
                        deck: botConfig.deckCards,
                        hand: [],
                        board: [],
                        backstage: [],
                        energyZone: { cards: [], currentCount: 0 },
                        deckCount: botConfig.deckCards.length,
                        handCount: 0,
                    },
                },
            },
            isGameOver: false,
            board: { lanes: [] },
            history: [],
        };

        // Idealmente guardar en Supabase aquí. Para el ejemplo, 
        // lo enviamos al cliente o se guarda usando un admin SDK.
        // Dependiendo de store/Supabase en el cliente...

        return NextResponse.json({
            success: true,
            matchId,
            difficulty: botConfig.difficulty,
            gameState: initialGameState // Pasamos el initial state si se maneja localmente también.
        });
    } catch (err: any) {
        console.error('API /create-vs-bot error:', err);
        return NextResponse.json({ error: err.message || 'Error desconocido' }, { status: 500 });
    }
}
