import { supabase } from './supabase';
import { CardData } from './engine/generator';

export async function logDiscovery(card: CardData, discovererName: string = 'Anonymous') {
  try {
    const { data: existingDoc } = await supabase
      .from('discovered_songs')
      .select('times_found')
      .eq('id', card.id)
      .single();

    if (!existingDoc) {
      await supabase.from('discovered_songs').insert({
        ...card,
        discovered_by: discovererName,
        discovered_at: new Date().toISOString(),
        times_found: 1
      });
    } else {
      // Increment times found
      await supabase.from('discovered_songs').update({
        times_found: (existingDoc.times_found || 1) + 1
      }).eq('id', card.id);
    }
  } catch (error) {
    console.error('Error logging discovery:', error);
  }
}

export async function getRecentDiscoveries(count: number = 20) {
  try {
    const { data, error } = await supabase
      .from('discovered_songs')
      .select('*')
      .order('discovered_at', { ascending: false })
      .limit(count);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting recent discoveries:', error);
    return [];
  }
}

export async function getGlobalStats() {
  try {
    const { data, error } = await supabase.from('discovered_songs').select('*');
    if (error) throw error;
    
    const total = data.length;
    let totalTimesFound = 0;
    const rarityCounts: Record<string, number> = {
      COMMON: 0,
      UNCOMMON: 0,
      RARE: 0,
      GOLD: 0,
      PLATINUM: 0
    };

    data.forEach(doc => {
      totalTimesFound += (doc.times_found || 1);
      if (doc.rarity && rarityCounts[doc.rarity] !== undefined) {
        rarityCounts[doc.rarity]++;
      }
    });

    return {
      totalUnique: total,
      totalDiscoveries: totalTimesFound,
      rarityCounts
    };
  } catch (error) {
    return null;
  }
}

/**
 * Resetea todos los descubrimientos globales (Admin Only).
 */
export async function resetGlobalDiscoveries() {
  try {
    const { error } = await supabase.from('discovered_songs').delete().neq('id', '0');
    if (error) throw error;
    console.log('Global discoveries reset successfully.');
  } catch (error) {
    console.error('Error resetting global discoveries:', error);
  }
}
