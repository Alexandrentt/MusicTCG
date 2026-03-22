// lib/mythic/mythicTracker.ts
import { supabase } from '@/lib/supabase';
import { CardData } from '@/lib/engine/generator';

export interface MythicDiscovery {
  cardId: string;
  cardName: string;
  artistName: string;
  rarity: string;
  discoveryDate: string;
  totalOwners: number;
  isUniqueOwner: boolean;
}

/**
 * Verifica cuántos usuarios tienen una carta mítica específica
 */
export async function getMythicCardOwners(cardId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('id', cardId)
      .eq('rarity', 'MYTHIC');

    if (error) {
      console.error('Error checking mythic card owners:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getMythicCardOwners:', error);
    return 0;
  }
}

/**
 * Registra el descubrimiento de una carta mítica
 */
export async function registerMythicDiscovery(
  card: CardData,
  userId: string
): Promise<MythicDiscovery> {
  try {
    // Obtener número total de dueños
    const totalOwners = await getMythicCardOwners(card.id);
    
    // Verificar si el usuario actual ya tenía esta carta
    const { data: existingCard } = await supabase
      .from('cards')
      .select('id')
      .eq('id', card.id)
      .eq('user_id', userId)
      .single();

    const isUniqueOwner = !existingCard;

    const discovery: MythicDiscovery = {
      cardId: card.id,
      cardName: card.name,
      artistName: card.artist,
      rarity: card.rarity,
      discoveryDate: new Date().toISOString(),
      totalOwners,
      isUniqueOwner
    };

    // Guardar en tabla de descubrimientos míticos (si existe)
    await supabase
      .from('mythic_discoveries')
      .upsert({
        card_id: card.id,
        user_id: userId,
        discovery_date: discovery.discoveryDate,
        total_owners: totalOwners,
        is_unique_owner: isUniqueOwner
      }, {
        onConflict: 'user_id,card_id'
      });

    return discovery;
  } catch (error) {
    console.error('Error registering mythic discovery:', error);
    return {
      cardId: card.id,
      cardName: card.name,
      artistName: card.artist,
      rarity: card.rarity,
      discoveryDate: new Date().toISOString(),
      totalOwners: 0,
      isUniqueOwner: false
    };
  }
}

/**
 * Obtiene estadísticas de cartas míticas para un usuario
 */
export async function getUserMythicStats(userId: string): Promise<{
  totalMythicCards: number;
  uniqueDiscoveries: number;
  sharedDiscoveries: number;
}> {
  try {
    const { data: discoveries, error } = await supabase
      .from('mythic_discoveries')
      .select('is_unique_owner')
      .eq('user_id', userId);

    if (error || !discoveries) {
      return {
        totalMythicCards: 0,
        uniqueDiscoveries: 0,
        sharedDiscoveries: 0
      };
    }

    const uniqueDiscoveries = discoveries.filter(d => d.is_unique_owner).length;
    const sharedDiscoveries = discoveries.filter(d => !d.is_unique_owner).length;

    return {
      totalMythicCards: discoveries.length,
      uniqueDiscoveries,
      sharedDiscoveries
    };
  } catch (error) {
    console.error('Error getting user mythic stats:', error);
    return {
      totalMythicCards: 0,
      uniqueDiscoveries: 0,
      sharedDiscoveries: 0
    };
  }
}

/**
 * Genera mensaje personalizado para descubrimiento de carta mítica
 */
export function generateMythicDiscoveryMessage(discovery: MythicDiscovery): string {
  if (discovery.isUniqueOwner) {
    return `🎉 ¡FELICIDADES! Eres el ÚNICO jugador con "${discovery.cardName}" de ${discovery.artistName}! 🌟`;
  } else {
    return `✨ ¡Increíble! Descubriste "${discovery.cardName}" de ${discovery.artistName}! 🎯`;
  }
}

/**
 * Genera mensaje de estado actual de cartas míticas
 */
export function generateMythicStatusMessage(
  totalMythicCards: number,
  newDiscovery?: MythicDiscovery
): string {
  if (newDiscovery) {
    return `🎊 ¡Nueva carta mítica! Tienes ${totalMythicCards} cartas míticas únicas. 🏆`;
  }
  
  return `📚 Colección mítica: ${totalMythicCards} cartas míticas descubiertas. 🌟`;
}
