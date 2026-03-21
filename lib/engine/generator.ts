import { MasterCardTemplate, CardType, CardRarity, Keyword, GeneratedAbility, CardFormat } from '@/types/types';

export interface CardData extends MasterCardTemplate {
  // Propiedades adicionales si existen
  stats: {
    atk: number;
    def: number;
  };
}

// Generador de números pseudoaleatorios basado en semilla (Mulberry32)
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simple string hash for deterministic seeding from any ID
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) || 1; // Ensure non-zero
}

/**
 * DETERMINA EL FORMATO DE LA CANCIÓN BASADO EN EL TRACK Y EL ALBUM
 */
function detectFormat(track: any): CardFormat {
  const name = (track.trackName || '').toLowerCase();
  const album = (track.collectionName || '').toLowerCase();

  if (album.includes('soundtrack') || album.includes('o.s.t') || album.includes('original soundtrack')) return 'SOUNDTRACK';
  if (name.includes('remix')) return 'REMIX';
  if (name.includes('acoustic') || name.includes('acústico') || name.includes('unplugged')) return 'ACOUSTIC';
  if (name.includes('live') || name.includes('directo') || name.includes('en vivo')) return 'LIVE';
  if (name.includes('feat.') || name.includes('with') || name.includes('featuring')) return 'FEATURE';
  if (name.includes('remaster')) return 'REMASTER';
  if (album.includes('greatest hits') || album.includes('exitos') || album.includes('compilation')) return 'COMPILATION';
  if (album.includes('- ep')) return 'EP';
  if (album.includes('- single')) return 'SINGLE';

  return 'ALBUM'; // Default to Album Track
}

/**
 * MAPEA EL FORMATO AL TIPO DE JUEGO (CREATURE vs EVENT)
 */
function getFormatType(format: CardFormat): CardType {
  switch (format) {
    case 'EP':
    case 'SOUNDTRACK':
    case 'FEATURE':
    case 'REMIX':
    case 'COMPILATION':
      return 'EVENT';
    default:
      return 'CREATURE';
  }
}

/**
 * APLICA MODIFICADORES DE STATS SEGÚN EL FORMATO
 */
function applyFormatModifiers(stats: { cost: number, atk: number, def: number }, format: CardFormat) {
  switch (format) {
    case 'ACOUSTIC': return { ...stats, cost: Math.max(1, stats.cost - 2), atk: Math.max(1, stats.atk - 2), def: stats.def + 1 };
    case 'LIVE': return { ...stats, cost: stats.cost + 1, atk: stats.atk + 1, def: Math.max(1, stats.def - 1) };
    case 'EP': return { ...stats, cost: Math.max(1, stats.cost - 4), atk: Math.max(1, stats.atk - 6), def: Math.max(1, stats.def - 2) };
    case 'FEATURE': return { ...stats, cost: Math.max(1, stats.cost - 1), atk: stats.atk + 1, def: stats.def };
    case 'REMIX': return { ...stats, cost: stats.cost + 1, atk: stats.atk + 1, def: Math.max(1, stats.def - 1) };
    case 'COMPILATION': return { ...stats, cost: Math.max(1, stats.cost - 2), atk: Math.max(1, stats.atk - 1), def: stats.def };
    default: return stats;
  }
}

