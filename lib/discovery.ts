import { supabase } from './supabase';
import { CardData } from './engine/generator';

// Helper to serialize errors properly
function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === 'object' && error !== null) {
    return JSON.stringify(error);
  }
  return String(error);
}

// Retry helper for Supabase operations
async function withRetry<T>(
  operation: () => Promise<{ data: T; error: Error | null }>,
  retries: number = 3,
  delay: number = 100
): Promise<{ data: T; error: Error | null }> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError;
}

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
    const result = await withRetry(async () => {
      const res = await supabase
        .from('global_discoveries')
        .select('*')
        .order('discovered_at', { ascending: false })
        .limit(count);
      return { data: res.data as any[] | null, error: res.error };
    });

    if (result.error) throw result.error;

    return result.data || [];
  } catch (error) {
    console.error('Error getting recent discoveries:', serializeError(error));
    return [];
  }
}

export async function getGlobalStats() {
  try {
    const result = await withRetry(async () => {
      const res = await supabase
        .from('global_discoveries')
        .select('*');
      return { data: res.data as any[] | null, error: res.error };
    });
    if (result.error) throw result.error;

    const data = result.data || [];
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

    data.forEach((row: { total_owners?: number; card_data?: CardData }) => {
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
    console.error('Error getting global stats:', serializeError(error));
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

