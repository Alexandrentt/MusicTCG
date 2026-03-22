# 🎯 MECÁNICAS EXPANDIDAS - MusicTCG

## 📋 VISIÓN GENERAL

El sistema de habilidades está diseñado para ser **infinitamente expandible**, inspirado en Magic: The Gathering pero adaptado al universo musical. Cada habilidad es una combinación de:

1. **Disparadores (Triggers)** - Cuándo se activa
2. **Efectos (Effects)** - Qué hace  
3. **Condiciones (Conditions)** - Cuándo se puede activar
4. **Sinergias (Synergies)** - Cómo interactúa con otras cartas

---

## 🏗️ ARQUITECTURA DE HABILIDADES

### **Estructura Base**
```typescript
interface CardAbility {
  id: string;                    // Identificador único
  name: string;                  // Nombre visible para jugador
  description: string;           // Descripción del efecto
  trigger: TriggerType;          // Cuándo se activa
  effects: AbilityEffect[];       // Lista de efectos
  cost?: number;                // Costo adicional de energía
}
```

### **Tipos de Efectos Disponibles**

#### 🎯 **COMBAT MODS**
- `HASTE` - Atacar inmediatamente
- `DOUBLE_STRIKE` - Atacar dos veces
- `PIERCE` - Daño traspasa defensas
- `INDESTRUCTIBLE` - No puede ser destruida
- `TAUNT` - Obliga a atacar primero esta carta
- `SHIELD` - Previene próximo daño

#### ⚡ **ENERGY MODS** 
- `ENERGY_RAMP` - +X energía este turno
- `ENERGY_BOOST` - Aumenta energía máxima
- `ENERGY_LOCK` - Bloquea sacrificios

#### 🎴 **DRAW MODS**
- `DUPLICATE` - Roba cartas adicionales
- `TUTOR` - Busca carta específica
- `SCRY_3` - Mira próximas 3 cartas
- `PREVIEW_5` - Ve próximas 5 cartas
- `DISCARD_DRAW` - Descarta para robar

#### 🎭 **BOARD CONTROL**
- `REMOVE_TARGET` - Destruye carta objetivo
- `SWAP_TARGET` - Intercambia posiciones
- `FREEZE_TARGET` - Congela carta objetivo
- `SHUFFLE_BOARD` - Reordena tablero

#### 🎵 **PLAYLIST MODS**
- `DOUBLE_BONUS` - Duplica bono de playlist
- `FORCE_SHUFFLE` - Baraja playlist actual

#### 🌟 **GLOBAL BUFFS**
- `GENRE_BUFF` - Bonus por género musical
- `ALBUM_COMBO` - Combinación de álbum
- `RARITY_BOOST` - Bonus por diversidad de rarezas

#### 🎭 **META ABILITIES**
- `INSTANT_PLAY` - Jugar en cualquier momento
- `TUTOR_NAMED` - Buscar por nombre
- `RECALL_TARGET` - Revivir del cementerio

---

## 🎲 SISTEMA DE GENERACIÓN DE HABILIDADES

### **Lógica Actual en `generator.ts`**
```typescript
// 1. Detección de formato musical
const format = detectFormat(track); // REMIX, LIVE, ACOUSTIC, etc.

// 2. Asignación basada en formato y género
if (format === 'SOUNDTRACK') {
  abilities.push({ keyword: 'Soundtrack', description: '...' });
} else if (isRock && random() > 0.5) {
  abilities.push({ keyword: 'Drop', description: '...' });
} else {
  abilities.push({ keyword: 'Sustain', description: '...' });
}
```

### **Sistema Propuesto de Combinaciones**

#### 🎯 **Generación por Composición**
```typescript
// Cada combinación única de [Formato + Género + Rareza] = Habilidad única
const abilityId = `${format}_${genre}_${rarity}_${index}`;

// Ejemplos:
// ROCK_DROP_MYTHIC_1 - Ataque inmediato para rock mítico
// POP_HEAL_GOLD_2 - Curación para pop dorado  
// ELECTRONIC_TUTOR_PLATINUM_1 - Búsqueda para electrónicos platino
```

#### 🎵 **Generación por Sinergia Musical**
```typescript
// Detectar sinergias entre cartas en juego
if (hasGenreSynergy(hand, 'Rock') && hasAlbumSynergy(hand, 'Thriller')) {
  grantBonusAbility('ROCK_ALBUM_COMBO');
}

// Bonus acumulativos por género
const genreMastery = {
  'Rock': { currentLevel: 3, unlockedAbilities: ['ROCK_TAUNT', 'ROCK_PIERCE'] },
  'Pop': { currentLevel: 2, unlockedAbilities: ['POP_HEAL', 'POP_DRAW'] },
  // ... más géneros
};
```

---

## 🎮 MECÁNICAS ESPECÍFICAS DETALLADAS

### **1. SISTEMA DE COMBO MUSICAL**
```typescript
// Combo: 3+ cartas mismo álbum = efecto especial
interface AlbumCombo {
  requiredCards: number;        // 3+ cartas mismo álbum
  effect: 'ALL_CREATURES_GAIN_HASTE'; // Todas ganan rapidez
  duration: 2;                // 2 turnos
}

// Detección automática
function checkAlbumCombo(hand: Card[], board: Card[]): boolean {
  const albumCards = [...hand, ...board].filter(c => 
    c.album === targetAlbum && c.format === 'ALBUM'
  );
  return albumCards.length >= 3;
}
```

