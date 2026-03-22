// lib/engine/cascadeEngine.ts

/**
 * 🌊 MOTOR DE CASCADAS - SISTEMA DE EFECTOS ENCADENADOS
 * Genera cascadas épicas para alcanzar 100,000+ combinaciones
 */

import { 
  GeneratedAbility, 
  CascadeAbility, 
  CascadeChain, 
  Effect, 
  Target, 
  Trigger,
  CardRarity,
  AbilityType 
} from '@/types/types';
import { ENERGY_MATRIX, selectWeighted, getWeightsByRarity } from './combinationMatrix';
import { validateProceduralAbility } from './abilityValidator';

export interface CascadeGenerationOptions {
  maxDepth: number;
  maxCascades: number;
  allowInfinite: boolean;
  allowApocalyptic: boolean;
  riskTolerance: 'SAFE' | 'MODERATE' | 'EXTREME' | 'INSANE';
}

export class CascadeEngine {
  private cascadeIdCounter = 0;
  
  /**
   * Genera cascadas épicas para una habilidad base
   */
  generateCascades(
    baseAbility: GeneratedAbility,
    rarity: CardRarity,
    options: Partial<CascadeGenerationOptions> = {}
  ): GeneratedAbility {
    const opts = this.mergeDefaultOptions(options, rarity);
    
    // Solo Platinum+ puede tener cascadas extremas
    if (rarity !== 'PLATINUM' && opts.riskTolerance === 'INSANE') {
      opts.riskTolerance = 'EXTREME';
    }
    
    // Generar cascadas basadas en el efecto principal
    const cascades = this.generateCascadeChain(baseAbility, rarity, opts);
    
    // Calcular profundidad total
    const totalDepth = this.calculateCascadeDepth(cascades);
    
    return {
      ...baseAbility,
      cascades,
      cascadeDepth: totalDepth,
      cascadeTrigger: this.generateCascadeTrigger(baseAbility)
    };
  }
  
  /**
   * Genera una cadena completa de cascadas
   */
  private generateCascadeChain(
    baseAbility: GeneratedAbility,
    rarity: CardRarity,
    options: CascadeGenerationOptions
  ): CascadeAbility[] {
    const cascades: CascadeAbility[] = [];
    const maxCascades = this.getMaxCascadesByRarity(rarity, options);
    
    // Generar cascadas basadas en el efecto principal
    const primaryCascades = this.generatePrimaryCascades(baseAbility, rarity, options);
    cascades.push(...primaryCascades);
    
    // Generar cascadas secundarias (cascadas de cascadas!)
    if (options.maxDepth > 1 && cascades.length > 0) {
      for (const cascade of primaryCascades) {
        if (cascades.length >= maxCascades) break;
        
        const subCascades = this.generateSubCascades(cascade, rarity, options);
        cascade.cascades = subCascades;
        cascades.push(...subCascades);
      }
    }
    
    // Generar cascadas terciarias (INSANE mode only)
    if (options.riskTolerance === 'INSANE' && options.maxDepth > 2) {
      this.generateTertiaryCascades(cascades, rarity, options);
    }
    
    return cascades.slice(0, maxCascades);
  }
  
  /**
   * Genera cascadas primarias basadas en el efecto principal
   */
  private generatePrimaryCascades(
    baseAbility: GeneratedAbility,
    rarity: CardRarity,
    options: CascadeGenerationOptions
  ): CascadeAbility[] {
    const cascades: CascadeAbility[] = [];
    
    // Lógica de cascada específica por efecto
    switch (baseAbility.effect) {
      case Effect.ENERGY_BURST:
        cascades.push(...this.generateEnergyCascades(baseAbility, rarity, options));
        break;
        
      case Effect.DAMAGE:
        cascades.push(...this.generateDamageCascades(baseAbility, rarity, options));
        break;
        
      case Effect.HEAL:
        cascades.push(...this.generateHealCascades(baseAbility, rarity, options));
        break;
        
      case Effect.DRAW:
        cascades.push(...this.generateDrawCascades(baseAbility, rarity, options));
        break;
        
      case Effect.ENERGY_STEAL:
        cascades.push(...this.generateStealCascades(baseAbility, rarity, options));
        break;
        
      case Effect.MIND_CONTROL:
        cascades.push(...this.generateControlCascades(baseAbility, rarity, options));
        break;
        
      default:
        cascades.push(...this.generateGenericCascades(baseAbility, rarity, options));
    }
    
    return cascades;
  }
  
