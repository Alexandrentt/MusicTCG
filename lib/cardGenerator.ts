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

export type CardRarity = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type CardType = 'CREATURE' | 'EVENT' | 'ARTIFACT';

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

// MasterCardTemplate is now imported from ../types/types

// ============================================
// MÁQUINA DE RAREZA (GDD: Views = Rarity)
// ============================================

export function determineRarity(viewCount: number): CardRarity {
  // GDD Sección 2: Cálculo de Rareza por vistas de YouTube
  const views = Math.max(0, viewCount);

  if (views > 1_000_000_000) {
    return 'PLATINUM'; // > 1 billón
  } else if (views > 100_000_000) {
    return 'GOLD'; // 100M - 999M
  } else if (views > 1_000_000) {
    return 'SILVER'; // 1M - 99M
  } else {
    return 'BRONZE'; // < 1M
  }
}

export function getCostByRarity(rarity: CardRarity): number {
  switch (rarity) {
    case 'PLATINUM':
      return 6;
    case 'GOLD':
      return 5;
    case 'SILVER':
      return 3;
    case 'BRONZE':
      return 1;
  }
}

// ============================================
// MÁQUINA DE PRESUPUESTO (GDD 9.2)
// ============================================

export function calculateBudget(cost: number): number {
  // GDD 9.2: Presupuesto Base = (Coste * 2) + 1
  return cost * 2 + 1;
}

export function distributeBudget(budget: number): { atk: number; def: number } {
  // GDD: Asegurar mínimo 1 en ATK y DEF
  if (budget < 2) return { atk: 1, def: 1 }; // Debería haber presupuesto de al menos 3

  const atkPercentage = 0.3 + Math.random() * 0.4; // 30% a 70%
  let atk = Math.max(1, Math.round(budget * atkPercentage));
  let def = Math.max(1, budget - atk);

  // Reajustar si al redondear nos pasamos o quedamos cortos
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
  // GDD 2.4.3: Multilingüe - Detectar si es un Evento
  const eventKeywords = [
    // English
    'live',
    'remix',
    'intro',
    'outro',
    'interlude',
    'acoustic',
    'unplugged',
    'demo',
    'version',
    'edit',
    // Spanish
    'en vivo',
    'remezcla',
    'acústico',
    'directo',
    'pista oculta',
    'ensayo',
  ];

  const normalizedName = trackName.toLowerCase();
  return eventKeywords.some((keyword) => normalizedName.includes(keyword));
}

// ============================================
// GENERADOR PRINCIPAL DE CARTAS
// ============================================

export class CardGenerator {
  /**
   * GDD Sección 2: Convertir datos de Apple Music + YouTube en Carta
   * 
   * Pipeline:
   * 1. Apple Music API: Esqueleto básico
   * 2. YouTube Data API: Determinar rareza
   * 3. MusicBrainz: Metadatos profundos
   * 4. Hash Determinista: Habilidades únicas
   * 5. Validación de Balance: Ajustar costos
   */
  static generateCard(
    appleData: AppleMusicData,
    youtubeData?: YouTubeData,
    musicbrainzData?: MusicBrainzData
  ): MasterCardTemplate {
    const trackId = appleData.id;

    // 1. Determinar tipo de carta
    const isEvent = detectEventType(appleData.name);
    const type: CardType = isEvent ? 'EVENT' : 'CREATURE';

    // 2. Determinar rareza por vistas de YouTube
    const viewCount = youtubeData?.viewCount || 0;
    const rarity = determineRarity(viewCount);

    // 3. Coste base por rareza
    let baseCost = getCostByRarity(rarity);

    // GDD 2.4.1: Eventos tienen coste reducido a la mitad
    if (isEvent) {
      baseCost = Math.max(1, Math.floor(baseCost / 2));
    }

    // 4. Calcular presupuesto de stats
    let budget = calculateBudget(baseCost);
    const { atk: baseAtk, def: baseDef } = distributeBudget(budget);

    // 5. Generar habilidad procedural
    const ability = AbilityGenerator.generateAbility(
      trackId,
      appleData.primaryGenreName,
      baseCost,
      rarity,
      baseDef
    );

    // 6. GDD 9.2: Validar balance y ajustar coste si es necesario
    let finalCost = baseCost;
    let finalBudget = budget;

    if (ability) {
      const validation = AbilityValidator.validateAndAdjustCost(
        ability,
        baseCost,
        budget
      );
      finalCost = validation.finalCost;
      finalBudget = validation.finalBudget;
    }

    // 7. Redistribuir stats con el presupuesto final
    const { atk, def } = distributeBudget(finalBudget);

    // 8. Extraer subgéneros y keywords
    const subGenres = musicbrainzData?.subGenres || [appleData.primaryGenreName];
    const keywords = this.extractKeywords(appleData.primaryGenreName);

    // 9. Generar etiquetas mecánicas
    const mechanicTags = ability?.mechanicTags || [];

    // 10. ID único de la carta
    const cardId = this.generateCardId(appleData.id, appleData.artistName);

    return {
      id: cardId,
      appleId: appleData.id,
      isrcCode: appleData.isrc || '',
      name: appleData.name,
      artist: appleData.artistName,
      album: appleData.collectionName,
      genre: appleData.primaryGenreName,
      subGenres,
      trackNumber: appleData.trackNumber,
      artworkUrl: appleData.artworkUrl500,
      videoId: youtubeData?.videoId,
      type,
      rarity,
      cost: finalCost,
      budget: finalBudget,
      atk: Math.max(1, atk),
      def: Math.max(1, def),
      abilities: ability ? [ability] : [],
      keywords,
      youtubeViews: viewCount,
      mechanicTags,
      themeColor: this.generateThemeColor(trackId), // Será reemplazado por color real después
    };
  }

  private static extractKeywords(genre: string): Keyword[] {
    // Para eventos, no tienen palabras clave
    // Las palabras clave se asignan proceduralmente via AbilityGenerator
    return [];
  }

  private static generateCardId(appleId: string, artistName: string): string {
    // Hash simple: combine id + artist
    const combined = `${appleId}_${artistName}`.toLowerCase();
    let hash = 0;

    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return `card_${Math.abs(hash)}`;
  }

  private static generateThemeColor(trackId: string): string {
    // Placeholder: será reemplazado por Vibrant.js en el frontend
    // que extrae el color dominante de la portada
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    const index = parseInt(trackId) % colors.length;
    return colors[index];
  }
}

// ============================================
// HELPERS PARA FRONTEND
// ============================================

export function rarityToColor(rarity: CardRarity): string {
  switch (rarity) {
    case 'PLATINUM':
      return '#FFD700'; // Oro brillante
    case 'GOLD':
      return '#C0C0C0'; // Plata
    case 'SILVER':
      return '#CD7F32'; // Bronce
    case 'BRONZE':
      return '#808080'; // Gris
  }
}

export function rarityToLabel(rarity: CardRarity): string {
  switch (rarity) {
    case 'PLATINUM':
      return 'Legendaria';
    case 'GOLD':
      return 'Épica';
    case 'SILVER':
      return 'Rara';
    case 'BRONZE':
      return 'Común';
  }
}

export function typeToLabel(type: CardType): string {
  switch (type) {
    case 'CREATURE':
      return 'Canción';
    case 'EVENT':
      return 'Evento';
    case 'ARTIFACT':
      return 'Artefacto';
  }
}
