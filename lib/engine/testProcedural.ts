// lib/engine/testProcedural.ts

/**
 * SCRIPT DE TESTING RÁPIDO PARA MOTOR PROCEDURAL
 * Ejecutar con: npm run test:procedural o node lib/engine/testProcedural.ts
 */

import { proceduralTestSuite } from './proceduralTesting';
import { proceduralAbilityEngine } from './proceduralAbilityEngine';

async function main() {
  console.log('🎯 INICIANDO TESTING DEL MOTOR PROCEDURAL');
  console.log('='.repeat(50));
  
  // 1. Test rápido primero
  console.log('\n1️⃣ Test rápido de validación...');
  const quickTest = await proceduralTestSuite.runQuickTest();
  
  if (!quickTest) {
    console.log('❌ Test rápido falló - abortando suite completa');
    process.exit(1);
  }
  
  // 2. Suite completa
  console.log('\n2️⃣ Ejecutando suite completa...');
  const results = await proceduralTestSuite.runFullTestSuite();
  
  // 3. Estadísticas finales del motor
  console.log('\n3️⃣ Estadísticas del motor:');
  const stats = proceduralAbilityEngine.getStats();
  console.log(`   Cache size: ${stats.cacheSize}`);
  console.log(`   Cache hits: ${stats.cacheHits}`);
  console.log(`   Cache misses: ${stats.cacheMisses}`);
  console.log(`   Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  
  // 4. Resultado final
  console.log('\n🏁 RESULTADO FINAL:');
  if (results.success) {
    console.log('✅ TODOS LOS TESTS PASARON');
    console.log('🚀 El motor procedural está listo para producción');
    process.exit(0);
  } else {
    console.log('❌ HAY ERRORES QUE REQUIEREN ATENCIÓN');
    console.log('🔧 Revisa los warnings y errores arriba');
    process.exit(1);
  }
}

// Ejecutar solo si este archivo es el punto de entrada
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Error fatal en testing:', error);
    process.exit(1);
  });
}

export { main as testProceduralMain };