export function generateCard(track: any, forcedRarity?: CardRarity, youtubeData?: any): CardData {
  // 1. Identificación del Master (Artist + Song Name) para herencia de rareza
  const compositionId = `${track.artistName} - ${track.trackName.replace(/\(.*\)| - .*/g, '').trim()}`;
  const masterSeed = hashString(compositionId);
  const masterRandom = mulberry32(masterSeed);

  // 2. Determinación de Rareza Heredada (Master Rarity)
  let masterRarity: CardRarity = 'BRONZE';
  const rarityRoll = masterRandom();
  if (rarityRoll > 0.999) masterRarity = 'MYTHIC';
  else if (rarityRoll > 0.95) masterRarity = 'PLATINUM';
  else if (rarityRoll > 0.8) masterRarity = 'GOLD';
  else if (rarityRoll > 0.5) masterRarity = 'SILVER';

  // 3. Formato y Tipo Híbrido
  const format = detectFormat(track);
  const type = getFormatType(format);
  const rarity = forcedRarity || masterRarity;

  // 4. Semilla específica para esta variante
  const variantId = track.trackId.toString();
  const variantSeed = hashString(variantId);
  const random = mulberry32(variantSeed);

  // 5. Popularidad y Coincidencia (Antiguo 90%)
  // Si tenemos youtubeData, escalamos la popularidad real
  let popularity = Math.floor(random() * 40) + 60; // Base 60-100
  if (youtubeData?.viewCount) {
    // Escala logarítmica para popularidad basada en views (1k a 1B)
    const logViews = Math.log10(Math.max(1000, youtubeData.viewCount));
    popularity = Math.min(100, Math.floor((logViews / 9) * 100));
  }

  // 6. Coste Base por Rareza
  let cost = 1;
  if (rarity === 'MYTHIC') cost = 9 + Math.floor(random() * 2);
  else if (rarity === 'PLATINUM') cost = 6 + Math.floor(random() * 3);
  else if (rarity === 'GOLD') cost = 4 + Math.floor(random() * 2);
  else if (rarity === 'SILVER') cost = 2 + Math.floor(random() * 2);
  else cost = 1 + Math.floor(random() * 2);

  // 7. Presupuesto de Stats
  let budget = cost * 2 + 1;
  const genre = track.primaryGenreName || 'Pop';
  const isRock = /rock|metal|punk/i.test(genre);
  const isPop = /pop|r&b|soul/i.test(genre);

  let atk = 0;
  let def = 0;
  if (isRock) {
    atk = Math.ceil(budget * 0.7);
    def = Math.max(1, budget - atk);
  } else if (isPop) {
    def = Math.ceil(budget * 0.7);
    atk = Math.max(1, budget - def);
  } else {
    atk = Math.floor(budget / 2);
    def = Math.ceil(budget / 2);
  }

  // 8. Aplicar Modificadores de Formato
  if (type === 'CREATURE') {
    const mods = applyFormatModifiers({ cost, atk, def }, format);
    cost = mods.cost;
    atk = mods.atk;
    def = mods.def;
  } else {
    // Los Eventos son más baratos pero no tienen stats de combate
    cost = Math.max(1, Math.floor(cost / 1.5));
    atk = 0;
    def = 0;
  }

  // Special case for Absolute Soundtracks
  if (format === 'SOUNDTRACK') {
    cost = 5;
    atk = 0;
    def = 0;
  }

  // 9. Generación de Habilidades
  const abilities: any[] = [];
  if (format === 'SOUNDTRACK') {
    abilities.push({ keyword: 'Soundtrack', description: 'Atmosférico: Las Criaturas del mismo género reciben +1/+1 mientras esté en juego.' });
  } else if (type === 'EVENT') {
    abilities.push({ keyword: 'Sync', description: 'Al jugar esta carta, tu reputación aumenta en 3 si coincide con el género actual.' });
  } else if (isRock && random() > 0.5) {
    abilities.push({ keyword: 'Drop', description: 'Ataca inmediatamente al entrar al escenario.' });
  } else {
    abilities.push({ keyword: 'Sustain', description: 'Recupera 1 de DEF al inicio de tu turno.' });
  }

  // 10. Metadata Final
  const artworkUrl = track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '600x600bb') : '';
  const colors = ['#e11d48', '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0d9488', '#475569'];
  const themeColor = colors[Math.floor(random() * colors.length)];

  return {
    id: variantId,
    type,
    name: track.trackName,
    artist: track.artistName,
    album: track.collectionName,
    genre,
    artworkUrl: artworkUrl.replace('http://', 'https://'),
    previewUrl: track.previewUrl,
    rarity,
    cost,
    atk,
    def,
    stats: { atk, def },
    abilities,
    themeColor,
    videoId: youtubeData?.videoId || track.videoId,
    trackNumber: track.trackNumber,
    keywords: (abilities.map(a => a.keyword).filter(Boolean) as Keyword[]),
    format,
    popularity,
    isCanonical: format === 'SINGLE' || format === 'ALBUM',
    heritage: {
      compositionId,
      heritageRole: format === 'SINGLE' ? 'MASTER' : 'VARIANT',
      masterRarity,
    },
    isMythic: rarity === 'MYTHIC',
  };
}
