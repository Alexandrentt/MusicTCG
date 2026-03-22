// lib/engine/proceduralTesting.ts

import { CardRarity } from '@/types/types';
import { proceduralAbilityEngine } from './proceduralAbilityEngine';
import { generateCard } from './generator';
import { validateProceduralAbility } from './abilityValidator';

export interface TestResult {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errors: string[];
  warnings: string[];
  performance: {
    averageGenerationTime: number;
    cacheHitRate: number;
    slowestGeneration: number;
    fastestGeneration: number;
  };
  balance: {
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
    brokenAbilities: number;
  };
}

/**
 * SUITE DE TESTING COMPLETO PARA MOTOR PROCEDURAL
 */
export class ProceduralTestSuite {
  private results: TestResult = {
    success: false,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    errors: [],
    warnings: [],
    performance: {
      averageGenerationTime: 0,
      cacheHitRate: 0,
      slowestGeneration: 0,
      fastestGeneration: Infinity
    },
    balance: {
      lowRisk: 0,
      mediumRisk: 0,
      highRisk: 0,
      brokenAbilities: 0
    }
  };

  /**
   * Test completo del motor procedural
   */
  async runFullTestSuite(): Promise<TestResult> {
    console.log('🧪 Iniciando suite de testing procedural...');
    
    try {
      // 1. Test de generación básica
      await this.testBasicGeneration();
      
      // 2. Test de performance
      await this.testPerformance();
      
      // 3. Test de balance
      await this.testBalance();
      
      // 4. Test de integración con generator.ts
      await this.testGeneratorIntegration();
      
      // 5. Test de validación
      await this.testValidation();
      
      // 6. Test de cache
      await this.testCache();
      
      // Calcular resultados finales
      this.calculateFinalResults();
      
      console.log('✅ Suite de testing completada');
      this.printResults();
      
      return this.results;
      
    } catch (error) {
      this.results.errors.push(`Error en suite: ${error}`);
      console.error('❌ Suite falló:', error);
      return this.results;
    }
  }

  /**
   * Test 1: Generación básica
   */
  private async testBasicGeneration(): Promise<void> {
    console.log('📋 Test 1: Generación básica...');
    
    const testCases = [
      { rarity: 'BRONZE' as CardRarity, cost: 1, seed: 'test1' },
      { rarity: 'SILVER' as CardRarity, cost: 2, seed: 'test2' },
      { rarity: 'GOLD' as CardRarity, cost: 3, seed: 'test3' },
      { rarity: 'PLATINUM' as CardRarity, cost: 4, seed: 'test4' }
    ];
    
    for (const testCase of testCases) {
      this.results.totalTests++;
      
      try {
        const result = proceduralAbilityEngine.generate(
          'test-card',
          testCase.rarity,
          testCase.cost,
          testCase.seed
        );
        
        if (result.abilities.length > 0) {
          this.results.passedTests++;
        } else {
          this.results.failedTests++;
          this.results.warnings.push(`No abilities generated for ${testCase.rarity}`);
        }
        
        // Validar cada habilidad
        for (const ability of result.abilities) {
          const validation = validateProceduralAbility(ability, { 
            cost: testCase.cost, 
            rarity: testCase.rarity 
          });
          
          if (!validation.valid) {
            this.results.failedTests++;
            this.results.errors.push(`Invalid ability: ${validation.reason}`);
          }
        }
        
      } catch (error) {
        this.results.failedTests++;
        this.results.errors.push(`Generation failed for ${testCase.rarity}: ${error}`);
      }
    }
  }

  /**
   * Test 2: Performance
   */
  private async testPerformance(): Promise<void> {
    console.log('⚡ Test 2: Performance...');
    
    const iterations = 100;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      proceduralAbilityEngine.generate(
        `perf-test-${i}`,
        'GOLD',
        3,
        `seed-${i}`
      );
      
      const endTime = performance.now();
      times.push(endTime - startTime);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    
    this.results.performance.averageGenerationTime = avgTime;
    this.results.performance.slowestGeneration = maxTime;
    this.results.performance.fastestGeneration = minTime;
    
    // Performance expectations
    if (avgTime > 10) {
      this.results.warnings.push(`Average generation time high: ${avgTime.toFixed(2)}ms`);
    }
    
    if (maxTime > 50) {
      this.results.warnings.push(`Slowest generation too slow: ${maxTime.toFixed(2)}ms`);
    }
    
    console.log(`   Average: ${avgTime.toFixed(2)}ms, Fastest: ${minTime.toFixed(2)}ms, Slowest: ${maxTime.toFixed(2)}ms`);
  }

