// lib/engine/abilityValidator.ts

import { GeneratedAbility, CardRarity, AbilityType, Effect, Target, Trigger } from '@/types/types';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'BROKEN';
  warnings?: string[];
}

export interface ProceduralAbility {
  id: string;
  trigger: Trigger;
  effect: Effect;
  target: Target;
  value: number;
  condition?: string;
  modifier?: string;
  abilityType: AbilityType;
  category: string;
  activationCost: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  duration?: number; // Added duration property
  
  // NUEVO: Sistema de Cascadas
  cascades?: any[]; // CascadeAbility[] - simplified for now
  cascadeDepth?: number;
  cascadeTrigger?: string;
}

/**
 * VALIDACIÓN EN 3 NIVELES PARA EVITAR COMBOS ROTOS
 */
export function validateProceduralAbility(
  ability: ProceduralAbility, 
  card: { cost: number; rarity: CardRarity }
): ValidationResult {
  const warnings: string[] = [];
  
  // NIVEL 1: Validación Matemática (rápida)
  const mathValidation = validateMathematicalRules(ability, card);
  if (!mathValidation.valid) {
    return mathValidation;
  }
  
  // NIVEL 2: Validación Lógica (medio)
  const logicalValidation = validateLogicalRules(ability, card);
  if (!logicalValidation.valid) {
    return logicalValidation;
  }
  
  // NIVEL 3: Validación de Balance (estratégico)
  const balanceValidation = validateBalanceRules(ability, card, warnings);
  if (!balanceValidation.valid) {
    return balanceValidation;
  }
  
  return {
    valid: true,
    riskLevel: calculateRiskLevel(ability, card),
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * NIVEL 1: REGLAS MATEMÁTICAS BÁSICAS
 */
function validateMathematicalRules(
  ability: ProceduralAbility, 
  card: { cost: number; rarity: CardRarity }
): ValidationResult {
  // REGLA 1: No valores negativos absurdos
  if (ability.value < -10) {
    return {
      valid: false,
      reason: "Valor demasiado negativo: " + ability.value,
      riskLevel: 'BROKEN'
    };
  }
  
  // REGLA 2: No valores extremadamente altos
  if (ability.value > 20) {
    return {
      valid: false,
      reason: "Valor demasiado alto: " + ability.value,
      riskLevel: 'BROKEN'
    };
  }
  
  // REGLA 3: Costo de activación no puede exceder costo de carta
  if (ability.activationCost && ability.activationCost > card.cost * 2) {
    return {
      valid: false,
      reason: "Costo de activación demasiado alto para la carta",
      riskLevel: 'BROKEN'
    };
  }
  
  // REGLA 4: Duración no puede ser negativa
  if (ability.duration !== undefined && ability.duration < 0) {
    return {
      valid: false,
      reason: "Duración negativa no permitida",
      riskLevel: 'BROKEN'
    };
  }
  
  return { valid: true, riskLevel: 'LOW' };
}

/**
 * NIVEL 2: REGLAS LÓGICAS (COMBINACIONES PROHIBIDAS)
 */
function validateLogicalRules(
  ability: ProceduralAbility, 
  card: { cost: number; rarity: CardRarity }
): ValidationResult {
  // REGLA 1: No ENERGY_RAMP en AURA (infinite energy loop)
  if (ability.effect === Effect.ENERGY_RAMP && ability.trigger === Trigger.AURA) {
    return {
      valid: false,
      reason: "ENERGY_RAMP en AURA = infinite energy loop",
      riskLevel: 'BROKEN'
    };
  }
  
  // REGLA 2: No ENERGY_STEAL en ALL + REPEATABLE
  if (
    ability.effect === Effect.ENERGY_STEAL &&
    ability.target === Target.ALL_ENEMY_CARDS &&
    ability.modifier === 'REPEATABLE'
  ) {
    return {
      valid: false,
      reason: "STEAL ALL + REPEATABLE = unfair",
      riskLevel: 'BROKEN'
    };
  }
  
  // REGLA 3: ENERGY_RAMP solo para cartas de costo 4+
  if (ability.effect === Effect.ENERGY_RAMP && card.cost < 4) {
    return {
      valid: false,
      reason: "ENERGY_RAMP limitado a cartas con costo 4+",
      riskLevel: 'BROKEN'
    };
  }
  
  // REGLA 4: No SACRIFICE_FOR_EFFECT + ENERGY_RAMP juntos
  if (
    ability.effect === Effect.FORCE_SACRIFICE &&
    (ability.target === Target.RIVAL_ENERGY_ZONE_RANDOM || 
     ability.target === Target.RIVAL_ENERGY_ZONE_ALL ||
     ability.target === Target.YOUR_ENERGY_ZONE_ALL)
  ) {
    return {
      valid: false,
      reason: "Sacrificar para energía + ramp = demasiado potente",
      riskLevel: 'BROKEN'
    };
  }
  
  // REGLA 5: Condiciones "IF_SACRIFICED_THIS_TURN" solo en cartas de costo 3 o menos
  if (
    ability.condition === 'IF_SACRIFICED_THIS_TURN' &&
    card.cost > 3
  ) {
    return {
      valid: false,
      reason: "Combos de sacrificio solo para cartas baratas",
      riskLevel: 'BROKEN'
    };
  }
  
  // REGLA 6: No DRAW en ALL sin costo alto
  if (
    ability.effect === Effect.DRAW &&
    ability.target === Target.ALL_CARDS &&
    card.cost < 5
  ) {
    return {
      valid: false,
      reason: "DRAW ALL requiere carta cara",
      riskLevel: 'BROKEN'
    };
  }
  
  // REGLA 7: No MIND_CONTROL en cartas baratas
  if (ability.effect === Effect.MIND_CONTROL && card.cost < 6) {
    return {
      valid: false,
      reason: "MIND_CONTROL requiere carta cara",
      riskLevel: 'BROKEN'
    };
  }
  
  return { valid: true, riskLevel: 'LOW' };
}

/**
 * NIVEL 3: REGLAS DE BALANCE (RIESGO MEDIO/ALTO)
 */
function validateBalanceRules(
  ability: ProceduralAbility, 
  card: { cost: number; rarity: CardRarity },
  warnings: string[]
): ValidationResult {
  // WARNING 1: Muchos DRAW en carta barata
  if (ability.effect === Effect.DRAW && ability.value > 2 && card.cost < 3) {
    warnings.push("Mucho robo en carta barata - puede ser muy fuerte");
  }
  
  // WARNING 2: ENERGY_STEAL sin condición
  if (ability.effect === Effect.ENERGY_STEAL && !ability.condition) {
    warnings.push("ENERGY_STEAL sin condición - revisar balance");
  }
  
  // WARNING 3: DAMAGE alto sin costo
  if (ability.effect === Effect.DAMAGE && ability.value > 5 && card.cost < 3) {
    warnings.push("Daño alto en carta barata");
  }
  
  // WARNING 4: Combinaciones potentes
  if (
    ability.effect === Effect.HEAL &&
    ability.target === Target.ALL_CARDS &&
    card.cost < 4
  ) {
    warnings.push("Curación masiva en carta barata");
  }
  
  return { valid: true, riskLevel: 'MEDIUM' };
}

/**
 * CALCULAR NIVEL DE RIESGO GENERAL
 */
function calculateRiskLevel(
  ability: ProceduralAbility, 
  card: { cost: number; rarity: CardRarity }
): 'LOW' | 'MEDIUM' | 'HIGH' {
  let riskScore = 0;
  
  // Factores de riesgo
  if (ability.value > 10) riskScore += 2;
  if (ability.activationCost && ability.activationCost < 2) riskScore += 1;
  if (ability.target === Target.ALL_CARDS) riskScore += 1;
  if (ability.trigger === Trigger.AURA) riskScore += 1;
  if (ability.modifier === 'REPEATABLE') riskScore += 2;
  if (card.rarity === 'PLATINUM' || card.rarity === 'GOLD') riskScore += 1;
  
  if (riskScore >= 4) return 'HIGH';
  if (riskScore >= 2) return 'MEDIUM';
  return 'LOW';
}

/**
 * LISTA DE COMBINACIONES PROHIBIDAS (EXPANDIBLE)
 */
export const FORBIDDEN_COMBINATIONS: Array<{
  effects: Effect[];
  trigger?: Trigger;
  condition?: string;
  target?: Target;
  reason: string;
}> = [
  {
    effects: [Effect.ENERGY_RAMP, Effect.ENERGY_RAMP],
    reason: "No duplicar ENERGY_RAMP"
  },
  {
    effects: [Effect.FORCE_SACRIFICE, Effect.ENERGY_STEAL],
    condition: 'IF_SACRIFICED_THIS_TURN',
    reason: "Sacrificar para robar energía rival = desequilibrio"
  },
  {
    effects: [Effect.DRAW, Effect.DRAW],
    target: Target.ALL_CARDS,
    reason: "Dos DRAW en el mismo turno es demasiado robo"
  },
  {
    trigger: Trigger.AURA,
    effects: [Effect.DAMAGE, Effect.HEAL],
    condition: 'NONE',
    reason: "AURA + ALL_CARDS global = spam"
  },
  {
    effects: [Effect.ENERGY_BURST, Effect.ENERGY_BURST],
    reason: "No duplicar ENERGY_BURST"
  },
  {
    effects: [Effect.MIND_CONTROL, Effect.DRAW],
    reason: "Control + robo es demasiado ventajoso"
  }
];

/**
 * VALIDACIÓN RÁPIDA PARA PERFORMANCE
 */
export function quickValidate(ability: ProceduralAbility): boolean {
  // Checks rápidos para descartar combos obviamente rotos
  if (ability.value > 50 || ability.value < -20) return false;
  if (ability.activationCost && ability.activationCost < 0) return false;
  if (ability.duration !== undefined && ability.duration > 10) return false;
  
  // Check contra forbidden combos
  for (const forbidden of FORBIDDEN_COMBINATIONS) {
    if (forbidden.effects?.includes(ability.effect)) {
      if (forbidden.trigger && ability.trigger !== forbidden.trigger) continue;
      if (forbidden.condition && ability.condition !== forbidden.condition) continue;
      if (forbidden.target && ability.target !== forbidden.target) continue;
      return false;
    }
  }
  
  return true;
}
