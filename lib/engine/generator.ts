export interface CardData {
  id: string;
  type: 'CREATURE' | 'EVENT';
  name: string;
  artist: string;
  album: string;
  genre: string;
  artUrl: string;
  previewUrl?: string;
  rarity: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  cost: number;
  stats: {
    atk: number;
    def: number;
  };
  abilities: { keyword?: string; description: string }[];
  themeColor: string;
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

export function generateCard(track: any, forcedRarity?: CardData['rarity']): CardData {
  // 1. Semilla basada en el ID — soporta IDs numéricos y strings arbitrarios
  const rawId = track.trackId.toString();
  const parsed = parseInt(rawId, 10);
  const seed = isNaN(parsed) ? hashString(rawId) : parsed;
  const random = mulberry32(seed);

  // 2. Determinación de Coste y Rareza (Simulando popularidad con el hash por ahora)
  const costRoll = random();
  let cost = 1;
  let rarity: CardData['rarity'] = 'BRONZE';

  // Popularity Factor (Simulated with release date and track name length)
  const releaseYear = track.releaseDate ? new Date(track.releaseDate).getFullYear() : 2020;
  const isClassic = releaseYear < 2000;
  const isTrending = releaseYear >= 2023;
  const popularityBonus = (isClassic ? 0.1 : 0) + (isTrending ? 0.05 : 0);

  if (forcedRarity) {
    rarity = forcedRarity;
    if (rarity === 'PLATINUM') cost = 6 + Math.floor(random() * 3);
    else if (rarity === 'GOLD') cost = 4 + Math.floor(random() * 2);
    else if (rarity === 'SILVER') cost = 2 + Math.floor(random() * 2);
    else cost = 1 + Math.floor(random() * 2);
  } else {
    const roll = costRoll + popularityBonus;
    if (roll > 0.95) {
      cost = 6 + Math.floor(random() * 3); // 6 a 8
      rarity = 'PLATINUM';
    } else if (roll > 0.8) {
      cost = 4 + Math.floor(random() * 2); // 4 a 5
      rarity = 'GOLD';
    } else if (roll > 0.5) {
      cost = 2 + Math.floor(random() * 2); // 2 a 3
      rarity = 'SILVER';
    } else {
      cost = 1 + Math.floor(random() * 2); // 1 a 2
      rarity = 'BRONZE';
    }
  }

  // 3. Presupuesto Base de Estadísticas: (Coste * 2) + 1
  let budget = cost * 2 + 1;

  // 4. Filtro de Evento (Artefactos) - GDD 2.4
  const eventRegex = /(live|remix|intro|outro|interlude|acoustic|unplugged|demo|version|edit|en vivo|remezcla|acústico|directo|ensayo)/i;
  const isEvent = eventRegex.test(track.trackName);
  let type: 'CREATURE' | 'EVENT' = 'CREATURE';

  const abilities: { keyword?: string; description: string }[] = [];
  let tax = 0;

  if (isEvent) {
    type = 'EVENT';
    cost = Math.max(1, Math.floor(cost / 2));
    budget = 0; // Los eventos no tienen stats de combate

    // Habilidad de evento procedural básica
    const eventEffects = [
      'Restaura 2 de Defensa a todas tus cartas.',
      'Reduce -1 ATK a todas las cartas rivales.',
      'Roba 2 cartas de tu Playlist.',
      'Inflige 2 de daño a una carta rival aleatoria.'
    ];
    abilities.push({
      keyword: 'Backstage',
      description: eventEffects[Math.floor(random() * eventEffects.length)],
    });
  } else {
    // 5. Sinergia de Género y Habilidades (GDD 6.4)
    const genre = track.primaryGenreName || 'Pop';
    const isRock = /rock|metal|punk/i.test(genre);
    const isPop = /pop|r&b|soul/i.test(genre);
    const isHipHop = /hip-hop|rap|urbano/i.test(genre);
    const isElectronic = /electronic|dance|house/i.test(genre);
    const isSoundtrack = /soundtrack|ost|score|película|motion picture/i.test(genre) || /soundtrack|ost|score/i.test(track.collectionName);

    if (isSoundtrack && random() > 0.3) {
      abilities.push({ keyword: 'soundtrack', description: 'soundtrackDesc' });
      tax += 2;
    } else if (isRock && random() > 0.4) {
      abilities.push({ keyword: 'distortion', description: 'distortionDesc' });
      tax += 1;
    } else if (isPop && random() > 0.4) {
      abilities.push({ keyword: 'hypeEngine', description: 'hypeEngineDesc' });
      tax += 2;
    } else if (isHipHop && random() > 0.4) {
      abilities.push({ keyword: 'dissTrack', description: 'dissTrackDesc' });
      tax += 2;
    } else if (isElectronic && random() > 0.4) {
      abilities.push({ keyword: 'frenzy', description: 'frenzyDesc' });
      tax += 2;
    } else if (random() > 0.8) {
      abilities.push({ keyword: 'sustain', description: 'sustainDesc' });
      tax += 1;
    } else if (random() > 0.8) {
      abilities.push({ keyword: 'stealth', description: 'stealthDesc' });
      tax += 2;
    } else if (random() > 0.8) {
      abilities.push({ keyword: 'vip', description: 'vipDesc' });
      tax += 2;
    } else if (random() > 0.6) {
      abilities.push({ keyword: 'taunt', description: 'tauntDesc' });
      tax += 1;
    }

    // 6. El Privilegio de la Fama (Star Power Bonus) - GDD 9.3
    if (rarity === 'GOLD') tax = Math.max(0, tax - 1);
    if (rarity === 'PLATINUM') tax = Math.max(0, tax - 2);

    budget -= tax;
    if (budget < 1) budget = 1; // Mínimo físico
  }

  // 7. Distribución de Stats
  let atk = 0;
  let def = 0;

  if (type === 'CREATURE') {
    const genre = track.primaryGenreName || 'Pop';
    const isRock = /rock|metal|punk/i.test(genre);
    const isPop = /pop|r&b|soul/i.test(genre);

    if (isRock) {
      atk = Math.ceil(budget * 0.7);
      def = budget - atk;
    } else if (isPop) {
      def = Math.ceil(budget * 0.7);
      atk = budget - def;
    } else {
      atk = Math.floor(budget / 2);
      def = Math.ceil(budget / 2);
    }

    if (atk < 0) atk = 0;
    if (def < 1) def = 1;
  }

  // 8. Extracción de Color (Simulada determinísticamente)
  const colors = ['#e11d48', '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0d9488', '#475569'];
  const themeColor = colors[Math.floor(random() * colors.length)];

  // Mejorar calidad de imagen de Apple Music (100x100 -> 500x500)
  const artUrl = track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '500x500bb') : '';

  return {
    id: track.trackId.toString(),
    type,
    name: track.trackName,
    artist: track.artistName,
    album: track.collectionName,
    genre: track.primaryGenreName,
    artUrl,
    previewUrl: track.previewUrl,
    rarity,
    cost,
    stats: { atk, def },
    abilities,
    themeColor,
  };
}