  /**
   * 🌊 CASCADAS DE ENERGÍA - Las más épicas
   */
  private generateEnergyCascades(
    baseAbility: GeneratedAbility,
    rarity: CardRarity,
    options: CascadeGenerationOptions
  ): CascadeAbility[] {
    const cascades: CascadeAbility[] = [];
    
    // Cascada 1: Si tienes energía extra, roba cartas
    cascades.push({
      id: `cascade-${this.nextId()}`,
      trigger: 'IF_MORE_ENERGY',
      effect: Effect.DRAW,
      target: Target.SELF,
      value: Math.floor(baseAbility.value / 2) + 1,
      probability: 0.8,
      cascadeDepth: 1
    });
    
    // Cascada 2: Si robaste cartas, genera hype
    cascades.push({
      id: `cascade-${this.nextId()}`,
      trigger: 'IF_DRAW_THIS_TURN',
      effect: Effect.HYPE,
      target: Target.ALL_OWN_CARDS,
      value: baseAbility.value,
      probability: 0.6,
      cascadeDepth: 1
    });
    
    // Cascada 3: Si tienes hype, ataca a todos
    if (options.riskTolerance === 'EXTREME' || options.riskTolerance === 'INSANE') {
      cascades.push({
        id: `cascade-${this.nextId()}`,
        trigger: 'IF_HYPE_ACTIVE',
        effect: Effect.DAMAGE,
        target: Target.ALL_ENEMY_CARDS,
        value: baseAbility.value * 2,
        probability: 0.4,
        cascadeDepth: 1
      });
    }
    
    // Cascada 4: Si atacaste a todos, roba energía (INSANE only)
    if (options.riskTolerance === 'INSANE') {
      cascades.push({
        id: `cascade-${this.nextId()}`,
        trigger: 'IF_ATTACKED_ALL_ENEMIES',
        effect: Effect.ENERGY_STEAL,
        target: Target.RIVAL_ENERGY_ZONE_ALL,
        value: Math.floor(baseAbility.value / 2),
        probability: 0.3,
        cascadeDepth: 1
      });
    }
    
    return cascades;
  }
  
  /**
   * ⚔️ CASCADAS DE DAÑO
   */
  private generateDamageCascades(
    baseAbility: GeneratedAbility,
    rarity: CardRarity,
    options: CascadeGenerationOptions
  ): CascadeAbility[] {
    const cascades: CascadeAbility[] = [];
    
    // Si infliges daño, gana hype
    cascades.push({
      id: `cascade-${this.nextId()}`,
      trigger: 'IF_DAMAGE_DEALT',
      effect: Effect.HYPE,
      target: Target.SELF,
      value: Math.floor(baseAbility.value / 2),
      probability: 0.7,
      cascadeDepth: 1
    });
    
    // Si tienes hype, daño adicional
    cascades.push({
      id: `cascade-${this.nextId()}`,
      trigger: 'IF_HYPE_ACTIVE',
      effect: Effect.DAMAGE,
      target: Target.RANDOM_ENEMY,
      value: Math.floor(baseAbility.value / 2),
      probability: 0.5,
      cascadeDepth: 1
    });
    
    return cascades;
  }
  
