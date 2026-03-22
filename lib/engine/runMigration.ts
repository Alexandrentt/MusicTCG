// lib/engine/runMigration.ts

/**
 * SCRIPT DE MIGRACIÓN COMPLETA
 * Ejecuta la migración de base de datos para MusicTCG
 */

import { createClient } from '@supabase/supabase-js';
import { initializeCardMigrator, getCardMigrator } from './databaseMigration';

// Configuración de Supabase
const supabaseUrl = 'https://qleqcdodalsjvimqxltz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZXFjZG9kYWxzamZpbXF4bHR6Iiwic2NvcGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3NDI0NjM4MTIsImV4cCI6MjA1ODAzOTgxMn0.wYJ2zQgJlCuKFYFvLxIFJ0xsAGnBqFzrJqkm5JdA7nQ';

async function runCompleteMigration() {
  console.log('🚀 Iniciando migración completa de MusicTCG...');
  
  try {
    // 1. Inicializar cliente Supabase
    console.log('📡 Conectando a Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 2. Inicializar migrador
    console.log('🔧 Inicializando migrador...');
    const migrator = initializeCardMigrator(supabase);
    
    // 3. Verificar estado actual
    console.log('🔍 Verificando estado actual...');
    const status = await migrator.checkMigrationStatus();
    console.log('Estado actual:', status);
    
    if (!status.needsMigration) {
      console.log('✅ No se necesita migración - Base de datos ya está actualizada');
      return;
    }
    
    // 4. Ejecutar migración completa
    console.log('🔄 Ejecutando migración completa...');
    console.log(`   Cartas a procesar: ${status.cardsWithoutProcedural}/${status.totalCards}`);
    
    const result = await migrator.migrateCards('all', {
      batchSize: 50
    });
    
    // 5. Mostrar resultados
    console.log('\n📊 RESULTADOS DE MIGRACIÓN:');
    console.log(`✅ Éxito: ${result.success ? 'SÍ' : 'NO'}`);
    console.log(`📈 Total cartas: ${result.totalCards}`);
    console.log(`🔄 Actualizadas: ${result.updatedCards}`);
    console.log(`⏱️ Tiempo: ${(result.migrationTime / 1000).toFixed(2)} segundos`);
    console.log(`⚠️ Warnings: ${result.warnings.length}`);
    console.log(`❌ Errors: ${result.errors.length}`);
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      result.warnings.forEach(w => console.log(`   - ${w}`));
    }
    
    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach(e => console.log(`   - ${e}`));
    }
    
    // 6. Verificar estado final
    console.log('\n🔍 Verificando estado final...');
    const finalStatus = await migrator.checkMigrationStatus();
    console.log('Estado final:', finalStatus);
    
    if (result.success) {
      console.log('\n🎉 ¡MIGRACIÓN COMPLETADA CON ÉXITO!');
      console.log('🎵 MusicTCG ahora tiene habilidades procedurales en todas las cartas');
    } else {
      console.log('\n❌ MIGRACIÓN CON ERRORES - Revisar logs arriba');
    }
    
  } catch (error) {
    console.error('💥 Error fatal en migración:', error);
    process.exit(1);
  }
}

// Ejecutar si este archivo es el punto de entrada
if (require.main === module) {
  runCompleteMigration().catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

export { runCompleteMigration };