  /**
   * Test 3: Balance
   */
  private async testBalance(): Promise<void> {
    console.log('⚖️ Test 3: Balance...');
    
    const testCases = [
      { rarity: 'BRONZE' as CardRarity, cost: 1, expectedMaxRisk: 'LOW' },
      { rarity: 'SILVER' as CardRarity, cost: 2, expectedMaxRisk: 'MEDIUM' },
      { rarity: 'GOLD' as CardRarity, cost: 3, expectedMaxRisk: 'MEDIUM' },
      { rarity: 'PLATINUM' as CardRarity, cost: 4, expectedMaxRisk: 'HIGH' }
    ];
    
    for (const testCase of testCases) {
      const result = proceduralAbilityEngine.generate(
        'balance-test',
        testCase.rarity,
        testCase.cost,
        `balance-${testCase.rarity}`
      );
      
      // Contar riesgos
      for (const ability of result.abilities) {
        const validation = validateProceduralAbility(ability, { 
          cost: testCase.cost, 
          rarity: testCase.rarity 
        });
        
        switch (validation.riskLevel) {
          case 'LOW':
            this.results.balance.lowRisk++;
            break;
          case 'MEDIUM':
            this.results.balance.mediumRisk++;
            break;
          case 'HIGH':
            this.results.balance.highRisk++;
            break;
          case 'BROKEN':
            this.results.balance.brokenAbilities++;
            this.results.errors.push(`Broken ability found: ${validation.reason}`);
            break;
        }
      }
    }
    
    // Validar distribución de riesgo
    const total = this.results.balance.lowRisk + this.results.balance.mediumRisk + 
                 this.results.balance.highRisk + this.results.balance.brokenAbilities;
    
    if (this.results.balance.brokenAbilities > 0) {
      this.results.errors.push(`${this.results.balance.brokenAbilities} broken abilities found`);
    }
    
    if (this.results.balance.highRisk > total * 0.3) {
      this.results.warnings.push(`Too many high risk abilities: ${this.results.balance.highRisk}/${total}`);
    }
    
    console.log(`   Risk distribution - Low: ${this.results.balance.lowRisk}, Medium: ${this.results.balance.mediumRisk}, High: ${this.results.balance.highRisk}, Broken: ${this.results.balance.brokenAbilities}`);
  }

  /**
   * Test 4: Integración con generator.ts
   */
  private async testGeneratorIntegration(): Promise<void> {
    console.log('🔗 Test 4: Integración con generator.ts...');
    
    const mockTrack = {
      trackId: 'test-track-123',
      trackName: 'Test Song',
      artistName: 'Test Artist',
      collectionName: 'Test Album',
      genre: 'Pop',
      artworkUrl100: 'https://example.com/artwork.jpg',
      previewUrl: 'https://example.com/preview.mp3'
    };
    
    try {
      const card = await generateCard(mockTrack, 'GOLD');
      
      if (card.abilities && card.abilities.length > 0) {
        this.results.passedTests++;
        console.log(`   Generated card with ${card.abilities.length} abilities`);
      } else {
        this.results.failedTests++;
        this.results.warnings.push('Generator integration: No abilities generated');
      }
      
    } catch (error) {
      this.results.failedTests++;
      this.results.errors.push(`Generator integration failed: ${error}`);
    }
  }

  /**
   * Test 5: Validación
   */
  private async testValidation(): Promise<void> {
    console.log('🛡️ Test 5: Validación...');
    
    // Test de casos límite
    const edgeCases = [
      { rarity: 'BRONZE' as CardRarity, cost: 1, description: 'Bronze cheap' },
      { rarity: 'PLATINUM' as CardRarity, cost: 8, description: 'Platinum expensive' },
      { rarity: 'GOLD' as CardRarity, cost: 0, description: 'Free card' }
    ];
    
    for (const edgeCase of edgeCases) {
      this.results.totalTests++;
      
      try {
        const result = proceduralAbilityEngine.generate(
          'edge-test',
          edgeCase.rarity,
          edgeCase.cost,
          `edge-${edgeCase.description}`
        );
        
        let validCount = 0;
        for (const ability of result.abilities) {
          const validation = validateProceduralAbility(ability, { 
            cost: edgeCase.cost, 
            rarity: edgeCase.rarity 
          });
          
          if (validation.valid) {
            validCount++;
          } else {
            this.results.warnings.push(`Edge case failed (${edgeCase.description}): ${validation.reason}`);
          }
        }
        
        if (validCount === result.abilities.length) {
          this.results.passedTests++;
        } else {
          this.results.failedTests++;
        }
        
      } catch (error) {
        this.results.failedTests++;
        this.results.errors.push(`Edge case error (${edgeCase.description}): ${error}`);
      }
    }
  }

