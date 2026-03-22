// lib/engine/proceduralAbilityEngine.ts

import { 
  CardRarity, 
  Trigger, 
  Effect, 
  Target, 
  AbilityType, 
  AbilityCategory,
  GeneratedAbility 
} from '@/types/types';
import { 
  ProceduralAbility, 
  validateProceduralAbility, 
  quickValidate 
} from './abilityValidator';
import { 
  ENERGY_MATRIX, 
  selectWeighted, 
  getWeightsByRarity, 
  validateCostRestriction 
} from './combinationMatrix';
import { cascadeEngine, CascadeGenerationOptions } from './cascadeEngine';

export interface ProceduralGenerationResult {
  abilities: ProceduralAbility[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  generationTime: number;
  cacheHit?: boolean;
}

/**
 * CACHE PARA PERFORMANCE
 * Clave: `${cardId}_${rarity}_${cost}_${seed}`
 */
const ABILITY_CACHE = new Map<string, ProceduralGenerationResult>();
const MAX_CACHE_SIZE = 10000;

/**
 * MOTOR PROCEDURAL OPTIMIZADO
 * Genera habilidades únicas basadas en matriz de combinaciones
 */
export class ProceduralAbilityEngine {
  private cacheHits = 0;
  private cacheMisses = 0;
  
  /**
   * Genera habilidades para una carta específica
   */
  generate(
    cardId: string,
    rarity: CardRarity,
    cost: number,
    seed: string
  ): ProceduralGenerationResult {
    const startTime = performance.now();
    
    // 1. CACHE CHECK (optimización principal)
    const cacheKey = `${cardId}_${rarity}_${cost}_${seed}`;
    const cached = ABILITY_CACHE.get(cacheKey);
    
    if (cached) {
      this.cacheHits++;
      return { ...cached, cacheHit: true };
    }
    
    this.cacheMisses++;
    
    // 2. NO USAR PROCEDURAL PARA MYTHIC (diseño manual)
    if (rarity === 'MYTHIC') {
      return {
        abilities: [],
        riskLevel: 'LOW',
        generationTime: performance.now() - startTime
      };
    }
    
    // 3. GENERACIÓN PROCEDURAL
    const result = this.generateProceduralAbilities(
      cardId,
      rarity,
      cost,
      seed
    );
    
    // 4. CACHE RESULT
    if (this.cacheMisses % 100 === 0) {
      this.cleanupCache(); // Limpieza periódica
    }
    
    ABILITY_CACHE.set(cacheKey, result);
    
    return {
      ...result,
      generationTime: performance.now() - startTime
    };
  }
  
  /**
   * Generación procedural real
   */
  private generateProceduralAbilities(
    cardId: string,
    rarity: CardRarity,
    cost: number,
    seed: string
  ): ProceduralGenerationResult {
    const maxAbilities = ENERGY_MATRIX.restrictions.maxAbilitiesPerCard[rarity];
    const abilities: ProceduralAbility[] = [];
    const random = this.seededRandom(seed);
    
    // Generar hasta maxAbilities intentos
    for (let attempt = 0; attempt < maxAbilities * 3 && abilities.length < maxAbilities; attempt++) {
      const ability = this.generateSingleAbility(rarity, cost, random);
      
      if (ability && this.isValidCombination(ability, abilities)) {
        abilities.push(ability);
      }
    }
    
    // Calcular riesgo general
    const riskLevel = this.calculateOverallRisk(abilities);
    
    return {
      abilities,
      riskLevel,
      generationTime: 0
    };
  }
  
  /**
   * Genera una habilidad individual
   */
  private generateSingleAbility(
    rarity: CardRarity,
    cost: number,
    random: () => number
  ): ProceduralAbility | null {
    // 1. Selección PONDERADA (performance optimizada)
    const trigger = selectWeighted(ENERGY_MATRIX.triggers, getWeightsByRarity(rarity, 'triggers'));
    const effect = selectWeighted(ENERGY_MATRIX.effects, getWeightsByRarity(rarity, 'effects'));
    const target = selectWeighted(ENERGY_MATRIX.targets, getWeightsByRarity(rarity, 'targets'));
    
    // 2. Crear habilidad básica
    const quickAbility: ProceduralAbility = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trigger,
      effect,
      target,
      value: this.generateValue(effect, rarity, random),
      abilityType: this.determineAbilityType(trigger),
      category: this.determineCategory(effect),
      activationCost: this.calculateActivationCost(trigger, rarity),
      riskLevel: 'LOW' // Se ajustará después
    };
    
