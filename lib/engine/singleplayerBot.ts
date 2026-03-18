import { CardData, generateCard } from '@/lib/engine/generator';
import { PlayerState, BoardCard, hasKw } from '@/hooks/useGameEngine';

export type DifficultyLevel = 'novato' | 'intermedio' | 'experto';

export type BotAction =
    | { type: 'PROMOTE', cardIndex: number }
    | { type: 'PLAY_CARD', cardIndex: number }
    | { type: 'ACTIVATE_BACKSTAGE', backstageIndex: number }
    | { type: 'ATTACK', attackerIndex: number, targetIndex: number | null }
    | { type: 'END_TURN' };

export function calculateDeckPower(deck: CardData[]): number {
    return deck.reduce((acc, card) => acc + card.stats.atk + card.stats.def + card.cost * 2, 0);
}

export function getDifficultyLevel(power: number): DifficultyLevel {
    if (power > 300) return 'experto';
    if (power > 200) return 'intermedio';
    return 'novato';
}

export function generateBotDeck(playerPower: number): CardData[] {
    const arr: CardData[] = [];
    for (let i = 0; i < 40; i++) {
        // Generar cartas de bot balanceadas
        arr.push(generateCard({
            trackId: 'bot_' + i,
            trackName: 'Singularity Vol.' + i,
            artistName: 'AI Model',
            collectionName: 'Singularity',
            primaryGenreName: 'Electronic',
            artworkUrl100: ''
        }));
    }
    return arr;
}

export function botPlayTurn(
    state: { botState: PlayerState, playerState: PlayerState, turnCount: number },
    diff: DifficultyLevel
): BotAction[] {
    const actions: BotAction[] = [];
    const b = state.botState;
    const p = state.playerState;

    // 1. Promote
    if (b.canPromote && b.energy < 7 && b.hand.length > 0) {
        actions.push({ type: 'PROMOTE', cardIndex: 0 });
    }

    // 2. Play cards
    let currentEnergy = b.energy;
    b.hand.forEach((card, i) => {
        if (card.cost <= currentEnergy && b.board.length < 5) {
            currentEnergy -= card.cost;
            actions.push({ type: 'PLAY_CARD', cardIndex: i });
        }
    });

    // 3. Attack
    b.board.forEach((card, i) => {
        if (!card.isTapped && !card.stageFright) {
            // Target taunt if any
            const tauntIdx = p.board.findIndex(c => hasKw(c, 'taunt') && !c.isTapped);
            let targetIndex = null;

            if (tauntIdx !== -1) {
                targetIndex = tauntIdx;
            } else if (p.board.length > 0 && Math.random() > 0.5) {
                // Attack random creature
                targetIndex = Math.floor(Math.random() * p.board.length);
            }

            actions.push({ type: 'ATTACK', attackerIndex: i, targetIndex });
        }
    });

    actions.push({ type: 'END_TURN' });
    return actions;
}

export function botReplicaResponse(
    botState: PlayerState,
    attackerCard: CardData | null,
    isDirectAttack: boolean,
    diff: DifficultyLevel
): { action: string, backstageIdx?: number, interceptorIdx?: number } {
    // Simple replica: if direct attack and we can intercept, do it
    if (isDirectAttack && botState.energy >= 1) {
        const interceptorIdx = botState.board.findIndex(c => !c.isTapped);
        if (interceptorIdx !== -1) {
            return { action: 'intercept', interceptorIdx };
        }
    }
    return { action: 'skip' };
}
