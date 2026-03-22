// lib/engine/artworkEnricher.ts
// Enriquece el artworkUrl de una carta con la variante más visual posible.
// Sin API externa adicional para el caso base; enriquecimiento lazy con Cover Art Archive.

import { CardData } from './generator';

// ── YouTube thumbnail ──────────────────────────────────────────────────────
export function getYouTubeThumbnail(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// ── Cover Art Archive (lazy, con caché en memoria) ────────────────────────
interface CAACacheEntry { images: string[]; fetchedAt: number; }
const caaCache = new Map<string, CAACacheEntry>();
const CAA_TTL = 30 * 60 * 1000; // 30 min

export async function getCoverArtVariants(
    artist: string,
    album: string,
): Promise<string[]> {
    const cacheKey = `${artist}::${album}`.toLowerCase();
    const cached = caaCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CAA_TTL) return cached.images;

    try {
        const query = encodeURIComponent(`release:"${album}" AND artist:"${artist}"`);
        const mbRes = await fetch(
            `https://musicbrainz.org/ws/2/release/?query=${query}&limit=3&fmt=json`,
            { headers: { 'User-Agent': 'MusicTCG/1.0 (contact@musictcg.app)' } }
        );
        if (!mbRes.ok) return [];
        const mbData = await mbRes.json();
        const mbid = mbData.releases?.[0]?.id;
        if (!mbid) return [];

        const caaRes = await fetch(`https://coverartarchive.org/release/${mbid}`, {
            headers: { Accept: 'application/json' },
        });
        if (!caaRes.ok) {
            caaCache.set(cacheKey, { images: [], fetchedAt: Date.now() });
            return [];
        }
        const caaData = await caaRes.json();
        const images: string[] = (caaData.images || [])
            .filter((img: any) => img.approved)
            .map((img: any) => img.thumbnails?.['500'] || img.thumbnails?.large || img.image)
            .filter(Boolean)
            .map((url: string) => url.replace('http://', 'https://'));

        caaCache.set(cacheKey, { images, fetchedAt: Date.now() });
        return images;
    } catch {
        return [];
    }
}

// ── Hash determinístico (igual que generator.ts) ──────────────────────────
function hashStr(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return Math.abs(h);
}

// ── Variante visual CSS por canción ───────────────────────────────────────
export interface ArtworkVariant {
    filter: string;
    objectPosition: string;
    overlayColor: string;
    overlayOpacity: number;
}

const POSITIONS = [
    'center center', 'top left', 'top right',
    'bottom left', 'bottom right', 'center top',
    'center bottom', '20% 30%', '70% 20%',
    '40% 80%', '60% 40%', '30% 70%',
];

const FILTER_VARIANTS = (hue: number, sat: number, light: number) => [
    `hue-rotate(${hue % 30 - 15}deg) saturate(${100 + sat}%)`,
    `hue-rotate(${hue % 20}deg) brightness(${95 + light / 2}%)`,
    `saturate(${85 + sat}%) contrast(105%)`,
    `hue-rotate(${hue % 15 - 7}deg) saturate(${110 + sat}%) brightness(${98 + light / 3}%)`,
    `contrast(${100 + light / 2}%) saturate(${95 + sat}%)`,
];

export function getArtworkVariant(trackId: string, trackName: string): ArtworkVariant {
    const seed = hashStr(`${trackId}::${trackName}`);
    const r = (offset: number) => ((seed >> offset) & 0xFF) / 255;

    const hue = Math.floor(r(8) * 360);
    const sat = Math.floor(r(16) * 30) - 15;
    const light = Math.floor(r(24) * 20) - 10;
    const posIdx = seed % POSITIONS.length;
    const filters = FILTER_VARIANTS(hue, sat, light);
    const filterIdx = (seed >> 4) % filters.length;
    const overlayHue = (hue + 120) % 360;
    const overlayOpacity = 0.04 + r(12) * 0.08;

    return {
        filter: filters[filterIdx],
        objectPosition: POSITIONS[posIdx],
        overlayColor: `hsl(${overlayHue}, 60%, 50%)`,
        overlayOpacity,
    };
}

// ── Función principal sincrónica ──────────────────────────────────────────
export function getBestArtworkSync(card: CardData): {
    url: string;
    variant: ArtworkVariant;
    source: 'youtube' | 'itunes';
} {
    const variant = getArtworkVariant(card.id, card.name);

    if (card.videoId) {
        return { url: getYouTubeThumbnail(card.videoId), variant, source: 'youtube' };
    }

    return {
        url: card.artworkUrl?.replace('http://', 'https://') || '',
        variant,
        source: 'itunes',
    };
}
