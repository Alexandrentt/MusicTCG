// lib/engine/combinationMatrix.ts

import { Effect, Target, Trigger, CardRarity, AbilityType, AbilityCategory } from '@/types/types';

export interface CombinationMatrix {
  // Core components
  triggers: Trigger[];
  effects: Effect[];
  targets: Target[];
  conditions: string[];
  modifiers: string[];

  // Weighted probabilities by rarity
  weights: {
    [key in CardRarity]: {
      triggers: Record<Trigger, number>;
      effects: Record<Effect, number>;
      targets: Record<Target, number>;
      conditions: Record<string, number>;
      modifiers: Record<string, number>;
    };
  };

  // Restrictions
  restrictions: {
    maxAbilitiesPerCard: Record<CardRarity, number>;
    forbiddenCombinations: Array<{
      trigger?: Trigger;
      effect: Effect;
      target?: Target;
      condition?: string;
      reason: string;
    }>;
    costRestrictions: Array<{
      effect: Effect;
      minCost: number;
      maxCost?: number;
      reason: string;
    }>;
  };
}

/**
 * MATRIZ COMPLETA DE 100K+ COMBINACIONES
 */
export const ENERGY_MATRIX: CombinationMatrix = {
  // 6 TRIGGERS BASE
  triggers: [
    Trigger.INTRO,      // Al entrar en juego
    Trigger.OUTRO,      // Al salir del juego  
    Trigger.ATTACK,     // Al atacar
    Trigger.SOLO,       // Al activar habilidad especial
    Trigger.AURA,       // Pasivo - siempre activo
    Trigger.SACRIFICE   // Al sacrificar carta
  ],

  // 31 EFECTOS (22 antiguos + 9 nuevos de energía)
  effects: [
    // Antiguos
    Effect.DAMAGE,
    Effect.HEAL,
    Effect.HEAL_REPUTATION,
    Effect.BUFF,
    Effect.DEBUFF,
    Effect.NERF,
    Effect.DRAW,
    Effect.MILL,
    Effect.SILENCE,
    Effect.TRAMPLE,
    Effect.STEALTH,
    Effect.HASTE,
    Effect.HYPE,
    Effect.BOICOT,
    Effect.ENCORE,
    Effect.SOUNDCHECK,
    Effect.FEATURING,
    Effect.CANCELLED,
    Effect.DISCO_ORO,
    Effect.MIND_CONTROL,

    // Nuevos - ENERGÍA
    Effect.ENERGY_RAMP,           // +1 energía máxima
    Effect.ENERGY_DENIAL,         // -1 energía rival
    Effect.ENERGY_BURST,          // +X energía temporal
    Effect.ENERGY_RECOVERY,       // Recuperar de zona energía
    Effect.ENERGY_LOCK,           // Bloquear sacrificios
    Effect.ENERGY_STEAL,          // Robar energía rival

    // Nuevos - SACRIFICIO
    Effect.FORCE_SACRIFICE,       // Obligar a sacrificar
    Effect.SACRIFICE_PAYOFF       // Efecto por sacrificios
  ],

  // 16 TARGETS (9 antiguos + 7 nuevos de energía)
  targets: [
    // Antiguos
    Target.ENEMY_REPUTATION,
    Target.RANDOM_ENEMY,
    Target.SAME_ALBUM_CARDS,
    Target.TAPPED_CARDS,
    Target.SELF,
    Target.ALL_CARDS,
    Target.ALL_ENEMY_CARDS,
    Target.ALL_OWN_CARDS,
    Target.CONDITIONAL_CARDS,

    // Nuevos - ZONA DE ENERGÍA
    Target.RIVAL_ENERGY_ZONE_RANDOM,
    Target.RIVAL_ENERGY_ZONE_ALL,
    Target.YOUR_ENERGY_ZONE_ALL,

    // Nuevos - CONDICIONALES
    Target.ENEMY_BACKSTAGE
  ],

  // 15 CONDICIONES (7 antiguas + 8 nuevas de energía)
  conditions: [
    // Antiguas
    'UNDERDOG',
    'MAINSTREAM',
    'SOLO',
    'EMPTY_HAND',

    // Nuevas - ENERGÍA
    'IF_MORE_ENERGY',
    'IF_LESS_ENERGY',
    'IF_SACRIFICED_THIS_TURN',

    // Nuevas - BACKSTAGE
    'IF_REACTIVATED_THIS_TURN',
    'IF_REPLACED_THIS_TURN',

    // Nuevas - GÉNERO/ÁLBUM
    'IF_HAVE_GENRE_SYNERGY',
    'IF_HAVE_ALBUM_COMBO',
    'IF_PLAYLIST_MATCH',

    // Nuevas - COMBATE
    'IF_DAMAGED_THIS_TURN',
    'IF_ATTACKED_THIS_TURN',
    'IF_BOARD_CONTROL'
  ],

  // MODIFICADORES
  modifiers: [
    'DOUBLE',           // Duplicar efecto
    'TRIPLE',           // Triplicar efecto  
    'PERMANENT',        // Efecto permanente
    'TEMPORARY',        // Efecto temporal
    'REPEATABLE',       // Se puede repetir
    'SCALED',           // Escalado por algo
    'CONDICIONAL',      // Solo si se cumple condición
    'INSTANT',          // Efecto instantáneo

    // 🌊 NUEVOS: Modificadores de Cascada
    'CASCADE',          // Efecto en cascada
    'DOMINO',           // Efecto dominó
    'CHAIN_REACTION',    // Reacción en cadena
    'SNOWBALL',         // Efecto bola de nieve
    'EXPONENTIAL',       // Crecimiento exponencial
    'VIRAL',            // Se propaga a otras cartas
    'NUCLEAR',          // Efecto masivo
    'QUANTUM',          // Efecto cuántico (probabilístico)
    'INFINITE',         // Bucle controlado
    'APOCALYPTIC'       // Efecto devastador
  ],

  // PESOS POR RAREZA (para balance)
  weights: {
    'BRONZE': {
      triggers: {
        [Trigger.INTRO]: 40,
        [Trigger.OUTRO]: 10,
        [Trigger.ATTACK]: 20,
        [Trigger.SOLO]: 15,
        [Trigger.AURA]: 10,
        [Trigger.SACRIFICE]: 5
      },
      effects: {
        [Effect.DAMAGE]: 25,
        [Effect.HEAL]: 20,
        [Effect.BUFF]: 15,
        [Effect.DEBUFF]: 10,
        [Effect.DRAW]: 8,
        [Effect.HASTE]: 5,
        [Effect.STEALTH]: 5,
        [Effect.ENERGY_RAMP]: 2,
        [Effect.ENERGY_BURST]: 2,
        // Completar con todos los efectos requeridos
        [Effect.HYPE]: 3,
        [Effect.MILL]: 2,
        [Effect.SILENCE]: 2,
        [Effect.TRAMPLE]: 3,
        [Effect.HEAL_REPUTATION]: 4,
        [Effect.NERF]: 3,
        [Effect.BOICOT]: 2,
        [Effect.ENCORE]: 2,
        [Effect.SOUNDCHECK]: 2,
        [Effect.FEATURING]: 2,
        [Effect.CANCELLED]: 1,
        [Effect.DISCO_ORO]: 1,
        [Effect.MIND_CONTROL]: 1,
        [Effect.ENERGY_DENIAL]: 2,
        [Effect.ENERGY_RECOVERY]: 2,
        [Effect.ENERGY_LOCK]: 1,
        [Effect.ENERGY_STEAL]: 1,
        [Effect.FORCE_SACRIFICE]: 1,
        [Effect.SACRIFICE_PAYOFF]: 1,
        [Effect.MANA_DISRUPTION]: 1,
        [Effect.ALL_CARDS]: 1,
        [Effect.ENERGY_PROTECTION]: 1
      },
      targets: {
        [Target.SELF]: 40,
        [Target.RANDOM_ENEMY]: 20,
        [Target.ENEMY_REPUTATION]: 15,
        [Target.ALL_OWN_CARDS]: 10,
        [Target.ALL_ENEMY_CARDS]: 5,
        [Target.RIVAL_ENERGY_ZONE_RANDOM]: 2,
        [Target.RIVAL_ENERGY_ZONE_ALL]: 1,
        [Target.YOUR_ENERGY_ZONE_ALL]: 2,
        [Target.ENEMY_BACKSTAGE]: 2,
        [Target.SAME_ALBUM_CARDS]: 3,
        [Target.TAPPED_CARDS]: 3,
        [Target.ALL_CARDS]: 2,
        [Target.CONDITIONAL_CARDS]: 2
      },
      conditions: {
        'NONE': 60,
        'IF_MORE_ENERGY': 10,
        'IF_LESS_ENERGY': 10,
        'EMPTY_HAND': 8,
        'UNDERDOG': 5,
        'IF_SACRIFICED_THIS_TURN': 3,
        'MAINSTREAM': 5,
        'SOLO': 4,
        'IF_REACTIVATED_THIS_TURN': 2,
        'IF_REPLACED_THIS_TURN': 2,
        'IF_HAVE_GENRE_SYNERGY': 3,
        'IF_HAVE_ALBUM_COMBO': 2,
        'IF_PLAYLIST_MATCH': 2,
        'IF_DAMAGED_THIS_TURN': 2,
        'IF_ATTACKED_THIS_TURN': 2,
        'IF_BOARD_CONTROL': 2
      },
      modifiers: {
        'NONE': 70,
        'TEMPORARY': 15,
        'SCALED': 8,
        'DOUBLE': 4,
        'REPEATABLE': 2,
        'PERMANENT': 1
      }
    },
    'SILVER': {
      // Similar pero con más variedad y efectos más potentes
      triggers: {
        [Trigger.INTRO]: 35,
        [Trigger.OUTRO]: 12,
        [Trigger.ATTACK]: 18,
        [Trigger.SOLO]: 20,
        [Trigger.AURA]: 12,
        [Trigger.SACRIFICE]: 8
      },
      effects: {
        [Effect.DAMAGE]: 20,
        [Effect.HEAL]: 18,
        [Effect.DRAW]: 12,
        [Effect.BUFF]: 10,
        [Effect.ENERGY_RAMP]: 8,
        [Effect.ENERGY_BURST]: 6,
        [Effect.HASTE]: 5,
        [Effect.STEALTH]: 5,
        [Effect.TRAMPLE]: 4,
        // Completar con todos los efectos...
        [Effect.HYPE]: 5,
        [Effect.MILL]: 3,
        [Effect.SILENCE]: 3,
        [Effect.HEAL_REPUTATION]: 4,
        [Effect.NERF]: 3,
        [Effect.BOICOT]: 2,
        [Effect.ENCORE]: 2,
        [Effect.SOUNDCHECK]: 2,
        [Effect.FEATURING]: 2,
        [Effect.CANCELLED]: 1,
        [Effect.DISCO_ORO]: 1,
        [Effect.MIND_CONTROL]: 2,
        [Effect.ENERGY_DENIAL]: 4,
        [Effect.ENERGY_RECOVERY]: 3,
        [Effect.ENERGY_LOCK]: 2,
        [Effect.ENERGY_STEAL]: 3,
        [Effect.FORCE_SACRIFICE]: 2,
        [Effect.SACRIFICE_PAYOFF]: 2
      },
      targets: {
        [Target.SELF]: 35,
        [Target.RANDOM_ENEMY]: 18,
        [Target.ENEMY_REPUTATION]: 12,
        [Target.ALL_OWN_CARDS]: 12,
        [Target.ALL_ENEMY_CARDS]: 8,
        [Target.RIVAL_ENERGY_ZONE_RANDOM]: 4,
        [Target.RIVAL_ENERGY_ZONE_ALL]: 2,
        [Target.YOUR_ENERGY_ZONE_ALL]: 3,
        [Target.ENEMY_BACKSTAGE]: 3,
        [Target.SAME_ALBUM_CARDS]: 4,
        [Target.TAPPED_CARDS]: 4,
        [Target.ALL_CARDS]: 3,
        [Target.CONDITIONAL_CARDS]: 3
      },
      conditions: {
        'NONE': 55,
        'IF_MORE_ENERGY': 12,
        'IF_LESS_ENERGY': 10,
        'EMPTY_HAND': 8,
        'UNDERDOG': 6,
        'IF_SACRIFICED_THIS_TURN': 4,
        'MAINSTREAM': 6,
        'SOLO': 5,
        'IF_REACTIVATED_THIS_TURN': 3,
        'IF_REPLACED_THIS_TURN': 3,
        'IF_HAVE_GENRE_SYNERGY': 4,
        'IF_HAVE_ALBUM_COMBO': 3,
        'IF_PLAYLIST_MATCH': 3,
        'IF_DAMAGED_THIS_TURN': 3,
        'IF_ATTACKED_THIS_TURN': 3,
        'IF_BOARD_CONTROL': 3
      },
      modifiers: {
        'NONE': 65,
        'TEMPORARY': 16,
        'SCALED': 8,
        'DOUBLE': 6,
        'REPEATABLE': 3,
        'PERMANENT': 2
      }
    } as any,
    'GOLD': {
      // Efectos más poderosos y combinaciones más interesantes
      triggers: {
        [Trigger.INTRO]: 30,
        [Trigger.OUTRO]: 15,
        [Trigger.ATTACK]: 15,
        [Trigger.SOLO]: 25,
        [Trigger.AURA]: 10,
        [Trigger.SACRIFICE]: 10
      },
      effects: {
        [Effect.ENERGY_RAMP]: 15,
        [Effect.ENERGY_STEAL]: 10,
        [Effect.DRAW]: 10,
        [Effect.MIND_CONTROL]: 5,
        [Effect.DAMAGE]: 8,
        [Effect.HEAL]: 8,
        [Effect.ENERGY_BURST]: 8,
        [Effect.ENERGY_LOCK]: 6,
        [Effect.TRAMPLE]: 6,
        [Effect.HASTE]: 6,
        // Completar con todos los efectos...
        [Effect.HYPE]: 6,
        [Effect.MILL]: 4,
        [Effect.SILENCE]: 4,
        [Effect.HEAL_REPUTATION]: 5,
        [Effect.NERF]: 4,
        [Effect.BOICOT]: 3,
        [Effect.ENCORE]: 3,
        [Effect.SOUNDCHECK]: 3,
        [Effect.FEATURING]: 3,
        [Effect.CANCELLED]: 2,
        [Effect.DISCO_ORO]: 2,
        [Effect.ENERGY_DENIAL]: 6,
        [Effect.ENERGY_RECOVERY]: 4,
        [Effect.FORCE_SACRIFICE]: 4,
        [Effect.SACRIFICE_PAYOFF]: 4,
        [Effect.MANA_DISRUPTION]: 3,
        [Effect.ALL_CARDS]: 2,
        [Effect.ENERGY_PROTECTION]: 2
      },
      targets: {
        [Target.SELF]: 30,
        [Target.RANDOM_ENEMY]: 15,
        [Target.ENEMY_REPUTATION]: 10,
        [Target.ALL_OWN_CARDS]: 15,
        [Target.ALL_ENEMY_CARDS]: 10,
        [Target.RIVAL_ENERGY_ZONE_RANDOM]: 6,
        [Target.RIVAL_ENERGY_ZONE_ALL]: 3,
        [Target.YOUR_ENERGY_ZONE_ALL]: 4,
        [Target.ENEMY_BACKSTAGE]: 4,
        [Target.SAME_ALBUM_CARDS]: 5,
        [Target.TAPPED_CARDS]: 5,
        [Target.ALL_CARDS]: 4,
        [Target.CONDITIONAL_CARDS]: 4
      },
      conditions: {
        'NONE': 50,
        'IF_MORE_ENERGY': 15,
        'IF_LESS_ENERGY': 12,
        'EMPTY_HAND': 8,
        'UNDERDOG': 7,
        'IF_SACRIFICED_THIS_TURN': 5,
        'MAINSTREAM': 7,
        'SOLO': 6,
        'IF_REACTIVATED_THIS_TURN': 4,
        'IF_REPLACED_THIS_TURN': 4,
        'IF_HAVE_GENRE_SYNERGY': 5,
        'IF_HAVE_ALBUM_COMBO': 4,
        'IF_PLAYLIST_MATCH': 4,
        'IF_DAMAGED_THIS_TURN': 4,
        'IF_ATTACKED_THIS_TURN': 4,
        'IF_BOARD_CONTROL': 4
      },
      modifiers: {
        'NONE': 60,
        'TEMPORARY': 18,
        'SCALED': 8,
        'DOUBLE': 8,
        'REPEATABLE': 4,
        'PERMANENT': 2
      }
    } as any,
    'PLATINUM': {
      // Efectos muy potentes pero balanceados
      triggers: {
        [Trigger.INTRO]: 25,
        [Trigger.OUTRO]: 20,
        [Trigger.ATTACK]: 12,
        [Trigger.SOLO]: 28,
        [Trigger.AURA]: 8,
        [Trigger.SACRIFICE]: 12
      },
      effects: {
        [Effect.ENERGY_RAMP]: 12,
        [Effect.ENERGY_STEAL]: 8,
        [Effect.MIND_CONTROL]: 6,
        [Effect.DRAW]: 8,
        [Effect.ENERGY_BURST]: 8,
        [Effect.ENERGY_LOCK]: 6,
        [Effect.TRAMPLE]: 8,
        [Effect.HASTE]: 8,
        [Effect.DAMAGE]: 6,
        [Effect.HEAL]: 6,
        // Completar con todos los efectos...
        [Effect.HYPE]: 8,
        [Effect.MILL]: 5,
        [Effect.SILENCE]: 5,
        [Effect.HEAL_REPUTATION]: 6,
        [Effect.NERF]: 5,
        [Effect.BOICOT]: 4,
        [Effect.ENCORE]: 4,
        [Effect.SOUNDCHECK]: 4,
        [Effect.FEATURING]: 4,
        [Effect.CANCELLED]: 3,
        [Effect.DISCO_ORO]: 3,
        [Effect.ENERGY_DENIAL]: 8,
        [Effect.ENERGY_RECOVERY]: 5,
        [Effect.FORCE_SACRIFICE]: 5,
        [Effect.SACRIFICE_PAYOFF]: 5,
        [Effect.MANA_DISRUPTION]: 4,
        [Effect.ALL_CARDS]: 3,
        [Effect.ENERGY_PROTECTION]: 3
      },
      targets: {
        [Target.SELF]: 25,
        [Target.RANDOM_ENEMY]: 12,
        [Target.ENEMY_REPUTATION]: 8,
        [Target.ALL_OWN_CARDS]: 18,
        [Target.ALL_ENEMY_CARDS]: 12,
        [Target.RIVAL_ENERGY_ZONE_RANDOM]: 8,
        [Target.RIVAL_ENERGY_ZONE_ALL]: 4,
        [Target.YOUR_ENERGY_ZONE_ALL]: 5,
        [Target.ENEMY_BACKSTAGE]: 5,
        [Target.SAME_ALBUM_CARDS]: 6,
        [Target.TAPPED_CARDS]: 6,
        [Target.ALL_CARDS]: 5,
        [Target.CONDITIONAL_CARDS]: 5
      },
      conditions: {
        'NONE': 45,
        'IF_MORE_ENERGY': 18,
        'IF_LESS_ENERGY': 15,
        'EMPTY_HAND': 8,
        'UNDERDOG': 8,
        'IF_SACRIFICED_THIS_TURN': 6,
        'MAINSTREAM': 8,
        'SOLO': 7,
        'IF_REACTIVATED_THIS_TURN': 5,
        'IF_REPLACED_THIS_TURN': 5,
        'IF_HAVE_GENRE_SYNERGY': 6,
        'IF_HAVE_ALBUM_COMBO': 5,
        'IF_PLAYLIST_MATCH': 5,
        'IF_DAMAGED_THIS_TURN': 5,
        'IF_ATTACKED_THIS_TURN': 5,
        'IF_BOARD_CONTROL': 5
      },
      modifiers: {
        'NONE': 55,
        'TEMPORARY': 20,
        'SCALED': 8,
        'DOUBLE': 10,
        'REPEATABLE': 5,
        'PERMANENT': 2
      }
    } as any,
    'MYTHIC': {
      // NO SE USA - Mythic será diseñado a mano
    } as any
  },

  // RESTRICCIONES DE SEGURIDAD
  restrictions: {
    maxAbilitiesPerCard: {
      'BRONZE': 1,
      'SILVER': 2,
      'GOLD': 2,
      'PLATINUM': 3,
      'MYTHIC': 4
    },
    forbiddenCombinations: [
      {
        trigger: Trigger.AURA,
        effect: Effect.ENERGY_RAMP,
        reason: "AURA + ENERGY_RAMP = infinite loop"
      },
      {
        effect: Effect.ENERGY_STEAL,
        target: Target.RIVAL_ENERGY_ZONE_ALL,
        reason: "STEAL ALL = unfair"
      },
      {
        effect: Effect.MIND_CONTROL,
        target: Target.ALL_ENEMY_CARDS,
        reason: "MIND_CONTROL ALL = game over"
      },
      {
        trigger: Trigger.SACRIFICE,
        effect: Effect.ENERGY_RAMP,
        condition: 'IF_SACRIFICED_THIS_TURN',
        reason: "Sacrifice loop infinito"
      },
      {
        effect: Effect.DRAW,
        target: Target.ALL_CARDS,
        reason: "DRAW ALL = deck empty"
      }
    ],
    costRestrictions: [
      {
        effect: Effect.ENERGY_RAMP,
        minCost: 4,
        reason: "ENERGY_RAMP requiere carta cara"
      },
      {
        effect: Effect.MIND_CONTROL,
        minCost: 6,
        reason: "MIND_CONTROL requiere carta muy cara"
      },
      {
        effect: Effect.ENERGY_STEAL,
        minCost: 3,
        reason: "ENERGY_STEAL requiere carta media"
      },
      {
        effect: Effect.ENERGY_LOCK,
        minCost: 4,
        reason: "ENERGY_LOCK requiere carta cara"
      }
    ]
  }
};