    // 3. Validación de costo
    const costValidation = validateCostRestriction(effect, cost);
    if (!costValidation.valid) {
      return null;
    }
    
    // 4. Añadir condiciones y modificadores (aleatorio)
    if (random() > 0.6) {
      quickAbility.condition = selectWeighted(
        ENERGY_MATRIX.conditions, 
        getWeightsByRarity(rarity, 'conditions')
      );
    }
    
    if (random() > 0.8) {
      quickAbility.modifier = selectWeighted(
        ENERGY_MATRIX.modifiers, 
        getWeightsByRarity(rarity, 'modifiers')
      );
    }
    
    // 5. Validación completa
    const validation = validateProceduralAbility(quickAbility, { cost, rarity });
    
    if (!validation.valid) {
      return null;
    }
    
    // 🌊 NUEVO: Generar cascadas para habilidades complejas
    if (rarity === 'PLATINUM' || (rarity === 'GOLD' && random() > 0.7)) {
      const cascadeOptions: CascadeGenerationOptions = {
        maxDepth: rarity === 'PLATINUM' ? 3 : 2,
        maxCascades: rarity === 'PLATINUM' ? 5 : 3,
        allowInfinite: false,
        allowApocalyptic: rarity === 'PLATINUM',
        riskTolerance: rarity === 'PLATINUM' ? 'EXTREME' : 'MODERATE'
      };
      
      // Crear GeneratedAbility temporal para cascadas
      const tempGeneratedAbility: GeneratedAbility = {
        id: quickAbility.id,
        trigger: quickAbility.trigger,
        effect: quickAbility.effect,
        target: quickAbility.target,
        value: quickAbility.value,
        text: `Temporary ability for cascade generation`,
        mechanicTags: [],
        statPenalty: 0,
        abilityType: quickAbility.abilityType,
        category: quickAbility.category as any,
        activationCost: quickAbility.activationCost,
        isPermanent: false,
        stackable: false
      };
      
      const abilityWithCascades = cascadeEngine.generateCascades(tempGeneratedAbility, rarity, cascadeOptions);
      
      // Validar cascadas
      const cascadeValidation = cascadeEngine.validateCascadeChain(abilityWithCascades);
      
      if (cascadeValidation.valid) {
        // Actualizar quickAbility con información de cascadas
        quickAbility.cascades = abilityWithCascades.cascades;
        quickAbility.cascadeDepth = abilityWithCascades.cascadeDepth;
        quickAbility.cascadeTrigger = abilityWithCascades.cascadeTrigger;
        
        // Ajustar riesgo basado en cascadas
        if (cascadeValidation.riskLevel === 'EXTREME') {
          quickAbility.riskLevel = 'HIGH';
        }
      }
    }
    
    return quickAbility;
  }
  
  /**
   * Calcula costo de activación
   */
  private calculateActivationCost(trigger: Trigger, rarity: CardRarity): number {
    const costs = {
      [Trigger.INTRO]: 0,
      [Trigger.OUTRO]: 0,
      [Trigger.ATTACK]: 0,
      [Trigger.AURA]: 0,
      [Trigger.SOLO]: 1,
      [Trigger.SACRIFICE]: 0
    };
    
    return costs[trigger] || 0;
  }