  /**
   * Test 6: Cache
   */
  private async testCache(): Promise<void> {
    console.log('💾 Test 6: Cache...');
    
    // Primera generación (miss)
    const start1 = performance.now();
    const result1 = proceduralAbilityEngine.generate(
      'cache-test',
      'SILVER',
      2,
      'cache-seed-1'
    );
    const time1 = performance.now() - start1;
    
    // Segunda generación igual (hit)
    const start2 = performance.now();
    const result2 = proceduralAbilityEngine.generate(
      'cache-test',
      'SILVER',
      2,
      'cache-seed-1'
    );
    const time2 = performance.now() - start2;
    
    // Validar cache hit
    if (result2.cacheHit) {
      this.results.passedTests++;
      
      // Validar que sea más rápido
      if (time2 < time1 * 0.5) {
        this.results.passedTests++;
      } else {
        this.results.warnings.push(`Cache not significantly faster: ${time1.toFixed(2)}ms vs ${time2.toFixed(2)}ms`);
      }
    } else {
      this.results.failedTests++;
      this.results.errors.push('Cache not working - no cache hit detected');
    }
    
    // Obtener estadísticas del motor
    const stats = proceduralAbilityEngine.getStats();
    this.results.performance.cacheHitRate = stats.hitRate;
    
    console.log(`   Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%, Cache size: ${stats.cacheSize}`);
  }

  /**
   * Calcular resultados finales
   */
  private calculateFinalResults(): void {
    this.results.success = this.results.failedTests === 0 && this.results.balance.brokenAbilities === 0;
  }

  /**
   * Imprimir resultados
   */
  private printResults(): void {
    console.log('\n📊 RESULTADOS DEL TESTING:');
    console.log(`✅ Éxito: ${this.results.success ? 'SÍ' : 'NO'}`);
    console.log(`📈 Tests: ${this.results.passedTests}/${this.results.totalTests} pasados`);
    console.log(`⚠️ Warnings: ${this.results.warnings.length}`);
    console.log(`❌ Errors: ${this.results.errors.length}`);
    
    console.log('\n⚡ PERFORMANCE:');
    console.log(`   Tiempo promedio: ${this.results.performance.averageGenerationTime.toFixed(2)}ms`);
    console.log(`   Cache hit rate: ${(this.results.performance.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   Más rápido: ${this.results.performance.fastestGeneration.toFixed(2)}ms`);
    console.log(`   Más lento: ${this.results.performance.slowestGeneration.toFixed(2)}ms`);
    
    console.log('\n⚖️ BALANCE:');
    console.log(`   Riesgo Bajo: ${this.results.balance.lowRisk}`);
    console.log(`   Riesgo Medio: ${this.results.balance.mediumRisk}`);
    console.log(`   Riesgo Alto: ${this.results.balance.highRisk}`);
    console.log(`   Rotas: ${this.results.balance.brokenAbilities}`);
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.results.warnings.forEach(w => console.log(`   - ${w}`));
    }
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.results.errors.forEach(e => console.log(`   - ${e}`));
    }
  }

  /**
   * Test rápido para desarrollo
   */
  async runQuickTest(): Promise<boolean> {
    console.log('🚀 Running quick test...');
    
    try {
      const result = proceduralAbilityEngine.generate('quick-test', 'GOLD', 3, 'quick-seed');
      
      if (result.abilities.length > 0) {
        console.log(`✅ Quick test passed: ${result.abilities.length} abilities generated`);
        return true;
      } else {
        console.log('❌ Quick test failed: No abilities generated');
        return false;
      }
    } catch (error) {
      console.error('❌ Quick test error:', error);
      return false;
    }
  }
}

// Instancia global para testing
export const proceduralTestSuite = new ProceduralTestSuite();
