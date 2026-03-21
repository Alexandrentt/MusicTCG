import { supabase } from '@/lib/supabase';
import { MasterCardTemplate } from '@/types/types';

export async function getAllCards(): Promise<MasterCardTemplate[]> {
    try {
        const { data, error } = await supabase.from('cards').select('*');
        if (error) throw error;

        return data as MasterCardTemplate[];
    } catch (error) {
        console.error("Error fetching all cards for bot generation:", error);
        return [];
    }
}

export async function getCardById(cardId: string): Promise<MasterCardTemplate | null> {
    try {
        const { data, error } = await supabase.from('cards').select('*').eq('id', cardId).single();
        if (error) throw error;
        
        if (data) {
            return data as MasterCardTemplate;
        }
    } catch (error) {
        console.error("Error fetching card by ID:", error);
    }
    return null;
}