  /**
   * Genera valor numérico para el efecto
   */
  private generateValue(effect: Effect, rarity: CardRarity, random: () => number): number {
    const baseValues: Record<string, Record<string, number>> = {
      [Effect.DAMAGE]: { bronze: 1, silver: 2, gold: 3, platinum: 4 },
      [Effect.HEAL]: { bronze: 1, silver: 2, gold: 3, platinum: 4 },
      [Effect.BUFF]: { bronze: 1, silver: 1, gold: 2, platinum: 2 },
      [Effect.DEBUFF]: { bronze: -1, silver: -1, gold: -2, platinum: -2 },
      [Effect.DRAW]: { bronze: 0, silver: 1, gold: 1, platinum: 2 },
      [Effect.ENERGY_RAMP]: { bronze: 0, silver: 1, gold: 1, platinum: 1 },
      [Effect.ENERGY_BURST]: { bronze: 0, silver: 1, gold: 2, platinum: 3 },
      [Effect.ENERGY_STEAL]: { bronze: 0, silver: 0, gold: 1, platinum: 1 },
      [Effect.HYPE]: { bronze: 1, silver: 2, gold: 3, platinum: 4 },
      [Effect.TRAMPLE]: { bronze: 1, silver: 1, gold: 2, platinum: 2 },
      [Effect.HASTE]: { bronze: 0, silver: 1, gold: 1, platinum: 1 }
    };
    
    const baseValue = baseValues[effect]?.[rarity] || 1;
    
    // Variación aleatoria controlada
    const variation = Math.floor(random() * 3) - 1; // -1, 0, +1
    return Math.max(0, baseValue + variation);
  }
  
  /**
   * Determina tipo de habilidad basado en trigger
   */
  private determineAbilityType(trigger: Trigger): AbilityType {
    switch (trigger) {
      case Trigger.AURA: return AbilityType.PASSIVE;
      case Trigger.INTRO:
      case Trigger.OUTRO:
      case Trigger.ATTACK:
      case Trigger.SACRIFICE: return AbilityType.TRIGGERED;
      case Trigger.SOLO: return AbilityType.ACTIVATED;
      default: return AbilityType.TRIGGERED;
    }
  }
  
  /**
   * Determina categoría basada en efecto
   */
  private determineCategory(effect: Effect): string {
    const categories: Record<string, string> = {
      [Effect.DAMAGE]: 'COMBAT_OFFENSE',
      [Effect.HEAL]: 'COMBAT_DEFENSE',
      [Effect.BUFF]: 'COMBAT_DEFENSE',
      [Effect.DEBUFF]: 'CONTROL_TARGET',
      [Effect.DRAW]: 'RESOURCE_DRAW',
      [Effect.ENERGY_RAMP]: 'RESOURCE_ENERGY',
      [Effect.ENERGY_BURST]: 'RESOURCE_ENERGY',
      [Effect.ENERGY_STEAL]: 'RESOURCE_ENERGY',
      [Effect.HASTE]: 'COMBAT_MOBILITY',
      [Effect.TRAMPLE]: 'COMBAT_OFFENSE',
      [Effect.MIND_CONTROL]: 'CONTROL_TARGET',
      [Effect.HYPE]: 'RESOURCE_DRAW'
    };
    
    return categories[effect] || 'UTILITY_SEARCH';
  }
  