  /**
   * 💚 CASCADAS DE SANACIÓN
   */
  private generateHealCascades(
    baseAbility: GeneratedAbility,
    rarity: CardRarity,
    options: CascadeGenerationOptions
  ): CascadeAbility[] {
    const cascades: CascadeAbility[] = [];
    
    // Si curas, gana defensa
    cascades.push({
      id: `cascade-${this.nextId()}`,
      trigger: 'IF_HEALED_THIS_TURN',
      effect: Effect.BUFF,
      target: Target.SELF,
      value: Math.floor(baseAbility.value / 2),
      probability: 0.6,
      cascadeDepth: 1
    });
    
    // Si tienes buff, cura a todos
    if (options.riskTolerance !== 'SAFE') {
      cascades.push({
        id: `cascade-${this.nextId()}`,
        trigger: 'IF_BUFF_ACTIVE',
        effect: Effect.HEAL,
        target: Target.ALL_OWN_CARDS,
        value: Math.floor(baseAbility.value / 3),
        probability: 0.4,
        cascadeDepth: 1
      });
    }
    
    return cascades;
  }
  
  /**
   * 📚 CASCADAS DE ROBO
   */
  private generateDrawCascades(
    baseAbility: GeneratedAbility,
    rarity: CardRarity,
    options: CascadeGenerationOptions
  ): CascadeAbility[] {
    const cascades: CascadeAbility[] = [];
    
    // Si robas, gana energía
    cascades.push({
      id: `cascade-${this.nextId()}`,
      trigger: 'IF_DRAW_THIS_TURN',
      effect: Effect.ENERGY_BURST,
      target: Target.SELF,
      value: Math.floor(baseAbility.value / 2),
      probability: 0.5,
      cascadeDepth: 1
    });
    
    // Si tienes energía, roba más
    if (options.riskTolerance === 'EXTREME' || options.riskTolerance === 'INSANE') {
      cascades.push({
        id: `cascade-${this.nextId()}`,
        trigger: 'IF_MORE_ENERGY',
        effect: Effect.DRAW,
        target: Target.SELF,
        value: 1,
        probability: 0.3,
        cascadeDepth: 1
      });
    }
    
    return cascades;
  }
  
  /**
   * 🎭 CASCADAS DE ROBO DE ENERGÍA
   */
  private generateStealCascades(
    baseAbility: GeneratedAbility,
    rarity: CardRarity,
    options: CascadeGenerationOptions
  ): CascadeAbility[] {
    const cascades: CascadeAbility[] = [];
    
    // Si robas energía, controla al enemigo
    cascades.push({
      id: `cascade-${this.nextId()}`,
      trigger: 'IF_STOLEN_ENERGY',
      effect: Effect.MIND_CONTROL,
      target: Target.RANDOM_ENEMY,
      value: 1,
      probability: 0.2,
      cascadeDepth: 1
    });
    
    // Si controlas, sacrifica para beneficio
    if (options.riskTolerance === 'INSANE') {
      cascades.push({
        id: `cascade-${this.nextId()}`,
        trigger: 'IF_CONTROL_ENEMY',
        effect: Effect.SACRIFICE_PAYOFF,
        target: Target.ENEMY_REPUTATION,
        value: baseAbility.value * 3,
        probability: 0.3,
        cascadeDepth: 1
      });
    }
    
    return cascades;
  }
  
  /**
   * 🧠 CASCADAS DE CONTROL MENTAL
   */
  private generateControlCascades(
    baseAbility: GeneratedAbility,
    rarity: CardRarity,
    options: CascadeGenerationOptions
  ): CascadeAbility[] {
    const cascades: CascadeAbility[] = [];
    
    // Si controlas, roba su energía
    cascades.push({
      id: `cascade-${this.nextId()}`,
      trigger: 'IF_CONTROL_ENEMY',
      effect: Effect.ENERGY_STEAL,
      target: Target.RIVAL_ENERGY_ZONE_RANDOM,
      value: 2,
      probability: 0.6,
      cascadeDepth: 1
    });
    
    // Si robas energía, controla más
    if (options.riskTolerance === 'EXTREME' || options.riskTolerance === 'INSANE') {
      cascades.push({
        id: `cascade-${this.nextId()}`,
        trigger: 'IF_STOLEN_ENERGY',
        effect: Effect.MIND_CONTROL,
        target: Target.RANDOM_ENEMY,
        value: 1,
        probability: 0.3,
        cascadeDepth: 1
      });
    }
    
    return cascades;
  }
  