### **2. SISTEMA DE EVOLUCIÓN RÍTMICA**
```typescript
// Cartas pueden "evolucionar" durante la partida
interface RhythmEvolution {
  baseCard: string;           // Carta original
  requiredPlays: number;       // Veces que debe jugarse
  evolvedCard: string;         // Carta evolucionada
  evolutionCondition: 'PLAY_COUNT' | 'DAMAGE_DEALT' | 'TURNS_IN_PLAY';
}

// Ejemplo: "Bohemian Rhapsody" → "Bohemian Symphony" después de 5 turnos
```

### **3. SISTEMA DE IMPROVISACIÓN MUSICAL**
```typescript
// Combinar cartas para crear efectos nuevos
interface Improvisation {
  card1: string;
  card2: string;  
  resultAbility: string;      // Nueva habilidad temporal
  cost: number;               // Energía para improvisar
}

// Ejemplo: Jazz + Blues = "Fusión Soul" (habilidad de curación masiva)
```

### **4. SISTEMA DE SETLIST DINÁMICA**
```typescript
// La playlist cambia el metajuego según cartas en juego
interface SetlistEffect {
  dominantGenre: string;       // Género con más cartas
  globalEffect: string;        // Efecto en todas las cartas
  duration: number;             // Turnos que dura
}

// Ejemplo: Dominancia Rock = Todas las criaturas ganan +1 ataque
```

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### **1. Expansión de `ABILITIES_DB`**
```typescript
// Añadir nuevas habilidades sin límite
const NEW_ABILITIES = {
  // Habilidades de combo
  'COMBO_ROCK_DUO_1': {
    id: 'COMBO_ROCK_DUO_1',
    name: 'Dúo de Rock',
    description: 'Si tienes 2 cartas Rock, gana Trample.',
    trigger: 'PASSIVE',
    condition: { type: 'MIN_CARDS_OF_GENRE', value: 2, genre: 'Rock' },
    effects: [{ type: 'COMBAT_MOD', value: 'TRAMPLE' }]
  },
  
  // Habilidades contextuales
  'CONTEXT_BATTLE_ROYAL_1': {
    id: 'CONTEXT_BATTLE_ROYAL_1',
    name: 'Batalla Real',
    description: 'Solo activa si hay 10+ cartas en juego.',
    trigger: 'ON_PLAY',
    condition: { type: 'BOARD_SIZE', value: 10 },
    effects: [{ type: 'GLOBAL_BUFF', value: 'ALL_CREATURES_PLUS_2_2' }]
  }
};
```

### **2. Sistema de Progresión de Habilidades**
```typescript
// Desbloqueo de habilidades por uso
interface AbilityProgression {
  abilityId: string;
  currentLevel: number;      // 0-5
  experience: number;          // XP ganada con esta habilidad
  masteryBonus: number;         // Bonus por dominar la habilidad
  unlockedEffects: string[];   // Efectos desbloqueados
}

// Ejemplo de progresión
const abilityProgress = {
  'ROCK_TAUNT': {
    currentLevel: 3,
    experience: 450,
    masteryBonus: 1.5,  // +50% efectividad
    unlockedEffects: ['TAUNT_AREA', 'PERMANENT_TAUNT']
  }
};
```

---

## 🎯 ESTRATEGIA DE DISEÑO

### **Principios de Balance**
1. **Costo vs Impacto** - Habilidades más caras = efectos más potentes
2. **Sinergia Musical** - Premiar combinaciones temáticas coherentes  
3. **Contra-juego** - Cada habilidad debe tener respuesta o contramedida
4. **Escalado** - Habilidades más fuertes requieren condiciones más estrictas

### **Métricas de Evaluación**
- **Diversidad** - Mínimo 5 habilidades diferentes por rareza
- **Sinergia** - Mínimo 3 combinaciones sinérgicas posibles
- **Complejidad** - Máximo 3 condiciones por habilidad
- **Originalidad** - Cada habilidad debe tener mecánica única

---

## 🚀 ROADMAP DE EXPANSIÓN

### **Fase 1: Fundamentos (Current)**
- ✅ Sistema básico de habilidades
- ✅ Generación por formato/género  
- ✅ 25+ habilidades base implementadas

### **Fase 2: Combinaciones (Next)**
- 🎯 Sistema de combos musicales
- 🎭 Evolución rítmica de cartas
- 🎵 Setlists dinámicas y contextuales
- 🌟 Meta-habilidades estratégicas

### **Fase 3: Avanzadas (Future)**
- 🏆 Habilidades condicionales complejas
- 🎪 Modos de juego alternativos
- 🎭 Sistema de progresión y maestría
- 🌌 Habilidades legendarias y transformaciones

---

## 💡 RECOMENDACIONES DE IMPLEMENTACIÓN

### **Para Desarrolladores**
1. **Modularidad** - Cada habilidad debe ser independiente
2. **Testing** - Probar cada habilidad en múltiples escenarios
3. **Documentación** - Explicar la sinergia esperada
4. **Balance** - Iterar basado en feedback de jugadores

### **Para Diseñadores de Habilidades**
1. **Claridad** - Nombres y descripciones intuitivas
2. **Temática** - Coherencia con el universo musical
3. **Escala** - Habilidades con múltiples niveles de potencia
4. **Originalidad** - Evitar copias directas de otros juegos

---

**Este documento sirve como guía maestra para la expansión infinita del sistema de habilidades, garantizando miles de combinaciones estratégicas posibles mientras mantenemos el balance y la coherencia temática del universo musical.**