  /**
   * Verifica si la combinación es válida (no duplicados)
   */
  private isValidCombination(
    newAbility: ProceduralAbility,
    existingAbilities: ProceduralAbility[]
  ): boolean {
    // No duplicar exactamente la misma habilidad
    for (const existing of existingAbilities) {
      if (
        existing.trigger === newAbility.trigger &&
        existing.effect === newAbility.effect &&
        existing.target === newAbility.target
      ) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Calcula riesgo general de todas las habilidades
   */
  private calculateOverallRisk(abilities: ProceduralAbility[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (abilities.length === 0) return 'LOW';
    
    let riskScore = 0;
    
    for (const ability of abilities) {
      // Factores de riesgo por habilidad
      if (ability.value > 5) riskScore += 2;
      if (ability.target === Target.ALL_CARDS) riskScore += 2;
      if (ability.trigger === Trigger.AURA) riskScore += 1;
      if (ability.modifier === 'REPEATABLE') riskScore += 3;
      if (ability.effect === Effect.MIND_CONTROL) riskScore += 3;
      if (ability.effect === Effect.ENERGY_STEAL) riskScore += 2;
    }
    
    // Factor por cantidad de habilidades
    riskScore += abilities.length - 1;
    
    if (riskScore >= 6) return 'HIGH';
    if (riskScore >= 3) return 'MEDIUM';
    return 'LOW';
  }
  
  /**
   * Generador de números aleatorios con semilla (determinístico)
   */
  private seededRandom(seed: string): () => number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return () => {
      hash = (hash * 9301 + 49297) % 233280;
      return hash / 233280;
    };
  }
  
  /**
   * Limpieza de cache (mantener tamaño manejable)
   */
  private cleanupCache(): void {
    if (ABILITY_CACHE.size <= MAX_CACHE_SIZE) {
      return;
    }
    
    // Eliminar las entradas más antiguas (LRU simple)
    const entries = Array.from(ABILITY_CACHE.entries());
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    
    for (const [key] of toDelete) {
      ABILITY_CACHE.delete(key);
    }
  }
  
  /**
   * Estadísticas de performance
   */
  getStats() {
    return {
      cacheSize: ABILITY_CACHE.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }
  
  /**
   * Limpiar cache completamente
   */
  clearCache(): void {
    ABILITY_CACHE.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// Instancia global del motor
export const proceduralAbilityEngine = new ProceduralAbilityEngine();

/**
 * Función conveniente para convertir ProceduralAbility a GeneratedAbility
 */
export function convertToGeneratedAbility(
  procedural: ProceduralAbility,
  cardId: string
): GeneratedAbility {
  return {
    id: `${cardId}_${procedural.effect}_${procedural.trigger}`,
    trigger: procedural.trigger,
    effect: procedural.effect,
    target: procedural.target,
    value: procedural.value,
    condition: procedural.condition as any,
    modifier: procedural.modifier,
    text: generateAbilityText(procedural),
    mechanicTags: [procedural.category],
    cost: procedural.activationCost,
    statPenalty: 0,
    abilityType: procedural.abilityType,
    category: procedural.category as any,
    activationCost: procedural.activationCost,
    isPermanent: procedural.modifier === 'PERMANENT',
    stackable: procedural.modifier !== 'PERMANENT'
  };
}

/**
 * Genera texto descriptivo para la habilidad
 */
function generateAbilityText(ability: ProceduralAbility): string {
  const effectTexts: Record<string, string> = {
    [Effect.DAMAGE]: `Inflige ${ability.value} de daño`,
    [Effect.HEAL]: `Cura ${ability.value} de vida`,
    [Effect.BUFF]: `Otorga +${ability.value}/+${ability.value}`,
    [Effect.DRAW]: `Roba ${ability.value} carta${ability.value > 1 ? 's' : ''}`,
    [Effect.ENERGY_RAMP]: `Gana +${ability.value} energía máxima`,
    [Effect.ENERGY_BURST]: `Gana +${ability.value} energía este turno`,
    [Effect.ENERGY_STEAL]: `Roba ${ability.value} carta${ability.value > 1 ? 's' : ''} de la zona de energía rival`,
    [Effect.HASTE]: `Gana Haste`,
    [Effect.TRAMPLE]: `Gana Trample`,
    [Effect.MIND_CONTROL]: `Toma el control de una carta enemiga`,
    [Effect.HYPE]: `Gana +${ability.value} de Hype`
  };
  
  const triggerTexts: Record<string, string> = {
    [Trigger.INTRO]: 'Al entrar en juego',
    [Trigger.OUTRO]: 'Al salir del juego',
    [Trigger.ATTACK]: 'Cuando ataca',
    [Trigger.AURA]: 'Pasivamente',
    [Trigger.SOLO]: 'Puedes activar',
    [Trigger.SACRIFICE]: 'Al ser sacrificada'
  };
  
  const targetTexts: Record<string, string> = {
    [Target.SELF]: 'a ti mismo',
    [Target.RANDOM_ENEMY]: 'a un enemigo aleatorio',
    [Target.ALL_ENEMY_CARDS]: 'a todas las cartas enemigas',
    [Target.ALL_OWN_CARDS]: 'a todas tus cartas',
    [Target.ENEMY_REPUTATION]: 'a la reputación enemiga',
    [Target.ALL_CARDS]: 'a todas las cartas'
  };
  
  const effect = effectTexts[ability.effect] || `Aplica efecto ${ability.effect}`;
  const trigger = triggerTexts[ability.trigger] || 'Cuando se activa';
  const target = targetTexts[ability.target] || '';
  
  let text = `${trigger}: ${effect}`;
  if (target) {
    text += ` ${target}`;
  }
  
  if (ability.condition) {
    text += ` (si ${ability.condition})`;
  }
  
  if (ability.modifier && ability.modifier !== 'NONE') {
    text += ` [${ability.modifier}]`;
  }
  
  return text;
}
