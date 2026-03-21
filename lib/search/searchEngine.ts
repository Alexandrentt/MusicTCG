// lib/search/searchEngine.ts

import Fuse from 'fuse.js'; // Librería para fuzzy matching
import { MasterCardTemplate } from '@/types/types';
import { CardData } from '@/lib/engine/generator';

export interface SearchResult {
    id: string;
    trackId: string;
    name: string;
    artist: string;
    album?: string;
    genre: string;
    artworkUrl: string;
    matchScore: number;        // 0-1 (qué tan bien coincide)
    matchType: 'EXACT' | 'FUZZY' | 'PARTIAL';
    cardData?: CardData;
    rarity?: string;
}

export interface SearchFilters {
    type: 'ALL' | 'SONG' | 'ARTIST' | 'ALBUM';
    genre?: string;
    rarity?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    hasCard?: boolean; // Solo cartas descubiertas o no?
}

export class SearchEngine {
    private allTracks: CardData[] = [];
    private fuse: Fuse<CardData>;
    private cache: Map<string, SearchResult[]> = new Map();
    // private cacheTimeout = 5 * 60 * 1000; // 5 minutos (unused but in original spec)

    constructor(allTracks: CardData[]) {
        this.allTracks = allTracks;

        // Configurar Fuse.js para búsqueda fuzzy
        this.fuse = new Fuse(allTracks, {
            keys: ['name', 'artist', 'album', 'genre'],
            threshold: 0.3,        // 0 = exacto, 1 = cualquier cosa
            ignoreLocation: true,
            shouldSort: true,
            minMatchCharLength: 2, // Min caracteres para buscar
            includeScore: true     // Important for matchScore
        });
    }

    /**
     * Búsqueda principal
     */
    search(
        query: string,
        filters: SearchFilters = { type: 'ALL' }
    ): SearchResult[] {
        if (!query || query.length < 1) return [];

        // Check cache
        const cacheKey = `${query}|${JSON.stringify(filters)}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        // ────────────────────────────────────────────────────────────────
        // BÚSQUEDA FUZZY
        // ────────────────────────────────────────────────────────────────

        const fuzzyResults = this.fuse.search(query).map((result) => ({
            ...result.item,
            matchScore: 1 - (result.score || 0),
            matchType: 'FUZZY' as const,
        }));

        // ────────────────────────────────────────────────────────────────
        // BÚSQUEDA EXACTA (boost)
        // ────────────────────────────────────────────────────────────────

        const exactResults = this.allTracks
            .filter((track) => {
                const q = query.toLowerCase();
                return (
                    track.name.toLowerCase() === q ||
                    track.artist?.toLowerCase() === q ||
                    (track.album && track.album.toLowerCase() === q)
                );
            })
            .map((track) => ({
                ...track,
                matchScore: 1,
                matchType: 'EXACT' as const,
            }));

        // ────────────────────────────────────────────────────────────────
        // COMBINAR Y DEDUPLICAR
        // ────────────────────────────────────────────────────────────────

        // Explicitly type the item for results
        type IntermediateResult = CardData & { matchScore: number; matchType: 'EXACT' | 'FUZZY' };
        const allResults: IntermediateResult[] = [...(exactResults as any[]), ...(fuzzyResults as any[])];
        const deduped = this.deduplicateTracks(allResults);

        // ────────────────────────────────────────────────────────────────
        // APLICAR FILTROS
        // ────────────────────────────────────────────────────────────────

        let filtered = deduped;

        if (filters.type === 'SONG') {
            filtered = filtered.filter((t) => t.type === 'CREATURE' || t.type === 'EVENT');
        } else if (filters.type === 'ARTIST') {
            filtered = filtered.filter((t) => t.artist?.toLowerCase().includes(query.toLowerCase()));
        } else if (filters.type === 'ALBUM') {
            filtered = filtered.filter((t) => t.album?.toLowerCase().includes(query.toLowerCase()));
        }

        if (filters.genre) {
            filtered = filtered.filter((t) => t.genre === filters.genre);
        }

        if (filters.rarity) {
            filtered = filtered.filter((t) => t.rarity === filters.rarity);
        }

        // ────────────────────────────────────────────────────────────────
        // CONVERTIR A SearchResult
        // ────────────────────────────────────────────────────────────────

        const results: SearchResult[] = filtered
            .slice(0, 100) // Máx 100 resultados
            .map((track) => ({
                id: track.id,
                trackId: track.id,
                name: track.name,
                artist: track.artist || 'Unknown',
                album: track.album,
                genre: track.genre,
                artworkUrl: track.artworkUrl,
                rarity: track.rarity,
                matchScore: (track as any).matchScore || 0.5,
                matchType: (track as any).matchType || 'FUZZY',
                cardData: track,
            }));

        // Cache resultado
        this.cache.set(cacheKey, results);

        return results;
    }

    /**
     * Deduplicar tracks (ISRC exacto, fuzzy matching)
     */
    private deduplicateTracks(
        tracks: (CardData & { matchScore: number; matchType: string })[]
    ) {
        const seen = new Set<string>();
        const result = [];

        for (const track of tracks) {
            // Usar ISRC si existe, sino usar "Artist - Name"
            const key = track.heritage?.compositionId || `${track.artist}-${track.name}`;

            if (!seen.has(key)) {
                seen.add(key);
                result.push(track);
            }
        }

        return result;
    }

    /**
     * Clear cache (después de agregar nuevas cartas)
     */
    clearCache() {
        this.cache.clear();
    }
}
