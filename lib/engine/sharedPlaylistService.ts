import { CardData } from '@/lib/engine/generator';

// Combine and shuffle the decks to create the game's shared playlist
export function getSharedPlaylist(deckA: CardData[], deckB: CardData[], isLocalPvP: boolean): CardData[] {
    // Collect all cards that have a preview URL to build the playlist
    const combined = [...deckA, ...(deckB || [])].filter(card => !!card.previewUrl);

    // Remove duplicates to avoid playing the exact same preview multiple times in a row
    const uniqueMap = new Map<string, CardData>();
    combined.forEach(card => uniqueMap.set(card.id, card));
    const unique = Array.from(uniqueMap.values());

    // Shuffle the unique tracks
    for (let i = unique.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    return unique;
}

export function checkCoincidenceBonus(cardGenre: string) {
    return null;
}