  /**
   * 🔧 CASCADAS GENÉRICAS
   */
  private generateGenericCascades(
    baseAbility: GeneratedAbility,
    rarity: CardRarity,
    options: CascadeGenerationOptions
  ): CascadeAbility[] {
    const cascades: CascadeAbility[] = [];
    
    // Cascada genérica: si el efecto funciona, roba una carta
    cascades.push({
      id: `cascade-${this.nextId()}`,
      trigger: 'IF_EFFECT_SUCCESSFUL',
      effect: Effect.DRAW,
      target: Target.SELF,
      value: 1,
      probability: 0.3,
      cascadeDepth: 1
    });
    
    return cascades;
  }
  
  /**
   * Genera sub-cascadas (cascadas de cascadas)
   */
  private generateSubCascades(
    parentCascade: CascadeAbility,
    rarity: CardRarity,
    options: CascadeGenerationOptions
  ): CascadeAbility[] {
    const subCascades: CascadeAbility[] = [];
    
    // Solo en EXTREME e INSANE modes
    if (options.riskTolerance !== 'EXTREME' && options.riskTolerance !== 'INSANE') {
      return subCascades;
    }
    
    // Lógica de sub-cascada basada en el efecto padre
    switch (parentCascade.effect) {
      case Effect.DRAW:
        subCascades.push({
          id: `sub-cascade-${this.nextId()}`,
          trigger: 'IF_DRAW_THIS_TURN',
          effect: Effect.HYPE,
          target: Target.SELF,
          value: 1,
          probability: 0.4,
          cascadeDepth: (parentCascade.cascadeDepth || 1) + 1
        });
        break;
        
      case Effect.HYPE:
        subCascades.push({
          id: `sub-cascade-${this.nextId()}`,
          trigger: 'IF_HYPE_ACTIVE',
          effect: Effect.DAMAGE,
          target: Target.RANDOM_ENEMY,
          value: 1,
          probability: 0.3,
          cascadeDepth: (parentCascade.cascadeDepth || 1) + 1
        });
        break;
    }
    
    return subCascades;
  }
  
  /**
   * Genera cascadas terciarias (INSANE only)
   */
  private generateTertiaryCascades(
    cascades: CascadeAbility[],
    rarity: CardRarity,
    options: CascadeGenerationOptions
  ): void {
    if (options.riskTolerance !== 'INSANE') return;
    
    // Buscar cascadas con sub-cascadas y añadir terciarias
    for (const cascade of cascades) {
      if (cascade.cascades && cascade.cascades.length > 0) {
        for (const subCascade of cascade.cascades) {
          // Tercer nivel: si la sub-cascada funciona, efecto masivo
          subCascade.cascades = [{
            id: `tertiary-cascade-${this.nextId()}`,
            trigger: 'IF_SUB_CASCADE_SUCCESSFUL',
            effect: Effect.DAMAGE,
            target: Target.ALL_ENEMY_CARDS,
            value: 5,
            probability: 0.1,
            cascadeDepth: 3
          }];
        }
      }
    }
  }
  
  /**
   * Calcula la profundidad total de cascadas
   */
  private calculateCascadeDepth(cascades: CascadeAbility[]): number {
    let maxDepth = 0;
    
    for (const cascade of cascades) {
      const cascadeDepth = cascade.cascadeDepth || 1;
      if (cascade.cascades) {
        const subDepth = this.calculateCascadeDepth(cascade.cascades);
        maxDepth = Math.max(maxDepth, cascadeDepth + subDepth);
      } else {
        maxDepth = Math.max(maxDepth, cascadeDepth);
      }
    }
    
    return maxDepth;
  }
  
  /**
   * Genera trigger de cascada
   */
  private generateCascadeTrigger(baseAbility: GeneratedAbility): string {
    return `CASCADE_ON_${baseAbility.trigger}_${baseAbility.effect}`;
  }
  
