// lib/monetization/chestSystem.ts

export enum ChestType {
    COMMON = 'COMMON',            // 1 hora
    RARE = 'RARE',                // 4 horas
    EPIC = 'EPIC',                // 8 horas
    LEGENDARY = 'LEGENDARY',      // 12 horas (raro)
}

export interface ChestReward {
    gold: number;
    wildcards?: { rarity: string; count: number }[];
    cosmetics?: string[];
}

export interface ChestSlot {
    id: string;
    type: ChestType;
    status: 'LOCKED' | 'UNLOCKING' | 'READY' | 'OPENED';

    // Timing
    createdAt: number;
    unlocksAt: number;
    timeRemainingMs: number;

    // Rewards inside
    rewards: ChestReward;

    // Premium acceleration
    canAccelerate: boolean;
    accelerateCost: number;       // Oro premium para abrir ya
}

export const CHEST_CONFIG = {
    [ChestType.COMMON]: {
        duration: 1 * 60 * 60 * 1000,        // 1 hora
        rewards: {
            gold: 200,
            wildcards: [],
        },
        probability: 0.5,                    // 50% de drop
        accelerateCost: 50,                  // 50 oro premium
    },

    [ChestType.RARE]: {
        duration: 4 * 60 * 60 * 1000,        // 4 horas
        rewards: {
            gold: 500,
            wildcards: [{ rarity: 'BRONZE', count: 1 }],
        },
        probability: 0.35,
        accelerateCost: 100,
    },

    [ChestType.EPIC]: {
        duration: 8 * 60 * 60 * 1000,        // 8 horas
        rewards: {
            gold: 1000,
            wildcards: [{ rarity: 'SILVER', count: 1 }],
        },
        probability: 0.12,
        accelerateCost: 200,
    },

    [ChestType.LEGENDARY]: {
        duration: 12 * 60 * 60 * 1000,       // 12 horas
        rewards: {
            gold: 2000,
            wildcards: [
                { rarity: 'SILVER', count: 1 },
                { rarity: 'GOLD', count: 1 },
            ],
        },
        probability: 0.03,
        accelerateCost: 500,
    },
};

export const CHEST_SLOT_LIMITS = {
    FREE_SLOTS: 4,                // 4 cofres sin pagar
    PAID_SLOTS: 2,                // +2 slots con pase (futuro)
};

/**
 * Genera un cofre aleatorio basado en probabilidades.
 */
export function generateRandomChest(): ChestSlot {
    const roll = Math.random();
    let chestType: ChestType = ChestType.COMMON;

    // Probabilidades acumuladas
    const configArray = [
        { type: ChestType.LEGENDARY, prob: CHEST_CONFIG[ChestType.LEGENDARY].probability },
        { type: ChestType.EPIC, prob: CHEST_CONFIG[ChestType.EPIC].probability },
        { type: ChestType.RARE, prob: CHEST_CONFIG[ChestType.RARE].probability },
    ];

    let currentThreshold = 0;
    for (const item of configArray) {
        currentThreshold += item.prob;
        if (roll < currentThreshold) {
            chestType = item.type;
            break;
        }
    }

    const config = CHEST_CONFIG[chestType];
    return {
        id: `chest_${Date.now()}_${Math.random()}`,
        type: chestType,
        status: 'LOCKED',
        createdAt: Date.now(),
        unlocksAt: 0, // Aún no ha empezado el timer
        timeRemainingMs: config.duration,
        rewards: config.rewards,
        canAccelerate: true,
        accelerateCost: config.accelerateCost,
    };
}

/**
 * Formatea el tiempo restante para mostrarlo en la UI.
 */
export function formatTimeRemaining(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}