/**
 * FUNCIÓN DE SELECCIÓN PONDERADA
 */
export function selectWeighted<T>(
  items: T[],
  weights: Record<string, number>
): T {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    const weight = weights[item as string] || 0;
    random -= weight;
    if (random <= 0) {
      return item;
    }
  }

  return items[0]; // Fallback
}

/**
 * OBTENER PESOS POR RAREZA
 */
export function getWeightsByRarity(
  rarity: CardRarity,
  type: 'triggers' | 'effects' | 'targets' | 'conditions' | 'modifiers'
): Record<string, number> {
  return ENERGY_MATRIX.weights[rarity]?.[type] || {};
}

/**
 * VALIDAR RESTRICCIÓN DE COSTO
 */
export function validateCostRestriction(
  effect: Effect,
  cardCost: number
): { valid: boolean; reason?: string } {
  const restriction = ENERGY_MATRIX.restrictions.costRestrictions.find(
    r => r.effect === effect
  );

  if (restriction) {
    if (cardCost < restriction.minCost) {
      return {
        valid: false,
        reason: restriction.reason
      };
    }

    if (restriction.maxCost && cardCost > restriction.maxCost) {
      return {
        valid: false,
        reason: restriction.reason
      };
    }
  }

  return { valid: true };
}

/**
 * CALCULAR COMBINACIONES TOTALES (para debugging)
 */
export function calculateTotalCombinations(): number {
  const triggerCount = ENERGY_MATRIX.triggers.length;
  const effectCount = ENERGY_MATRIX.effects.length;
  const targetCount = ENERGY_MATRIX.targets.length;
  const conditionCount = ENERGY_MATRIX.conditions.length;
  const modifierCount = ENERGY_MATRIX.modifiers.length;

  // Fórmula: triggers × effects × targets × conditions × modifiers
  return triggerCount * effectCount * targetCount * conditionCount * modifierCount;
}

console.log(`🎯 Total de combinaciones posibles: ${calculateTotalCombinations().toLocaleString()}`);
