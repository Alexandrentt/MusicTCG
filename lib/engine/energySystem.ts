// lib/engine/energySystem.ts

export interface EnergyState {
    current: number;
    max: number;
    sacrificeUsedThisTurn: number;
}

export const ENERGY_CONSTANTS = {
    STARTING_CURRENT: 1,
    STARTING_MAX: 1,
    SACRIFICE_GAIN_CURRENT: 1,
    SACRIFICE_GAIN_MAX: 1,
    MAX_SACRIFICES_PER_TURN: 1,
    MAX_ENERGY_CAP: 10,
};

/**
 * Inicializar energía al inicio de la partida
 */
export function initializeEnergy(): EnergyState {
    return {
        current: ENERGY_CONSTANTS.STARTING_CURRENT,
        max: ENERGY_CONSTANTS.STARTING_MAX,
        sacrificeUsedThisTurn: 0,
    };
}

/**
 * Reset al inicio de cada turno
 */
export function resetEnergyTurn(energy: EnergyState): EnergyState {
    return {
        ...energy,
        current: energy.max,
        sacrificeUsedThisTurn: 0,
    };
}

/**
 * Gastar energía (lanzar carta, activar habilidad, etc)
 */
export function spendEnergy(
    energy: EnergyState,
    amount: number
): { success: boolean; energy: EnergyState; error?: string } {
    if (amount > energy.current) {
        return {
            success: false,
            energy,
            error: `No tienes suficiente energía. Necesitas ${amount}, tienes ${energy.current}`,
        };
    }

    return {
        success: true,
        energy: {
            ...energy,
            current: energy.current - amount,
        },
    };
}

/**
 * Sacrificar una carta por energía
 */
export function sacrificeForEnergy(
    energy: EnergyState
): { success: boolean; energy: EnergyState; error?: string } {
    // Verificar límite de sacrificios por turno
    if (energy.sacrificeUsedThisTurn >= ENERGY_CONSTANTS.MAX_SACRIFICES_PER_TURN) {
        return {
            success: false,
            energy,
            error: `Ya has sacrificado ${ENERGY_CONSTANTS.MAX_SACRIFICES_PER_TURN} carta esta vuelta`,
        };
    }

    // Verificar tope de energía máxima
    if (energy.max >= ENERGY_CONSTANTS.MAX_ENERGY_CAP) {
        return {
            success: false,
            energy,
            error: 'Alcanzaste el máximo de energía posible',
        };
    }

    const newEnergy: EnergyState = {
        current: Math.min(
            energy.current + ENERGY_CONSTANTS.SACRIFICE_GAIN_CURRENT,
            ENERGY_CONSTANTS.MAX_ENERGY_CAP
        ),
        max: Math.min(
            energy.max + ENERGY_CONSTANTS.SACRIFICE_GAIN_MAX,
            ENERGY_CONSTANTS.MAX_ENERGY_CAP
        ),
        sacrificeUsedThisTurn: energy.sacrificeUsedThisTurn + 1,
    };

    return {
        success: true,
        energy: newEnergy,
    };
}

/**
 * Calcular energía total disponible incluyendo futuros turnos
 */
export function getEnergyProjection(
    energy: EnergyState,
    futureTurns: number
): number {
    return energy.max * futureTurns;
}
