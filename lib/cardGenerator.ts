/**
 * GENERADOR DE CARTAS PROCEDURALES - MusicTCG
 * GDD Sección 2: Anatomía de las Cartas y Generación
 * 
 * Este módulo convierte datos reales de Apple Music en cartas de juego
 * usando:
 * - Apple Music API: Esqueleto de la carta (nombre, artista, género)
 * - MusicBrainz: Metadatos profundos (subgéneros, BPM)
 * - YouTube Data API: Popularidad (vistas = rareza)
 */
import {
  AbilityGenerator,
  AbilityValidator,
} from './abilityEngine';

import {
  Keyword,
  MasterCardTemplate,
  GeneratedAbility,
} from '../types/types';

export type { Keyword, MasterCardTemplate, GeneratedAbility };

// ============================================
// TIPOS Y INTERFACES
// ============================================

import { CardRarity, CardType } from '../types/types';

export interface AppleMusicData {
  id: string;
  name: string;
  artistName: string;
  collectionName: string;
  primaryGenreName: string;
  trackNumber: number;
  artworkUrl500: string;
  isrc?: string;
  durationMs?: number;
}

export interface YouTubeData {
  videoId: string;
  viewCount: number;
  publishedAt?: string;
}

export interface MusicBrainzData {
  subGenres?: string[];
  bpm?: number;
  hasFeatures?: boolean;
}

// ============================================
// MÁQUINA DE RAREZA (GDD: Views = Rarity)
// ============================================

export function determineRarity(viewCount: number): CardRarity {
  const views = Math.max(0, viewCount);
  if (views > 1_000_000_000) return 'MYTHIC';
  if (views > 500_000_000) return 'PLATINUM';
  if (views > 100_000_000) return 'GOLD';
  if (views > 1_000_000) return 'SILVER';
  return 'BRONZE';
}

export function getCostByRarity(rarity: CardRarity): number {
  switch (rarity) {
    case 'MYTHIC': return 8;
    case 'PLATINUM': return 6;
    case 'GOLD': return 5;
    case 'SILVER': return 3;
    case 'BRONZE': return 1;
    default: return 1;
  }
}

// ============================================
// MÁQUINA DE PRESUPUESTO (GDD 9.2)
// ============================================

export function calculateBudget(cost: number): number {
  return cost * 2 + 1;
}

export function distributeBudget(budget: number): { atk: number; def: number } {
  if (budget < 2) return { atk: 1, def: 1 };
  const atkPercentage = 0.3 + Math.random() * 0.4;
  let atk = Math.max(1, Math.round(budget * atkPercentage));
  let def = Math.max(1, budget - atk);
  if (atk + def !== budget) {
    if (atk + def < budget) atk += (budget - (atk + def));
    else if (def > 1) def -= ((atk + def) - budget);
    else atk -= ((atk + def) - budget);
  }
  return { atk, def };
}

// ============================================
// DETECTOR DE EVENTOS (GDD 2.4)
// ============================================

export function detectEventType(trackName: string): boolean {
  const eventKeywords = ['live', 'remix', 'intro', 'outro', 'interlude', 'acoustic', 'unplugged', 'demo', 'version', 'edit', 'en vivo', 'remezcla', 'acústico', 'directo', 'pista oculta', 'ensayo'];
  const normalizedName = trackName.toLowerCase();
  return eventKeywords.some((keyword) => normalizedName.includes(keyword));
}

// ============================================
// GENERADOR PRINCIPAL DE CARTAS
// ============================================

export class CardGenerator {
  static generateCard(appleData: AppleMusicData, youtubeData?: YouTubeData, musicbrainzData?: MusicBrainzData): MasterCardTemplate {
    const trackId = appleData.id;
    const isEvent = detectEventType(appleData.name);
    const type: CardType = isEvent ? 'EVENT' : 'CREATURE';
    const viewCount = youtubeData?.viewCount || 0;
    const rarity = determineRarity(viewCount);
    let baseCost = getCostByRarity(rarity);
    if (isEvent) baseCost = Math.max(1, Math.floor(baseCost / 2));
    let budget = calculateBudget(baseCost);
    const { atk: _baseAtk, def: baseDef } = distributeBudget(budget);
    const ability = AbilityGenerator.generateAbility(trackId, appleData.primaryGenreName, baseCost, rarity, baseDef);
    let finalCost = baseCost;
    let finalBudget = budget;
    if (ability) {
      const validation = AbilityValidator.validateAndAdjustCost(ability, baseCost, budget);
      finalCost = validation.finalCost;
      finalBudget = validation.finalBudget;
    }
    const { atk, def } = distributeBudget(finalBudget);
    const keywords = this.extractKeywords(appleData.primaryGenreName);
    const cardId = this.generateCardId(appleData.id, appleData.name, appleData.artistName);

    return {
      id: cardId,
      name: appleData.name,
      artist: appleData.artistName,
      album: appleData.collectionName,
      genre: appleData.primaryGenreName,
      trackNumber: appleData.trackNumber,
      artworkUrl: appleData.artworkUrl500,
      videoId: youtubeData?.videoId,
      type,
      rarity,
      cost: finalCost,
      atk: Math.max(1, atk),
      def: Math.max(1, def),
      abilities: ability ? [ability] : [],
      keywords,
      themeColor: this.generateThemeColor(trackId),
    };
  }

  private static extractKeywords(_genre: string): Keyword[] { return []; }

  // Helper to remove variations like (Remaster), - Single, etc. so we can group them
  private static extractCanonicalTrackName(name: string): string {
    let canonical = name;
    // Remove content inside parentheses or brackets
    canonical = canonical.replace(/\s*[([].*?[)\]]/g, '');
    // Remove content after " - "
    canonical = canonical.split(' - ')[0];
    // Special case: remove content after ", " if it indicates a time/version
    const commaSplit = canonical.split(', ');
    if (commaSplit.length > 1) {
      const afterComma = commaSplit[1].toLowerCase();
      if (afterComma.match(/(remix|version|edit|am|pm|pt\.|part|live|acoustic|instrumental)/)) {
        canonical = commaSplit[0];
      }
    }
    return canonical.trim().toLowerCase();
  }

  private static generateCardId(appleId: string, trackName: string, artistName: string): string {
    const canonicalName = this.extractCanonicalTrackName(trackName);
    const combined = `${canonicalName}_${artistName.toLowerCase()}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `card_${Math.abs(hash)}`;
  }

  private static generateThemeColor(trackId: string): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    const index = parseInt(trackId) % colors.length;
    return colors[index] || '#4ECDC4';
  }
}

// ============================================
// HELPERS PARA FRONTEND
// ============================================

export function rarityToColor(rarity: CardRarity): string {
  switch (rarity) {
    case 'MYTHIC': return '#a855f7';
    case 'PLATINUM': return '#22d3ee';
    case 'GOLD': return '#ffd700';
    case 'SILVER': return '#94a3b8';
    case 'BRONZE': return '#cd7f32';
    default: return '#808080';
  }
}

export function rarityToLabel(rarity: CardRarity): string {
  switch (rarity) {
    case 'MYTHIC': return 'Mítica';
    case 'PLATINUM': return 'Legendaria';
    case 'GOLD': return 'Épica';
    case 'SILVER': return 'Rara';
    case 'BRONZE': return 'Común';
    default: return rarity;
  }
}

export function typeToLabel(type: CardType): string {
  switch (type) {
    case 'CREATURE': return 'Criatura';
    case 'EVENT': return 'Evento';
    default: return type;
  }
}
