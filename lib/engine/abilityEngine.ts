// src/lib/engine/abilityEngine.ts

import { CardAbility, TriggerType, BuffState } from '@/types/abilities';
import { applySabotage } from '@/lib/engine/sabotageSystem';
import { generateUUID } from '@/lib/onboarding/onboardingState';

const ABILITIES_DB: Record<string, CardAbility> = {
    // --- SABOTAJE ---
    'SAB_VOID_1': {
        id: 'SAB_VOID_1',
        name: 'Corte de Señal',
        description: 'El oponente roba una "Pista Silenciosa" (VOID) en su próximo turno.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e1', type: 'SABOTAGE', value: 'VOID', duration: 1, target: 'OPPONENT' }],
        sabotage: 'VOID'
    },
    'SAB_REVERSE_1': {
        id: 'SAB_REVERSE_1',
        name: 'B-Side Only',
        description: 'El oponente roba desde el fondo de su mazo (REVERSE_DRAW) por 2 turnos.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e2', type: 'SABOTAGE', value: 'REVERSE_DRAW', duration: 2, target: 'OPPONENT' }],
        sabotage: 'REVERSE_DRAW'
    },
    'SAB_ENCRYPT_1': {
        id: 'SAB_ENCRYPT_1',
        name: 'Distorsión Analógica',
        description: 'El oponente no puede ver sus próximas cartas (ENCRYPT) por 3 turnos.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e3', type: 'SABOTAGE', value: 'ENCRYPT', duration: 3, target: 'OPPONENT' }],
        sabotage: 'ENCRYPT'
    },

    // --- PLAYLIST SYNERGY ---
    'PLAY_BUFF_1': {
        id: 'PLAY_BUFF_1',
        name: 'Sintonía Perfecta',
        description: 'Si tu carta coincide con el género global, duplica el bono de Playlist.',
        trigger: 'PASSIVE',
        effects: [{ id: 'e4', type: 'PLAYLIST_MOD', value: 'DOUBLE_BONUS', duration: 0, target: 'SELF' }],
    },
    'PLAY_GENRE_1': {
        id: 'PLAY_GENRE_1',
        name: 'DJ Shuffle',
        description: 'Cambia el género de la Playlist compartida inmediatamente.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e5', type: 'PLAYLIST_MOD', value: 'FORCE_SHUFFLE', duration: 0, target: 'BOARD' }],
    },

    // --- DRAW MANIPULATION ---
    'DRAW_EXTRA_1': {
        id: 'DRAW_EXTRA_1',
        name: 'Extended Version',
        description: 'Roba 2 cartas adicionales (DUPLICATE) en tu próximo robo.',
        trigger: 'ON_SACRIFICE',
        effects: [{ id: 'e6', type: 'DRAW_MOD', value: 'DUPLICATE', duration: 1, target: 'SELF' }],
    },
    'DRAW_ORDER_1': {
        id: 'DRAW_ORDER_1',
        name: 'Forward Planning',
        description: 'Mira las próximas 5 cartas de tu mazo.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e7', type: 'DRAW_MOD', value: 'PREVIEW_5', duration: 0, target: 'SELF' }],
    },

    // --- HYPE MODS ---
    'HYPE_BURST_1': {
        id: 'HYPE_BURST_1',
        name: 'Remix Viral',
        description: 'Gana +10 de Hype instantáneamente.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e8', type: 'HYPE_MOD', value: 10, duration: 0, target: 'SELF' }],
    },
};

/**
 * Ejecuta una habilidad disparada por un evento del juego.
 */
export function executeAbility(abilityId: string, playerId: string, opponentId: string) {
    const ability = ABILITIES_DB[abilityId];
    if (!ability) return;

    ability.effects.forEach(effect => {
        const targetId = effect.target === 'SELF' ? playerId : opponentId;

        switch (effect.type) {
            case 'SABOTAGE':
                applySabotage(targetId, effect.value as any, effect.duration);
                break;

            case 'HYPE_MOD':
                // Lógica de aumentar hype en el store (se integraría con usePlayerStore)
                console.log(`Applying HYPE bonus: ${effect.value} to ${targetId}`);
                break;

            case 'DRAW_MOD':
                if (effect.value === 'DUPLICATE') {
                    applySabotage(targetId, 'DUPLICATE', effect.duration);
                }
                // Otras manipulaciones de mazo...
                break;

            default:
                console.log(`Unimplemented effect: ${effect.type}`);
        }
    });
}

/**
 * Filtra habilidades por disparador (Trigger).
 */
export function getTriggeredAbilities(trigger: TriggerType, abilities: string[]): string[] {
    return abilities.filter(id => ABILITIES_DB[id]?.trigger === trigger);
}
