import { supabase } from './supabase';
import { CardData } from './engine/generator';

export async function logDiscovery(card: CardData, discovererId?: string) {
  try {
    // Check if it's already discovered
    const { data: existing } = await supabase
      .from('global_discoveries')
      .select('total_owners')
      .eq('card_id', card.id)
      .single();

    if (!existing) {
      await supabase.from('global_discoveries').insert({
        card_id: card.id,
        card_data: card,
        discovered_by: discovererId || null,
        discovered_at: new Date().toISOString(),
        total_owners: 1
      });
    } else {
      // Increment total owners
      await supabase.from('global_discoveries').update({
        total_owners: (existing.total_owners || 1) + 1
      }).eq('card_id', card.id);
    }
  } catch (error) {
    console.error('Error logging discovery:', error);
  }
}

export async function getRecentDiscoveries(count: number = 20) {
  try {
    const { data, error } = await supabase
      .from('global_discoveries')
      .select('*')
      .order('discovered_at', { ascending: false })
      .limit(count);

    if (error) throw error;

    // Transform back to CardData format if needed, but current code expects rows
    return data || [];
  } catch (error) {
    console.error('Error getting recent discoveries:', error);
    return [];
  }
}

export async function getGlobalStats() {
  try {
    const { data, error } = await supabase.from('global_discoveries').select('*');
    if (error) throw error;

    const total = data.length;
    let totalOwners = 0;
    const rarityCounts: Record<string, number> = {
      COMMON: 0,
      UNCOMMON: 0,
      RARE: 0,
      GOLD: 0,
      PLATINUM: 0,
      MYTHIC: 0
    };

    data.forEach(row => {
      totalOwners += (row.total_owners || 1);
      const card = row.card_data as CardData;
      if (card && card.rarity && rarityCounts[card.rarity] !== undefined) {
        rarityCounts[card.rarity]++;
      }
    });

    return {
      totalUnique: total,
      totalDiscoveries: totalOwners,
      rarityCounts
    };
  } catch (error) {
    console.error('Error getting global stats:', error);
    return null;
  }
}

/**
 * Resetea todos los descubrimientos globales (Admin Only).
 */
export async function resetGlobalDiscoveries() {
  try {
    // Note: This requires admin bypass or specific policy
    const { error } = await supabase.from('global_discoveries').delete().neq('card_id', '0');
    if (error) throw error;
    console.log('Global discoveries reset successfully.');
  } catch (error) {
    console.error('Error resetting global discoveries:', error);
  }
}

