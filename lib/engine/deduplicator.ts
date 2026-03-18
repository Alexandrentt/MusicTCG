/**
 * MusicTCG - Core Data Validation & Deduplication Engine
 * Specialized in normalizing track data from APIs (iTunes, YT) and filtering parodies.
 */

interface RawTrack {
    trackId: string | number;
    trackName: string;
    artistName: string;
    collectionName?: string;
    releaseDate?: string;
    artworkUrl100?: string;
    viewCount?: number;
    duration?: number; // In seconds
}

interface VideoResult {
    title: string;
    description: string;
    viewCount: number;
    duration: number; // In seconds
    isVerifiedArtist: boolean;
}

/**
 * Normalizes strings by removing common suffixes, special characters and lowercase.
 */
export function normalizeString(str: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/\(remastered\b.*\)/gi, '')
        .replace(/- single\b.*/gi, '')
        .replace(/\bfeat\..*/gi, '')
        .replace(/\bft\..*/gi, '')
        .replace(/[^a-z0-9]/gi, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * Levenshtein distance for fuzzy artist matching (Anti-Parody/Cover detection)
 */
function levenshteinDistance(a: string, b: string): number {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
}

/**
 * Calculates similarity percentage between two strings.
 */
function getSimilarity(a: string, b: string): number {
    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return (1 - distance / maxLength) * 100;
}

/**
 * DEDUPLICATION ALGORITHM
 * Groups tracks by normalized identity and selects the "Master Card".
 */
export function deduplicateTracks(tracks: RawTrack[]): RawTrack[] {
    const groups = new Map<string, RawTrack[]>();

    tracks.forEach(t => {
        const key = `${normalizeString(t.artistName)}_${normalizeString(t.trackName)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(t);
    });

    const masterTracks: RawTrack[] = [];

    groups.forEach((items, key) => {
        // 1. Sort by logic: Album === Artist name (Selt-titled) or Older date
        items.sort((a, b) => {
            const aIsSelfTitled = normalizeString(a.collectionName || '') === normalizeString(a.artistName);
            const bIsSelfTitled = normalizeString(b.collectionName || '') === normalizeString(b.artistName);

            if (aIsSelfTitled && !bIsSelfTitled) return -1;
            if (!aIsSelfTitled && bIsSelfTitled) return 1;

            const dateA = new Date(a.releaseDate || '2099-01-01').getTime();
            const dateB = new Date(b.releaseDate || '2099-01-01').getTime();
            return dateA - dateB;
        });

        const master = { ...items[0] };

        // 2. Sum "Hype" (views) of all duplicates for the Master Card
        const totalViews = items.reduce((sum, item) => sum + (item.viewCount || 0), 0);
        master.viewCount = totalViews;

        masterTracks.push(master);
    });

    return masterTracks;
}

/**
 * ANTI-PARODY VALIDATION ALGORITHM
 * Filters views from parody channels and fuses matching secondary sources.
 */
export function validateViewCount(originalTrack: RawTrack, relatedVideos: VideoResult[]): number {
    let validatedCount = 0;
    const negativeKeywords = ["parodia", "parody", "cover", "tutorial", "karaoke"];

    relatedVideos.forEach(video => {
        const titleLower = video.title.toLowerCase();
        const isParody = negativeKeywords.some(kw => titleLower.includes(kw));

        if (video.isVerifiedArtist) {
            // 100% of views from verified official channel
            validatedCount += video.viewCount;
        } else if (!isParody) {
            // Logic: Audio-Match Fusion
            // If duration matches (+/- 3s), we assume it's the official audio used by fans
            const durationMatch = originalTrack.duration && Math.abs(originalTrack.duration - video.duration) <= 3;

            if (durationMatch) {
                // Penalize 50% for non-verified source but keep it for popularity
                validatedCount += video.viewCount * 0.5;
            }
        }
    });

    return Math.round(validatedCount);
}
