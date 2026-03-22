// src/types/abilities.ts

export type SabotageType = 'SWAP' | 'REVERSE_DRAW' | 'ENCRYPT' | 'DUPLICATE' | 'VOID' | 'NONE';

export type TriggerType = 'ON_PLAY' | 'ON_DRAW' | 'ON_SACRIFICE' | 'ON_TURN_START' | 'ON_TURN_END' | 'PASSIVE' | 'ON_REACTION' | 'INSTANT';

export type AbilityEffect = {
    id: string;
    type: 'DRAW_MOD' | 'ENERGY_MOD' | 'STAT_MOD' | 'PLAYLIST_MOD' | 'SABOTAGE' | 'HYPE_MOD' | 'DAMAGE' | 'COMBAT_MOD' | 'SPECIAL_ACTION' | 'GLOBAL_BUFF' | 'BOARD_CONTROL' | 'GRAVEYARD_CONTROL' | 'HYPE_ENGINE';
    value: number | string;
    duration: number; // 0 para instantáneo, >0 para turnos persistentes
    target: 'SELF' | 'OPPONENT' | 'ENEMY' | 'BOARD' | 'DECK' | 'ALL_SELF' | 'ALL_OWN_CARDS' | 'ALL_ENEMY_CARDS';
    amount?: number; // Para efectos que necesitan cantidad específica
}

export interface CardAbility {
    id: string;
    name: string;
    description: string;
    trigger: TriggerType;
    effects: AbilityEffect[];
    sabotage?: SabotageType;
    cost?: number; // Costo adicional de activación si no es por carta
}

export interface BuffState {
    abilityId: string;
    type: AbilityEffect['type'];
    value: number | string;
    turnsRemaining: number;
}
