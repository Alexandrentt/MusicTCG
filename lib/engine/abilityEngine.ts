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
    'DRAW_DEEP_1': {
        id: 'DRAW_DEEP_1',
        name: 'Library Dive',
        description: 'Busca en tu mazo una carta de cualquier rareza y ponla en tu mano.',
        trigger: 'ON_SACRIFICE',
        effects: [{ id: 'e8', type: 'DRAW_MOD', value: 'TUTOR', duration: 0, target: 'SELF' }],
    },

    // --- HYPE MODS ---
    'HYPE_BURST_1': {
        id: 'HYPE_BURST_1',
        name: 'Remix Viral',
        description: 'Gana +10 de Hype instantáneamente.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e9', type: 'HYPE_MOD', value: 10, duration: 0, target: 'SELF' }],
    },
    'HYPE_ENGINE_1': {
        id: 'HYPE_ENGINE_1',
        name: 'Motor de Hype',
        description: 'Gana +1 de Hype cada vez que juegas una carta con este keyword.',
        trigger: 'PASSIVE',
        effects: [{ id: 'e10', type: 'HYPE_ENGINE', value: 1, duration: 0, target: 'SELF' }],
    },

    // --- COMBAT ABILITIES ---
    'COMBAT_FIRST_STRIKE_1': {
        id: 'COMBAT_FIRST_STRIKE_1',
        name: 'Opening Act',
        description: 'Esta carta puede atacar el mismo turno que entra en juego.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e11', type: 'COMBAT_MOD', value: 'HASTE', duration: 1, target: 'SELF' }],
    },
    'COMBAT_DOUBLE_STRIKE_1': {
        id: 'COMBAT_DOUBLE_STRIKE_1',
        name: 'Doble Ritmo',
        description: 'Puede atacar dos veces por turno.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e12', type: 'COMBAT_MOD', value: 'DOUBLE_STRIKE', duration: 0, target: 'SELF' }],
    },
    'COMBAT_PIERCE_1': {
        id: 'COMBAT_PIERCE_1',
        name: 'Breakthrough',
        description: 'El daño excedente se aplica directamente al oponente.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e13', type: 'COMBAT_MOD', value: 'PIERCE', duration: 0, target: 'SELF' }],
    },
    'COMBAT_LIFELINK_1': {
        id: 'COMBAT_LIFELINK_1',
        name: 'Melodía Eterna',
        description: 'Esta carta no puede ser destruida en combate.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e14', type: 'COMBAT_MOD', value: 'INDESTRUCTIBLE', duration: 0, target: 'SELF' }],
    },

    // --- DEFENSIVE ABILITIES ---
    'DEF_TaUNT_1': {
        id: 'DEF_TAUNT_1',
        name: 'Solo Principal',
        description: 'Los oponentes deben atacar primero a esta carta.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e15', type: 'COMBAT_MOD', value: 'TAUNT', duration: 0, target: 'SELF' }],
    },
    'DEF_SHIELD_1': {
        id: 'DEF_SHIELD_1',
        name: 'Armonía Protectora',
        description: 'Previene el próximo daño que recibiría esta carta.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e16', type: 'COMBAT_MOD', value: 'SHIELD', duration: 1, target: 'SELF' }],
    },
    'DEF_COUNTER_1': {
        id: 'DEF_COUNTER_1',
        name: 'Contramelodía',
        description: 'Contrarresta: Cancela el efecto de una carta objetivo y gana +2/+2.',
        trigger: 'ON_REACTION',
        effects: [{ id: 'e17', type: 'COMBAT_MOD', value: 'COUNTER', duration: 0, target: 'SELF' }],
    },

    // --- UTILITY ABILITIES ---
    'UTIL_FLASH_1': {
        id: 'UTIL_FLASH_1',
        name: 'Instantáneo',
        description: 'Puedes jugar esta carta en cualquier momento (incluso en turno del oponente).',
        trigger: 'INSTANT',
        effects: [{ id: 'e18', type: 'SPECIAL_ACTION', value: 'INSTANT_PLAY', duration: 0, target: 'SELF' }],
    },
    'UTIL_SCRY_1': {
        id: 'UTIL_SCRY_1',
        name: 'Visión Musical',
        description: 'Mira las 3 cartas superiores de tu mazo y reordénalas como desees.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e19', type: 'DRAW_MOD', value: 'SCRY_3', duration: 0, target: 'SELF' }],
    },
    'UTIL_MANA_RAMP_1': {
        id: 'UTIL_MANA_RAMP_1',
        name: 'Solo de Energía',
        description: 'Gana +2 energía este turno, pero solo puedes jugar una carta.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e20', type: 'ENERGY_MOD', value: 'ENERGY_RAMP', amount: 2, duration: 0, target: 'SELF' }],
    },

    // --- SYNERGY ABILITIES ---
    'SYN_GENRE_MASTER_1': {
        id: 'SYN_GENRE_MASTER_1',
        name: 'Gurú del Género',
        description: 'Todas tus cartas de este género ganen +1/+1.',
        trigger: 'PASSIVE',
        effects: [{ id: 'e21', type: 'GLOBAL_BUFF', value: 'GENRE_BUFF', duration: 0, target: 'ALL_SELF' }],
    },
    'SYN_ALBUM_COMBO_1': {
        id: 'SYN_ALBUM_COMBO_1',
        name: 'Album Completo',
        description: 'Si tienes 3+ cartas del mismo álbum en juego, todas ganan Trample.',
        trigger: 'PASSIVE',
        effects: [{ id: 'e22', type: 'GLOBAL_BUFF', value: 'ALBUM_COMBO', duration: 0, target: 'ALL_SELF' }],
    },
    'SYN_RARITY_BOOST_1': {
        id: 'SYN_RARITY_BOOST_1',
        name: 'Coleccionista Élite',
        description: 'Por cada rareza diferente que controles, gana +1 energía máxima.',
        trigger: 'PASSIVE',
        effects: [{ id: 'e23', type: 'ENERGY_MOD', value: 'ENERGY_BOOST', duration: 0, target: 'SELF' }],
    },

    // --- BOARD CONTROL ---
    'BOARD_REMOVE_1': {
        id: 'BOARD_REMOVE_1',
        name: 'Censura',
        description: 'Destruye una carta objetivo del tablero.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e24', type: 'BOARD_CONTROL', value: 'REMOVE_TARGET', duration: 0, target: 'ENEMY' }],
    },
    'BOARD_SWAP_1': {
        id: 'BOARD_SWAP_1',
        name: 'Remix Controlado',
        description: 'Intercambia esta carta con una carta objetivo del tablero.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e25', type: 'BOARD_CONTROL', value: 'SWAP_TARGET', duration: 0, target: 'ENEMY' }],
    },
    'BOARD_FREEZE_1': {
        id: 'BOARD_FREEZE_1',
        name: 'Pausa Dramática',
        description: 'Las cartas objetivo no pueden atacar ni usar habilidades por 1 turno.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e26', type: 'BOARD_CONTROL', value: 'FREEZE_TARGET', duration: 1, target: 'ENEMY' }],
    },

    // --- META ABILITIES ---
    'META_HAND_DISCARD_1': {
        id: 'META_HAND_DISCARD_1',
        name: 'Descarte Estratégico',
        description: 'Descarta hasta 3 cartas para robar 3 cartas.',
        trigger: 'ON_SACRIFICE',
        effects: [{ id: 'e27', type: 'DRAW_MOD', value: 'DISCARD_DRAW', amount: 3, duration: 0, target: 'SELF' }],
    },
    'META_DECK_SEARCH_1': {
        id: 'META_DECK_SEARCH_1',
        name: 'Búsqueda Profunda',
        description: 'Busca en tu mazo una carta por nombre y ponla en tu mano.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e28', type: 'DRAW_MOD', value: 'TUTOR_NAMED', duration: 0, target: 'SELF' }],
    },
    'META_GRAVEYARD_RECALL_1': {
        id: 'META_GRAVEYARD_RECALL_1',
        name: 'Regreso del Más Allá',
        description: 'Devuelve una carta de tu cementerio directamente al campo de batalla.',
        trigger: 'ON_PLAY',
        effects: [{ id: 'e29', type: 'GRAVEYARD_CONTROL', value: 'RECALL_TARGET', duration: 0, target: 'SELF' }],
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
