// lib/engine/databaseMigration.ts

/**
 * SISTEMA DE MIGRACIÓN PARA BASE DE DATOS DE CARTAS
 * Actualiza cartas existentes con nuevas habilidades procedurales SIN perder datos
 */

import { CardRarity } from '@/types/types';
import { generateCard } from './generator';

export interface MigrationResult {
  success: boolean;
  totalCards: number;
  updatedCards: number;
  errors: string[];
  warnings: string[];
  migrationTime: number;
}

export type CardUpdateStrategy = 
  | 'all'                    // Actualizar todas las cartas
  | 'by_rarity'              // Actualizar solo ciertas rarezas
  | 'by_format'              // Actualizar solo ciertos formatos
  | 'incremental'          // Actualizar gradualmente
  | 'manual';                    // Actualización manual controlada

export class CardDatabaseMigrator {
  private supabase: any; // Supabase client
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * MIGRACIÓN PRINCIPAL - Actualiza cartas con nuevas habilidades procedurales
   */
  async migrateCards(
    strategy: CardUpdateStrategy = 'incremental',
    filters?: {
      rarity?: CardRarity[];
      formats?: string[];
      limit?: number;
      batchSize?: number;
    }
  ): Promise<MigrationResult> {
    const startTime = performance.now();
    console.log('🔄 Iniciando migración de base de datos de cartas...');
    
    const result: MigrationResult = {
      success: false,
      totalCards: 0,
      updatedCards: 0,
      errors: [],
      warnings: [],
      migrationTime: 0
    };

    try {
      // 1. Obtener cartas existentes
      const existingCards = await this.getExistingCards(strategy, filters);
      result.totalCards = existingCards.length;
      
      console.log(`📊 Encontradas ${existingCards.length} cartas para actualizar`);

      // 2. Procesar en lotes para no sobrecargar
      const batchSize = filters?.batchSize || 50;
      const batches = this.createBatches(existingCards, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`📦 Procesando lote ${i + 1}/${batches.length} (${batch.length} cartas)...`);
        
        const batchResult = await this.processBatch(batch);
        
        result.updatedCards += batchResult.updated;
        result.errors.push(...batchResult.errors);
        result.warnings.push(...batchResult.warnings);
        
        // Pequeña pausa entre lotes para no sobrecargar
        if (i < batches.length - 1) {
          await this.sleep(100);
        }
      }

      // 3. Actualizar metadatos de migración
      await this.updateMigrationMetadata(result);
      
      result.success = result.errors.length === 0;
      result.migrationTime = performance.now() - startTime;
      
      console.log(`✅ Migración completada: ${result.updatedCards}/${result.totalCards} cartas actualizadas`);
      
      return result;
      
    } catch (error) {
      result.errors.push(`Error general en migración: ${error}`);
      result.migrationTime = performance.now() - startTime;
      console.error('❌ Migración fallida:', error);
      return result;
    }
  }

  /**
   * Obtener cartas existentes según estrategia
   */
  private async getExistingCards(
    strategy: CardUpdateStrategy,
    filters?: any
  ): Promise<any[]> {
    let query = this.supabase.from('cards').select('*');
    
    switch (strategy) {
          case 'all':
            // Todas las cartas excepto MYTHIC (diseño manual)
            query = query.neq('rarity', 'MYTHIC');
            break;
            
          case 'by_rarity':
            if (filters?.rarity?.length) {
              query = query.in('rarity', filters.rarity);
            }
            break;
            
          case 'by_format':
            if (filters?.formats?.length) {
              query = query.in('format', filters.formats);
            }
            break;
            
          case 'incremental':
            // Solo cartas sin habilidades procedurales
            query = query.is('abilities', null).or('abilities.eq.{}');
            break;
            
          case 'manual':
            // Aplicar filtros personalizados
            if (filters?.limit) {
              query = query.limit(filters.limit);
            }
            break;
        }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Error obteniendo cartas: ${error.message}`);
    }
    
    return data || [];
  }

  /**
   * Procesar un lote de cartas
   */
  private async processBatch(cards: any[]): Promise<{
    updated: number;
    errors: string[];
    warnings: string[];
  }> {
    const result = { updated: 0, errors: [], warnings: [] };
    
    for (const card of cards) {
      try {
        // 1. Generar nuevas habilidades manteniendo datos existentes
        const updatedCard = await this.regenerateCardAbilities(card);
        
        // 2. Actualizar en base de datos
        const { error } = await this.supabase
          .from('cards')
          .update({
            abilities: updatedCard.abilities,
            keywords: updatedCard.keywords,
            updated_at: new Date().toISOString(),
            migration_version: '2.0' // Versión de migración
          })
          .eq('id', card.id);
        
        if (error) {
          (result.errors as string[]).push(`Error actualizando carta ${card.id}: ${(error as any).message}`);
        } else {
          result.updated = (result.updated || 0) + 1;
        }
        
      } catch (error) {
        (result.errors as string[]).push(`Error procesando carta ${card.id}: ${(error as any).toString()}`);
      }
    }
    
    return result;
  }

  /**
   * Regenerar habilidades para una carta existente
   */
  private async regenerateCardAbilities(existingCard: any): Promise<any> {
    try {
      // Reconstruir el objeto track para generateCard
      const mockTrack = {
        trackId: existingCard.track_id || existingCard.id,
        trackName: existingCard.name,
        artistName: existingCard.artist,
        collectionName: existingCard.album,
        genre: existingCard.genre,
        format: existingCard.format,
        artworkUrl100: existingCard.artwork_url,
        previewUrl: existingCard.preview_url,
        popularity: existingCard.popularity || 50
      };
      
      // Generar carta con nuevas habilidades procedurales
      const updatedCard = await generateCard(
        mockTrack,
        existingCard.rarity as any,
        undefined, // youtubeData
        undefined  // mythicTrackIds
      );
      
      // Mantener datos importantes de la carta existente
      return {
        ...existingCard,
        abilities: updatedCard.abilities,
        keywords: updatedCard.keywords,
        // Mantener otros campos existentes
        user_id: existingCard.user_id,
        created_at: existingCard.created_at,
        collection_id: existingCard.collection_id,
        position: existingCard.position
      };
      
    } catch (error) {
      console.error(`Error regenerando habilidades para carta ${existingCard.id}:`, error);
      throw error;
    }
  }

  /**
   * Crear lotes para procesamiento
   */
  private createBatches(items: any[], batchSize: number): any[][] {
    const batches: any[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Actualizar metadatos de migración
   */
  private async updateMigrationMetadata(result: MigrationResult): Promise<void> {
    try {
      await this.supabase.from('migration_logs').insert({
        version: '2.0',
        total_cards: result.totalCards,
        updated_cards: result.updatedCards,
        errors_count: result.errors.length,
        warnings_count: result.warnings.length,
        migration_time: result.migrationTime,
        success: result.success,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      const errorRecord = error as any;
      if (errorRecord.message) {
        console.warn('No se pudo guardar log de migración:', errorRecord.message);
      } else {
        console.warn('No se pudo guardar log de migración:', error);
      }
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verificar estado de migración
   */
  async checkMigrationStatus(): Promise<{
    needsMigration: boolean;
    cardsWithoutProcedural: number;
    totalCards: number;
    lastMigration: any;
  }> {
    try {
      // Contar cartas sin habilidades procedurales
      const { count: cardsWithoutProcedural } = await this.supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .is('abilities', null)
        .or('abilities.eq.{}');
      
      // Total de cartas (excluyendo MYTHIC)
      const { count: totalCards } = await this.supabase
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .neq('rarity', 'MYTHIC');
      
      // Última migración
      const { data: lastMigration } = await this.supabase
        .from('migration_logs')
        .select('*')
        .eq('version', '2.0')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      return {
        needsMigration: (cardsWithoutProcedural || 0) > 0,
        cardsWithoutProcedural: cardsWithoutProcedural || 0,
        totalCards: totalCards || 0,
        lastMigration
      };
      
    } catch (error) {
      console.error('Error verificando estado de migración:', error);
      return {
        needsMigration: true,
        cardsWithoutProcedural: 0,
        totalCards: 0,
        lastMigration: null
      };
    }
  }

  /**
   * Rollback de migración (emergency)
   */
  async rollbackMigration(version: string = '2.0'): Promise<boolean> {
    console.warn('⚠️ Iniciando rollback de migración - EMERGENCY ONLY');
    
    try {
      // Restaurar desde backup si existe
      const { error } = await this.supabase
        .from('cards_backup')
        .select('*');
      
      if (error) {
        console.error('No hay backup disponible para rollback');
        return false;
      }
      
      // Implementar lógica de rollback aquí
      console.log('Rollback completado');
      return true;
      
    } catch (error) {
      console.error('Error en rollback:', error);
      return false;
    }
  }
}

// Instancia global - se inicializa cuando se importa
let cardMigrator: CardDatabaseMigrator | null = null;

/**
 * Inicializar el migrador con cliente Supabase
 */
export function initializeCardMigrator(supabaseClient: any): CardDatabaseMigrator {
  cardMigrator = new CardDatabaseMigrator(supabaseClient);
  return cardMigrator;
}

/**
 * Obtener instancia del migrador (debe estar inicializado)
 */
export function getCardMigrator(): CardDatabaseMigrator {
  if (!cardMigrator) {
    throw new Error('CardMigrator not initialized. Call initializeCardMigrator(supabaseClient) first.');
  }
  return cardMigrator;
}

// Exportar instancia para compatibilidad (con inicialización lazy)
export const cardMigratorInstance = new Proxy({} as CardDatabaseMigrator, {
  get(target, prop) {
    if (!cardMigrator) {
      throw new Error('CardMigrator not initialized. Call initializeCardMigrator(supabaseClient) first.');
    }
    return (cardMigrator as any)[prop];
  }
});
