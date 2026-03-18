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
  videoId?: string;
  trackNumber?: number;
  lyrics?: string;
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

export function generateCard(track: any, forcedRarity?: CardData['rarity'], youtubeData?: any): CardData {
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
    budget = Math.max(2, Math.floor(budget / 1.5));

    // Habilidades de evento — detectar tipo de evento por nombre
    const trackNameLower = track.trackName.toLowerCase();
    const isLive = /live|en vivo|directo/i.test(trackNameLower);
    const isRemix = /remix|remezcla/i.test(trackNameLower);
    const isAcoustic = /acoustic|acústico|unplugged/i.test(trackNameLower);
    const isOutro = /outro|interlude|intro/i.test(trackNameLower);

    if (isLive) {
      abilities.push({ keyword: 'Live', description: 'Energía del público: Cuesta -1 energía y otorga +1 Hype al jugador.' });
    } else if (isRemix) {
      abilities.push({ keyword: 'Remix', description: 'Reordena las próximas 3 cartas de tu Playlist antes de que suenen.' });
    } else if (isAcoustic) {
      abilities.push({ keyword: 'Acoustic', description: 'Versión íntima: No puede ser objetivo de efectos hasta que ataque primero.' });
    } else if (isOutro) {
      abilities.push({ keyword: 'Bridge', description: 'Transición: La próxima Criatura que juegues recibe +1 DEF este turno.' });
    } else {
      const eventEffects = [
        { keyword: 'Backstage', description: 'Restaura 2 de Defensa a todas tus Criaturas en juego.' },
        { keyword: 'Backstage', description: 'Reduce -1 ATK a una Criatura rival de tu elección.' },
        { keyword: 'Backstage', description: 'Roba 2 cartas de tu Playlist.' },
        { keyword: 'Backstage', description: 'Inflige 2 de daño a una Criatura rival aleatoria.' },
        { keyword: 'Loop', description: 'Bis: Puedes volver a jugar este Evento en tu próximo turno sin pagar su coste.' },
      ];
      abilities.push(eventEffects[Math.floor(random() * eventEffects.length)]);
    }
  } else {
    // 5. Sinergia de Género y Habilidades (GDD 6.4)
    const genre = track.primaryGenreName || 'Pop';
    const isRock = /rock|metal|punk/i.test(genre);
    const isPop = /pop|r&b|soul/i.test(genre);
    const isHipHop = /hip-hop|rap|urbano/i.test(genre);
    const isElectronic = /electronic|dance|house/i.test(genre);
    const isSoundtrack = /soundtrack|ost|score|película|motion picture/i.test(genre) || /soundtrack|ost|score/i.test(track.collectionName);

    // Habilidades musicales por género — keywords temáticos del sistema de Playlist Combat
    if (isSoundtrack && random() > 0.3) {
      abilities.push({ keyword: 'Crescendo', description: 'Al inicio de cada uno de tus turnos mientras esté en juego, gana +1 ATK.' });
      tax += 2;
    } else if (isRock && random() > 0.4) {
      const roll = random();
      if (roll > 0.6) {
        abilities.push({ keyword: 'Drop', description: 'La caída: Al entrar en juego, ataca inmediatamente con +2 ATK adicional (una vez).' });
        tax += 2;
      } else if (roll > 0.3) {
        abilities.push({ keyword: 'Distorsión', description: 'Agresiva: Cuando ataca y derrota a una Criatura, inflige 1 de daño adicional al rival.' });
        tax += 1;
      } else {
        abilities.push({ keyword: 'Bass Boost', description: 'Bajos potentes: +2 ATK pero -1 DEF. El ataque aplasta pero la defensa sufre.' });
        tax += 1;
      }
    } else if (isPop && random() > 0.4) {
      const roll = random();
      if (roll > 0.6) {
        abilities.push({ keyword: 'Hype Engine', description: 'Éxito viral: Al entrar en juego, otorga +1 Hype al jugador.' });
        tax += 2;
      } else if (roll > 0.3) {
        abilities.push({ keyword: 'Falsetto', description: 'Evasiva: -1 ATK pero +2 DEF. Difícil de derrotar, esquiva lo que puede.' });
        tax += 1;
      } else {
        abilities.push({ keyword: 'Featuring', description: 'Colaboración: Si controlas otra Criatura del mismo artista, gana +2 ATK.' });
        tax += 2;
      }
    } else if (isHipHop && random() > 0.4) {
      const roll = random();
      if (roll > 0.6) {
        abilities.push({ keyword: 'Diss Track', description: 'Al atacar una Criatura rival, reduce su DEF en 1 permanentemente.' });
        tax += 2;
      } else {
        abilities.push({ keyword: 'Sample', description: 'Sample: Copia el ATK o el DEF de una de tus Criaturas en juego hasta fin de turno.' });
        tax += 2;
      }
    } else if (isElectronic && random() > 0.4) {
      const roll = random();
      if (roll > 0.6) {
        abilities.push({ keyword: 'Frenzy', description: 'Trance: Puede atacar dos veces por turno, pero la segunda vez con la mitad de ATK.' });
        tax += 3;
      } else if (roll > 0.3) {
        abilities.push({ keyword: 'Autotune', description: 'Adaptable: Una vez por turno, puede intercambiar sus valores de ATK y DEF.' });
        tax += 2;
      } else {
        abilities.push({ keyword: 'Radio Edit', description: 'Rápida: Su coste de invocación es 1 energía menos.' });
        tax += 1;
      }
    } else if (random() > 0.8) {
      abilities.push({ keyword: 'Sustain', description: 'Al inicio de tu turno, recupera 1 de Defensa perdida (hasta su máximo original).' });
      tax += 1;
    } else if (random() > 0.8) {
      abilities.push({ keyword: 'Acoustic', description: 'Íntima: No puede ser objetivo de efectos rivales hasta que declare un ataque.' });
      tax += 2;
    } else if (random() > 0.8) {
      abilities.push({ keyword: 'Outro', description: 'Epílogo: Al ser destruida, inflige 2 de daño a una Criatura rival o al rival directamente.' });
      tax += 2;
    } else if (random() > 0.6) {
      abilities.push({ keyword: 'Taunt', description: 'Provocación: Las Criaturas rivales deben atacar a esta carta si pueden.' });
      tax += 1;
    } else if (random() > 0.85) {
      abilities.push({ keyword: 'Encore', description: 'Bis: Una vez por juego, cuando sea destruida, puede regresar desde el Archivo con 1 DEF.' });
      tax += 3;
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

  if (type === 'CREATURE' || type === 'EVENT') {
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

    // GDD REFINEMENT: Min 1 ATK and 1 DEF for Creatures
    if (type === 'CREATURE') {
      if (atk < 1) atk = 1;
      if (def < 1) def = 1;

      // GDD REFINEMENT: 1-DEF cards cannot have defense restoration (sustain)
      if (def === 1) {
        const idx = abilities.findIndex(a => a.keyword === 'sustain');
        if (idx !== -1) {
          abilities.splice(idx, 1);
        }
      }
    } else {
      // Events have 0 stats as per USER request
      atk = 0;
      def = 0;
    }
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
    artUrl: artUrl.replace('http://', 'https://'),
    previewUrl: track.previewUrl,
    rarity,
    cost,
    stats: { atk, def },
    abilities,
    themeColor,
    videoId: youtubeData?.videoId || track.videoId,
    trackNumber: track.trackNumber,
    lyrics: track.lyrics || `${track.trackName}\n${track.artistName}\n\n[Música sonando...]\nEsta es una de las canciones más icónicas de ${track.artistName}.\nSu letra habla sobre la vida, el amor y la pasión por el sonido.\n\n"You're the music in my head,\nTurning pages of the records we've read.\"\n\n[Solo de Instrumentos]`,
  };
}
