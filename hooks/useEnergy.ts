'use client';

import { useState, useCallback } from 'react';
import {
    EnergyState,
    initializeEnergy,
    resetEnergyTurn,
    spendEnergy,
    sacrificeForEnergy,
    ENERGY_CONSTANTS,
} from '@/lib/engine/energySystem';

interface UseEnergyReturn {
    energy: EnergyState;
    canSpend: (amount: number) => boolean;
    canSacrifice: () => boolean;
    spend: (amount: number) => boolean;
    sacrifice: () => boolean;
    resetTurn: () => void;
    getProjection: (turns: number) => number;
}

export function useEnergy(): UseEnergyReturn {
    const [energy, setEnergy] = useState<EnergyState>(initializeEnergy());

    const canSpend = (amount: number) => {
        return energy.current >= amount;
    };

    const canSacrifice = useCallback(() => {
        return (
            energy.sacrificeUsedThisTurn < ENERGY_CONSTANTS.MAX_SACRIFICES_PER_TURN &&
            energy.max < ENERGY_CONSTANTS.MAX_ENERGY_CAP
        );
    }, [energy.sacrificeUsedThisTurn, energy.max]);

    const spend = useCallback((amount: number) => {
        const result = spendEnergy(energy, amount);

        if (result.success) {
            setEnergy(result.energy);
            return true;
        } else {
            console.error(result.error);
            return false;
        }
    }, [energy]);

    const sacrifice = useCallback(() => {
        const result = sacrificeForEnergy(energy);

        if (result.success) {
            setEnergy(result.energy);
            return true;
        } else {
            console.error(result.error);
            return false;
        }
    }, [energy]);

    const resetTurn = useCallback(() => {
        setEnergy(resetEnergyTurn(energy));
    }, [energy]);

    const getProjection = useCallback((turns: number) => {
        return energy.max * turns;
    }, [energy.max]);

    return {
        energy,
        canSpend,
        canSacrifice,
        spend,
        sacrifice,
        resetTurn,
        getProjection,
    };
}
