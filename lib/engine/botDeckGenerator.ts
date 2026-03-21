import { MasterCardTemplate } from '@/types/types';
import { BotDifficulty } from '@/types/multiplayer';
import { getAllCards } from '@/lib/database/cardRepository';
import { calculateDeckPowerScore } from './deckPowerCalculator';

export interface BotDeckConfig {
    userId: string;                  // "BOT_001", "BOT_002", etc
    difficulty: BotDifficulty;
    powerScore: number;              // 0-100
    deckCards: MasterCardTemplate[];
    strategy: 'aggro' | 'control' | 'combo' | 'tempo';
}

export async function generateBotDeck(
    playerPowerScore: number,
    difficultyOverride?: BotDifficulty
): Promise<BotDeckConfig> {
    // Determinar dificultad equivalente
    const difficulty =
        difficultyOverride ||
        (playerPowerScore < 20
            ? BotDifficulty.EASY
            : playerPowerScore < 40
                ? BotDifficulty.EASY
                : playerPowerScore < 60
                    ? BotDifficulty.NORMAL
                    : playerPowerScore < 80
                        ? BotDifficulty.HARD
                        : BotDifficulty.IMPOSSIBLE);

    // Seleccionar estrategia (varía según dificultad)
    const strategies: Record<BotDifficulty, Array<'aggro' | 'control' | 'combo' | 'tempo'>> = {
        [BotDifficulty.EASY]: ['aggro', 'tempo'],
        [BotDifficulty.NORMAL]: ['aggro', 'control', 'tempo'],
        [BotDifficulty.HARD]: ['control', 'combo', 'tempo'],
        [BotDifficulty.IMPOSSIBLE]: ['combo', 'control'],
    };

    const strategyList = strategies[difficulty];
    const strategy = strategyList[Math.floor(Math.random() * strategyList.length)];

    const deckCards = await generateCardsByStrategy(
        strategy,
        difficulty,
        playerPowerScore
    );

    return {
        userId: `BOT_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        difficulty,
        powerScore: calculateDeckPowerScore(deckCards).finalScore,
        deckCards,
        strategy,
    };
}

async function generateCardsByStrategy(
    strategy: 'aggro' | 'control' | 'combo' | 'tempo',
    difficulty: BotDifficulty,
    targetScore: number
): Promise<MasterCardTemplate[]> {
    const allCards = await getAllCards();
    const selectedCards: MasterCardTemplate[] = [];

    if (allCards.length === 0) {
        return []; // Sin cartas
    }

    // Número de cartas para cada coste - Max 20
    const costDistribution = {
        aggro: { 1: 6, 2: 6, 3: 4, 4: 2, 5: 2 },
        control: { 1: 3, 2: 4, 3: 6, 4: 4, 5: 3 },
        combo: { 1: 4, 2: 5, 3: 5, 4: 4, 5: 2 },
        tempo: { 1: 5, 2: 6, 3: 5, 4: 3, 5: 1 },
    };

    const distribution = costDistribution[strategy];

    const rarityTiers = {
        [BotDifficulty.EASY]: ['BRONZE', 'SILVER'],
        [BotDifficulty.NORMAL]: ['BRONZE', 'SILVER', 'GOLD'],
        [BotDifficulty.HARD]: ['SILVER', 'GOLD', 'PLATINUM'],
        [BotDifficulty.IMPOSSIBLE]: ['GOLD', 'PLATINUM'],
    };

    const allowedRarities = rarityTiers[difficulty];

    // Map numbers to distribute by cost
    for (const [cost, count] of Object.entries(distribution)) {
        const costNum = parseInt(cost);

        let costCards = allCards.filter(
            (card) =>
                card.cost === costNum || (costNum === 5 && card.cost >= 5)
        );

        // Filter by allowed rarities
        costCards = costCards.filter(c => allowedRarities.includes(c.rarity));

        if (costCards.length === 0) {
            // Fallback si no hay cartas de esa rareza y coste: tomar cualquiera de ese coste
            costCards = allCards.filter(c => c.cost === costNum || (costNum === 5 && c.cost >= 5));
        }
        if (costCards.length === 0) {
            // Fallback total
            costCards = allCards;
        }

        // Seleccionar random
        for (let i = 0; i < (count as number); i++) {
            if (costCards.length > 0) {
                const randomCard =
                    costCards[Math.floor(Math.random() * costCards.length)];
                selectedCards.push(randomCard);
            }
        }
    }

    // Rellenar hasta 20 si faltan
    while (selectedCards.length < 20 && allCards.length > 0) {
        selectedCards.push(allCards[Math.floor(Math.random() * allCards.length)]);
    }

    return selectedCards.slice(0, 20);
}
