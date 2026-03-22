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

export function generateCard(
  track: any,
  forcedRarity?: CardRarity,
  youtubeData?: any,
  mythicTrackIds?: Set<string>
): CardData {
  // 1. Identificación del Master (Artist + Song Name) para herencia de rareza
  const compositionId = `${track.artistName} - ${track.trackName.replace(/\(.*\)| - .*/g, '').trim()}`;
  const masterSeed = hashString(compositionId);
  const masterRandom = mulberry32(masterSeed);

  // 2. Determinación de Rareza Heredada (Master Rarity)
  let masterRarity: CardRarity = 'BRONZE';

  // Si el admin marcó esta canción como mítica, siempre es MYTHIC
  const trackIdStr = String(track.trackId || '');
  if (mythicTrackIds?.has(trackIdStr)) {
    masterRarity = 'MYTHIC';
  } else {
    // Lógica original de rareza
    const rarityRoll = masterRandom();
    if (rarityRoll > 0.999) masterRarity = 'MYTHIC';
    else if (rarityRoll > 0.95) masterRarity = 'PLATINUM';
    else if (rarityRoll > 0.8) masterRarity = 'GOLD';
    else if (rarityRoll > 0.5) masterRarity = 'SILVER';
  }

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

  // 9. Generación de Habilidades (SISTEMA EXPANDIDO CON CLASIFICACIÓN)
  const abilities: any[] = [];  
  // Sistema de combinación: [Formato + Género + Rareza] = Habilidad única
  const abilitySeed = `${format}_${genre}_${rarity}`;
  const seedRandom = mulberry32(hashString(abilitySeed));
  
  // Determinar si tendrá habilidades pasivas, activas o ambas
  const hasPassive = seedRandom() > 0.4; // 60% chance de tener pasiva
  const hasActive = seedRandom() > 0.6; // 40% chance de tener activa
  const hasActivated = rarity === 'MYTHIC' || (rarity === 'PLATINUM' && seedRandom() > 0.7);
  
  // 1. Habilidades PASIVAS (siempre activas)
  if (hasPassive) {
    const passiveAbilities: Record<string, any> = {
      // COMBAT DEFENSE
      'ARMOR_PLATING': {
        keyword: 'Armor Plating',
        description: 'Esta carta recibe -1 daño de cualquier fuente.',
        abilityType: 'PASSIVE',
        category: 'COMBAT_DEFENSE',
        isPermanent: true
      },
      'MUSICAL_AURA': {
        keyword: 'Musical Aura',
        description: 'Criaturas aliadas adyacentes ganan +1/+1.',
        abilityType: 'PASSIVE',
        category: 'SYNERGY_GENRE',
        stackable: false
      },
      'RHYTHM_SHIELD': {
        keyword: 'Rhythm Shield',
        description: 'Inmune a habilidades del oponente.',
        abilityType: 'PASSIVE',
        category: 'CONTROL_META'
      },
      
      // RESOURCE GENERATION
      'ENERGY_AMPLIFIER': {
        keyword: 'Energy Amplifier',
        description: 'Ganas +1 energía adicional al inicio de tu turno.',
        abilityType: 'PASSIVE',
        category: 'RESOURCE_ENERGY'
      },
      'CARD_DRAW_ENGINE': {
        keyword: 'Card Draw Engine',
        description: 'Roba una carta adicional al final de tu turno.',
        abilityType: 'PASSIVE',
        category: 'RESOURCE_DRAW',
        stackable: true
      },
      
      // SYNERGY
      'GENRE_MASTER': {
        keyword: 'Genre Master',
        description: `Todas tus cartas de género ${genre} ganan +1/+1.`,
        abilityType: 'PASSIVE',
        category: 'SYNERGY_GENRE',
        isPermanent: true
      },
      'ALBUM_COLLECTOR': {
        keyword: 'Album Collector',
        description: 'Si tienes 3+ cartas de este álbum, todas ganan Trample.',
        abilityType: 'PASSIVE',
        category: 'SYNERGY_ALBUM'
      },
      'PLAYLIST_CURATOR': {
        keyword: 'Playlist Curator',
        description: 'La playlist actual gana +2 de bono si esta carta está en juego.',
        abilityType: 'PASSIVE',
        category: 'SYNERGY_PLAYLIST'
      },
      
      // UTILITY
      'BACKSTAGE_MANAGER': {
        keyword: 'Backstage Manager',
        description: 'Puedes mover cartas del backstage al tablero sin costo.',
        abilityType: 'PASSIVE',
        category: 'UTILITY_MANIPULATION'
      },
      'INFORMATION_NETWORK': {
        keyword: 'Information Network',
        description: 'Mira la carta superior de tu mazo en todo momento.',
        abilityType: 'PASSIVE',
        category: 'UTILITY_INFORMATION'
      }
    };
    
    // Seleccionar 1-2 habilidades pasivas según rareza
    const passiveCount = rarity === 'MYTHIC' ? 2 : (rarity === 'PLATINUM' ? 1 : 1);
    const passiveKeys = Object.keys(passiveAbilities);
    for (let i = 0; i < passiveCount; i++) {
      const randomKey = passiveKeys[Math.floor(seedRandom() * passiveKeys.length)];
      abilities.push({
        ...passiveAbilities[randomKey],
        trigger: 'PASSIVE'
      });
    }
  }
  
  // 2. Habilidades ACTIVAS (se activan por eventos)
  if (hasActive) {
    const activeAbilities: Record<string, any> = {
      // COMBAT OFFENSE
      'FIRST_STRIKE': {
        keyword: 'First Strike',
        description: 'Ataca antes que las criaturas sin esta habilidad.',
        abilityType: 'TRIGGERED',
        category: 'COMBAT_OFFENSE',
        trigger: 'ON_PLAY'
      },
      'DOUBLE_ATTACK': {
        keyword: 'Double Attack',
        description: 'Puede atacar dos veces por turno.',
        abilityType: 'TRIGGERED',
        category: 'COMBAT_OFFENSE',
        trigger: 'ON_PLAY'
      },
      'PIERCING_MELODY': {
        keyword: 'Piercing Melody',
        description: 'El daño excedente va directamente al oponente.',
        abilityType: 'TRIGGERED',
        category: 'COMBAT_OFFENSE',
        trigger: 'ON_PLAY'
      },
      
      // COMBAT DEFENSE
      'PROTECTIVE_HARMONY': {
        keyword: 'Protective Harmony',
        description: 'Cuando esta carta es atacada, previene hasta 3 daño.',
        abilityType: 'TRIGGERED',
        category: 'COMBAT_DEFENSE',
        trigger: 'ON_ATTACKED'
      },
      'COUNTER_MELODY': {
        keyword: 'Counter Melody',
        description: 'Puedes pagar 2 energía para cancelar una habilidad del oponente.',
        abilityType: 'TRIGGERED',
        category: 'CONTROL_TARGET',
        trigger: 'ON_REACTION',
        activationCost: 2
      },
      
      // RESOURCE
      'INSTANT_TUTOR': {
        keyword: 'Instant Tutor',
        description: 'Busca en tu mazo una carta y ponla en tu mano.',
        abilityType: 'TRIGGERED',
        category: 'UTILITY_SEARCH',
        trigger: 'ON_PLAY'
      },
      'ENERGY_SURGE': {
        keyword: 'Energy Surge',
        description: 'Ganas +3 energía este turno.',
        abilityType: 'TRIGGERED',
        category: 'RESOURCE_ENERGY',
        trigger: 'ON_PLAY'
      },
      'HAND_REFILL': {
        keyword: 'Hand Refill',
        description: 'Roba cartas hasta tener 7 en mano.',
        abilityType: 'TRIGGERED',
        category: 'RESOURCE_DRAW',
        trigger: 'ON_SACRIFICE'
      },
      
      // CONTROL
      'SILENCE_SPELL': {
        keyword: 'Silence Spell',
        description: 'Silencia todas las criaturas del oponente hasta tu próximo turno.',
        abilityType: 'TRIGGERED',
        category: 'CONTROL_TARGET',
        target: 'ALL_ENEMY_CARDS',
        trigger: 'ON_PLAY'
      },
      'BOARD_WIPE': {
        keyword: 'Board Wipe',
        description: 'Destruye todas las criaturas con costo 3 o menos.',
        abilityType: 'TRIGGERED',
        category: 'CONTROL_BOARD',
        trigger: 'ON_PLAY'
      },
      'CONTROL_SWAP': {
        keyword: 'Control Swap',
        description: 'Intercambia el control de esta carta con una criatura objetivo.',
        abilityType: 'TRIGGERED',
        category: 'CONTROL_TARGET',
        trigger: 'ON_PLAY'
      },
      
      // SYNERGY
      'GENRE_EXPLOSION': {
        keyword: 'Genre Explosion',
        description: `Si juegas 3 cartas de género ${genre}, gana un turno extra.`,
        abilityType: 'TRIGGERED',
        category: 'SYNERGY_GENRE',
        trigger: 'ON_PLAY',
        condition: 'IF_MORE_GENRE_CARDS'
      },
      'ALBUM_SYMPHONY': {
        keyword: 'Album Symphony',
        description: 'Si tienes el álbum completo en juego, todas tus cartas ganan +2/+2.',
        abilityType: 'TRIGGERED',
        category: 'SYNERGY_ALBUM',
        trigger: 'PASSIVE',
        condition: 'IF_COMPLETE_ALBUM'
      }
    };
    
    // Seleccionar 1 habilidad activa según rareza
    const activeCount = rarity === 'MYTHIC' ? 2 : 1;
    const activeKeys = Object.keys(activeAbilities);
    for (let i = 0; i < activeCount; i++) {
      const randomKey = activeKeys[Math.floor(seedRandom() * activeKeys.length)];
      abilities.push({
        ...activeAbilities[randomKey]
      });
    }
  }
  
  // 3. Habilidades ACTIVADAS (costo adicional de energía)
  if (hasActivated) {
    const activatedAbilities: Record<string, any> = {
      // COMBAT
      'BERSERKER_MODE': {
        keyword: 'Berserker Mode',
        description: 'Paga 3 energía: Esta carta gana +5/+5 y Trample este turno.',
        abilityType: 'ACTIVATED',
        category: 'COMBAT_OFFENSE',
        activationCost: 3,
        isPermanent: false
      },
      'IMMORTALITY_CLOAK': {
        keyword: 'Immortality Cloak',
        description: 'Paga 4 energía: Esta carta no puede ser destruida este turno.',
        abilityType: 'ACTIVATED',
        category: 'COMBAT_DEFENSE',
        activationCost: 4,
        isPermanent: false
      },
      
      // RESOURCE
      'MASSIVE_DRAW': {
        keyword: 'Massive Draw',
        description: 'Paga 2 energía: Roba 3 cartas.',
        abilityType: 'ACTIVATED',
        category: 'RESOURCE_DRAW',
        activationCost: 2
      },
      'ENERGY_BOOST': {
        keyword: 'Energy Boost',
        description: 'Paga 1 energía: Gana +3 energía.',
        abilityType: 'ACTIVATED',
        category: 'RESOURCE_ENERGY',
        activationCost: 1
      },
      
      // CONTROL
      'MASSIVE_REMOVAL': {
        keyword: 'Massive Removal',
        description: 'Paga 5 energía: Destruye hasta 3 criaturas objetivo.',
        abilityType: 'ACTIVATED',
        category: 'CONTROL_BOARD',
        activationCost: 5
      },
      'MIND_CONTROL': {
        keyword: 'Mind Control',
        description: 'Paga 6 energía: Toma el control de una criatura enemiga.',
        abilityType: 'ACTIVATED',
        category: 'CONTROL_TARGET',
        activationCost: 6
      },
      
      // SPECIAL
      'TIME_STOP': {
        keyword: 'Time Stop',
        description: 'Paga 8 energía: El oponente salta su próximo turno.',
        abilityType: 'ACTIVATED',
        category: 'SPECIAL_LEGENDARY',
        activationCost: 8
      },
      'REALITY_REWRITE': {
        keyword: 'Reality Rewrite',
        description: 'Paga 10 energía: Transforma todas las cartas del tablero en copias de esta.',
        abilityType: 'ACTIVATED',
        category: 'SPECIAL_LEGENDARY',
        activationCost: 10
      }
    };
    
    // Seleccionar 1 habilidad activada (solo para Mythic/Platinum)
    const activatedKey = Object.keys(activatedAbilities)[Math.floor(seedRandom() * Object.keys(activatedAbilities).length)];
    abilities.push({
      ...activatedAbilities[activatedKey]
    });
  }
  
  // 4. Habilidades por Formato Musical (mantener compatibilidad)
  if (format === 'SOUNDTRACK') {
    abilities.push({ 
      keyword: 'Soundtrack', 
      description: 'Atmosférico: Las Criaturas del mismo género reciben +1/+1 mientras esté en juego.',
      abilityType: 'PASSIVE',
      category: 'SYNERGY_PLAYLIST'
    });
    // Bonus adicional para soundtracks
    if (seedRandom() > 0.7) {
      abilities.push({ 
        keyword: 'Cinematic', 
        description: 'Al entrar, todas las cartas en juego ganan +1/+1 hasta tu próximo turno.',
        abilityType: 'TRIGGERED',
        category: 'SYNERGY_ALBUM',
        trigger: 'ON_PLAY'
      });
    }
  } else if (format === 'REMIX') {
    abilities.push({ 
      keyword: 'Remix', 
      description: 'Puedes copiar una habilidad de otra carta en juego.',
      abilityType: 'TRIGGERED',
      category: 'UTILITY_MANIPULATION',
      trigger: 'ON_PLAY'
    });
    if (rarity === 'MYTHIC' || rarity === 'PLATINUM') {
      abilities.push({ 
        keyword: 'Mashup', 
        description: 'Combina las habilidades de 2 cartas diferentes.',
        abilityType: 'ACTIVATED',
        category: 'SPECIAL_TRANSFORM',
        activationCost: 2
      });
    }
  } else if (format === 'LIVE') {
    abilities.push({ 
      keyword: 'Live Performance', 
      description: 'Gana +1/+1 por cada carta que controles.',
      abilityType: 'PASSIVE',
      category: 'SYNERGY_GENRE',
      stackable: true
    });
    if (seedRandom() > 0.6) {
      abilities.push({ 
        keyword: 'Encore', 
        description: 'Si esta carta es destruida, regresa a tu mano.',
        abilityType: 'TRIGGERED',
        category: 'UTILITY_MANIPULATION',
        trigger: 'ON_DESTROYED'
      });
    }
  } else if (format === 'ACOUSTIC') {
    abilities.push({ 
      keyword: 'Acoustic', 
      description: 'No puede ser objetivo de habilidades del oponente.',
      abilityType: 'PASSIVE',
      category: 'CONTROL_META'
    });
  } else if (format === 'FEATURE') {
    abilities.push({ 
      keyword: 'Featuring', 
      description: 'Cuando entre, busca una carta del artista invitado.',
      abilityType: 'TRIGGERED',
      category: 'UTILITY_SEARCH',
      trigger: 'ON_PLAY'
    });
  } else if (format === 'EP') {
    abilities.push({ 
      keyword: 'Extended Play', 
      description: 'Puedes jugar cartas adicionales este turno.',
      abilityType: 'TRIGGERED',
      category: 'RESOURCE_ENERGY',
      trigger: 'ON_PLAY'
    });
  } else if (format === 'COMPILATION') {
    abilities.push({ 
      keyword: 'Greatest Hits', 
      description: 'Copia una habilidad de cada carta del mismo álbum en juego.',
      abilityType: 'PASSIVE',
      category: 'SYNERGY_ALBUM',
      stackable: true
    });
  } else {
    // Cartas ALBUM/SINGLE (default)
    if (isRock && seedRandom() > 0.3) {
      abilities.push({ 
        keyword: 'Drop', 
        description: 'Ataca inmediatamente al entrar al escenario.',
        abilityType: 'TRIGGERED',
        category: 'COMBAT_MOBILITY',
        trigger: 'ON_PLAY'
      });
    } else if (isPop && seedRandom() > 0.4) {
      abilities.push({ 
        keyword: 'Sync', 
        description: 'Al jugar esta carta, tu reputación aumenta en 3 si coincide con el género actual.',
        abilityType: 'TRIGGERED',
        category: 'SYNERGY_PLAYLIST',
        trigger: 'ON_PLAY'
      });
    } else if (genre.includes('Electronic') || genre.includes('Dance')) {
      abilities.push({ 
        keyword: 'Beat Drop', 
        description: 'Cuando ataca, todas las criaturas del oponente pierden -1/-1.',
        abilityType: 'TRIGGERED',
        category: 'COMBAT_OFFENSE',
        trigger: 'ON_ATTACK'
      });
    } else if (genre.includes('Hip-Hop') || genre.includes('Rap')) {
      abilities.push({ 
        keyword: 'Freestyle', 
        description: 'Puedes reorganizar las 3 cartas superiores de tu mazo.',
        abilityType: 'ACTIVATED',
        category: 'UTILITY_MANIPULATION',
        activationCost: 1
      });
    } else if (genre.includes('Jazz') || genre.includes('Blues')) {
      abilities.push({ 
        keyword: 'Improvisation', 
        description: 'Gana una habilidad aleatoria al entrar en juego.',
        abilityType: 'TRIGGERED',
        category: 'SPECIAL_CONDITIONAL',
        trigger: 'ON_PLAY'
      });
    } else {
      abilities.push({ 
        keyword: 'Sustain', 
        description: 'Recupera 1 de DEF al inicio de tu turno.',
        abilityType: 'PASSIVE',
        category: 'COMBAT_DEFENSE'
      });
    }
  }

  // 10. GENERACIÓN DE HABILIDADES PROCEDURALES (Fase 2)
  // SOLO para rarezas BRONZE → PLATINUM (MYTHIC es diseño manual)
  if (rarity !== 'MYTHIC') {
    try {
      // Importar motor procedural
      const { proceduralAbilityEngine, convertToGeneratedAbility } = require('./proceduralAbilityEngine');
      
      // Generar habilidades procedurales
      const seed = `${compositionId}_${rarity}_${cost}`;
      const proceduralResult = proceduralAbilityEngine.generate(
        variantId,
        rarity,
        cost,
        seed
      );
      
      // Convertir y agregar habilidades procedurales
      if (proceduralResult.abilities.length > 0) {
        const proceduralAbilities = proceduralResult.abilities.map((ability: any) => 
          convertToGeneratedAbility(ability, variantId)
        );
        
        // Combinar con habilidades existentes (priorizar procedurales)
        abilities.splice(0, abilities.length, ...proceduralAbilities);
        
        console.log(`🎯 Procedural abilities generated for ${track.trackName}:`, {
          count: proceduralResult.abilities.length,
          riskLevel: proceduralResult.riskLevel,
          generationTime: proceduralResult.generationTime,
          cacheHit: proceduralResult.cacheHit
        });
      }
    } catch (error) {
      console.warn('⚠️ Procedural generation failed, using fallback:', error);
      // Continuar con habilidades clásicas (fallback automático)
    }
  }

  // 11. Limitar número máximo de habilidades por rareza
  const maxAbilities = {
    'MYTHIC': 4,
    'PLATINUM': 3,
    'GOLD': 2,
    'SILVER': 2,
    'BRONZE': 1
  };
  
  const maxAllowed = maxAbilities[rarity] || 1;
  if (abilities.length > maxAllowed) {
    abilities.splice(maxAllowed);
  }

  // 12. Metadata Final
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
