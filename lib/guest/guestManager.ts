import { v4 as generateUUID } from 'uuid';
import { supabase } from '../supabase';
import { MasterCardTemplate } from '@/types/types';

export interface DeckTemplate {
    id: string;
    name: string;
    cards: string[];
}

export interface GuestSession {
    guestId: string;
    inventory: {
        [cardId: string]: number;
    };
    wildcards: {
        bronze: number;
        silver: number;
        gold: number;
        platinum: number;
    };
    decks: DeckTemplate[];
    discoveredCards: string[];
    stats: {
        totalMatches: number;
        wins: number;
    };
}

const GUEST_ID_KEY = 'guest_id';

export function getGuestId(): string {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
        id = generateUUID();
        localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
}

export async function createGuestSession(guestId: string): Promise<GuestSession> {
    const session: GuestSession = {
        guestId,
        inventory: {},
        wildcards: { bronze: 0, silver: 0, gold: 0, platinum: 0 },
        decks: [],
        discoveredCards: [],
        stats: { totalMatches: 0, wins: 0 },
    };

    const { error } = await supabase
        .from('guests')
        .upsert({
            id: guestId,
            inventory: session.inventory,
            wildcards: session.wildcards,
            decks: session.decks,
            discovered_cards: session.discoveredCards,
            stats: session.stats
        });
        
    if (error) {
        console.error('Error creating guest session:', error);
    }
    
    return session;
}

export async function getGuestSession(): Promise<GuestSession | null> {
    const id = getGuestId();
    if (!id) return null;

    const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', id)
        .single();

    if (data) {
        return {
            guestId: data.id,
            inventory: data.inventory || {},
            wildcards: data.wildcards || { bronze: 0, silver: 0, gold: 0, platinum: 0 },
            decks: data.decks || [],
            discoveredCards: data.discovered_cards || [],
            stats: data.stats || { totalMatches: 0, wins: 0 }
        };
    } else {
        return await createGuestSession(id);
    }
}

export async function syncGuestSession(session: GuestSession) {
    const { error } = await supabase
        .from('guests')
        .upsert({
            id: session.guestId,
            inventory: session.inventory,
            wildcards: session.wildcards,
            decks: session.decks,
            discovered_cards: session.discoveredCards,
            stats: session.stats
        });
        
    if (error) {
        console.error('Error syncing guest session:', error);
    }
}

export async function addCardsToInventory(cardIds: string[]) {
    const session = await getGuestSession();
    if (!session) return;

    cardIds.forEach(id => {
        session.inventory[id] = (session.inventory[id] || 0) + 1;
    });

    await syncGuestSession(session);
}

export async function updateGuestStats(win: boolean) {
    const session = await getGuestSession();
    if (!session) return;

    session.stats.totalMatches += 1;
    if (win) session.stats.wins += 1;

    await syncGuestSession(session);
}
