import { useState, useEffect } from 'react';
import { BotDifficulty } from '@/types/multiplayer';
import { MasterCardTemplate, GameState } from '@/types/types';
import { calculateDeckPowerScore } from '@/lib/engine/deckPowerCalculator';

// ----------------------------------------------------------------------------
// HOOK 1: useDeckPower
// ----------------------------------------------------------------------------
export function useDeckPower(selectedDeck: MasterCardTemplate[] | null) {
    const [power, setPower] = useState<number>(0);
    const [description, setDescription] = useState<string>('');

    useEffect(() => {
        const timer = setTimeout(() => {
            if (selectedDeck && selectedDeck.length > 0) {
                const { finalScore } = calculateDeckPowerScore(selectedDeck);
                setPower(Math.round(finalScore));

                let desc = "Principiante";
                if (finalScore >= 30) desc = "Competitivo";
                if (finalScore >= 60) desc = "Avanzado";
                if (finalScore >= 85) desc = "Dios";

                setDescription(desc);
            } else {
                setPower(0);
                setDescription('');
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [selectedDeck]);

    return { power, description };
}

// ----------------------------------------------------------------------------
// HOOK 2: useBotMatch
// ----------------------------------------------------------------------------
interface BotMatchState {
    isCreating: boolean;
    roomId: string | null;
    error: string | null;
}

export function useBotMatch() {
    const [state, setState] = useState<BotMatchState>({
        isCreating: false,
        roomId: null,
        error: null,
    });

    const createBotMatch = async (deckCards: MasterCardTemplate[], difficulty: BotDifficulty) => {
        setState({ isCreating: true, roomId: null, error: null });

        try {
            // Usamos el token actual
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';

            const res = await fetch('/api/match/create-vs-bot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    deckCards,
                    difficulty,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create bot match');
            }

            setState({
                isCreating: false,
                roomId: data.matchId,
                error: null,
            });

            return data.matchId;
        } catch (err: any) {
            setState({
                isCreating: false,
                roomId: null,
                error: err.message,
            });
        }
    };

    return { state, createBotMatch };
}

// ----------------------------------------------------------------------------
// HOOK 3: useBotActionLoop
// ----------------------------------------------------------------------------
export function useBotActionLoop({
    gameState,
    difficulty,
    roomId,
    isPlayerTurn,
}: {
    gameState: GameState | null;
    difficulty: BotDifficulty | null;
    roomId: string | null;
    isPlayerTurn: boolean;
}) {
    const [botAction, setBotAction] = useState<any>(null);
    const [botThinking, setBotThinking] = useState(false);
    const [botThinkingMessage, setBotThinkingMessage] = useState('');

    useEffect(() => {
        let isMounted = true;

        async function processBotTurn() {
            if (!gameState || !roomId || isPlayerTurn || !difficulty) return;

            // Si el juego ha terminado no hacemos nada
            if (gameState.isGameOver) {
                setBotThinking(false);
                return;
            }

            setBotThinking(true);
            setBotThinkingMessage(`🤖 Bot (${difficulty}) está pensando...`);

            try {
                // En una implementación real, aquí llamaríamos a /api/match/[roomId]/bot-action
                // Por ahora, simulamos una pequeña espera y el backend ejecutará la acción
                // O si es cliente completo:
                const res = await fetch(`/api/match/${roomId}/bot-action`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gameState, difficulty }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        setBotAction(data.action);
                        // La acción se aplicará en el GameEngine
                    }
                }
            } catch (e) {
                console.error('Error fetching bot action', e);
            } finally {
                if (isMounted) {
                    setBotThinking(false);
                    setBotThinkingMessage('');
                }
            }
        }

        if (!isPlayerTurn && gameState && roomId && difficulty) {
            processBotTurn();
        }

        return () => {
            isMounted = false;
        };
    }, [gameState, isPlayerTurn, difficulty, roomId]);

    return { botAction, botThinking, botThinkingMessage };
}