  /**
   * Obtiene máximo de cascadas por rareza
   */
  private getMaxCascadesByRarity(rarity: CardRarity, options: CascadeGenerationOptions): number {
    const baseMax: Record<string, number> = {
      'BRONZE': 1,
      'SILVER': 2,
      'GOLD': 3,
      'PLATINUM': 5,
      'MYTHIC': 0 // Mythic no usa cascadas (diseño manual)
    };
    
    const multiplier = options.riskTolerance === 'INSANE' ? 2 : 1;
    return (baseMax[rarity] || 1) * multiplier;
  }
  
  /**
   * Fusiona opciones por defecto
   */
  private mergeDefaultOptions(
    options: Partial<CascadeGenerationOptions>,
    rarity: CardRarity
  ): CascadeGenerationOptions {
    return {
      maxDepth: 1,
      maxCascades: this.getMaxCascadesByRarity(rarity, options as CascadeGenerationOptions),
      allowInfinite: false,
      allowApocalyptic: rarity === 'PLATINUM',
      riskTolerance: 'MODERATE',
      ...options
    };
  }
  
  /**
   * Generador de IDs únicos
   */
  private nextId(): number {
    return ++this.cascadeIdCounter;
  }
  
  /**
   * Valida una cadena de cascadas
   */
  validateCascadeChain(ability: GeneratedAbility): {
    valid: boolean;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' | 'BROKEN';
    warnings: string[];
  } {
    const warnings: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' | 'BROKEN' = 'LOW';
    
    if (!ability.cascades || ability.cascades.length === 0) {
      return { valid: true, riskLevel, warnings };
    }
    
    // Calcular riesgo basado en profundidad
    if (ability.cascadeDepth && ability.cascadeDepth > 3) {
      riskLevel = 'EXTREME';
      warnings.push('Cascada muy profunda - riesgo de performance');
    }
    
    // Buscar bucles infinitos
    if (this.hasInfiniteLoop(ability)) {
      riskLevel = 'BROKEN';
      return { valid: false, riskLevel, warnings: ['Bucle infinito detectado'] };
    }
    
    // Calcular poder total
    const totalPower = this.calculateTotalCascadePower(ability);
    if (totalPower > 20) {
      riskLevel = 'EXTREME';
      warnings.push('Poder total muy alto - puede desbalancear el juego');
    }
    
    return { valid: true, riskLevel, warnings };
  }
  
  /**
   * Detecta bucles infinitos
   */
  private hasInfiniteLoop(ability: GeneratedAbility): boolean {
    // Lógica simplificada - en producción sería más compleja
    if (!ability.cascades) return false;
    
    const visited = new Set<string>();
    return this.checkLoopRecursive(ability, visited);
  }
  
  private checkLoopRecursive(ability: GeneratedAbility | CascadeAbility, visited: Set<string>): boolean {
    const key = `${ability.effect}-${ability.trigger}`;
    
    if (visited.has(key)) return true;
    visited.add(key);
    
    if ('cascades' in ability && ability.cascades) {
      for (const cascade of ability.cascades) {
        if (this.checkLoopRecursive(cascade, visited)) return true;
      }
    }
    
    visited.delete(key);
    return false;
  }
  
  /**
   * Calcula poder total de cascadas
   */
  private calculateTotalCascadePower(ability: GeneratedAbility): number {
    let totalPower = ability.value || 0;
    
    if (ability.cascades) {
      for (const cascade of ability.cascades) {
        totalPower += this.calculateCascadePower(cascade);
      }
    }
    
    return totalPower;
  }
  
  private calculateCascadePower(cascade: CascadeAbility): number {
    let power = cascade.value || 0;
    
    if (cascade.cascades) {
      for (const subCascade of cascade.cascades) {
        power += this.calculateCascadePower(subCascade);
      }
    }
    
    return power;
  }
}

// Instancia global
export const cascadeEngine = new CascadeEngine();
