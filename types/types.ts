/**
 * TIPOS UNIFICADOS DE MUSICTCG
 * 
 * Este archivo centraliza todos los tipos e interfaces del juego
 * para mantener consistencia y evitar duplicación
 */

// ============================================
// TIPOS DE CARTAS
// ============================================

export type CardRarity = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type CardType = 'CREATURE' | 'EVENT' | 'ARTIFACT';
export enum CardState {
  UNTAPPED = 'UNTAPPED',
  TAPPED = 'TAPPED',
}
// Alias for consistency with spec
export type Card = MasterCardTemplate;

export interface MasterCardTemplate {
  // IDENTIFICACIÓN ÚNICA
  id: string;                    // "card_queen_bohemian"

  // METADATOS MUSICALES
  name: string;
  artist: string;
  album?: string;
  genre: string;
  trackNumber?: number; // ← NUEVA: Para compatibilidad con CardComponents.tsx

  // STATS BASE
  atk: number;
  def: number;
  cost: number;

  // TIPO DE CARTA
  type: 'CREATURE' | 'EVENT';

  // HABILIDADES
  abilities: GeneratedAbility[]; // Array de habilidades

  // STATS EXTENDIDAS (ORIGINALES)
  rarity: CardRarity;
  artworkUrl: string;
  themeColor?: string;
  keywords: Keyword[];

  // HERENCIA (FASE 2)
  heritage?: {
    compositionId: string;
    heritageRole: 'MASTER' | 'TRIBUTE';
  };
}

// ============================================
// TIPOS DE HABILIDADES
// ============================================

export enum Trigger {
  INTRO = 'intro',
  OUTRO = 'outro',
  ATTACK = 'attack',
  SOLO = 'solo',
  AURA = 'aura',
  SACRIFICE = 'sacrifice', // NUEVO: Cuando tú sacrificas una carta
}

export enum Effect {
  DAMAGE = 'damage',
  HEAL = 'heal',
  BUFF = 'buff',
  DEBUFF = 'debuff',
  HYPE = 'hype',
  DRAW = 'draw',
  MILL = 'mill',
  SILENCE = 'silence',
  ENCORE = 'encore',
  SOUNDCHECK = 'soundcheck',
  FEATURING = 'featuring',
  CANCELLED = 'cancelled',
  DISCO_ORO = 'disco_oro',
  BOICOT = 'boicot',
  HEAL_REPUTATION = 'heal_reputation',
  NERF = 'nerf',
  MANA_DISRUPTION = 'mana_disruption',
  MIND_CONTROL = 'mind_control',

  // NUEVOS: MECÁNICAS CORE
  TRAMPLE = 'trample',
  STEALTH = 'stealth',
  HASTE = 'haste',
  ALL_CARDS = 'all_cards',

  // NUEVOS: ENERGÍA Y SACRIFICIO
  ENERGY_RAMP = 'energy_ramp',           // +1 energía máxima
  ENERGY_DENIAL = 'energy_denial',       // -1 energía rival
  ENERGY_BURST = 'energy_burst',         // +X energía temporal
  ENERGY_RECOVERY = 'energy_recovery',   // Recuperar de zona de energía
  ENERGY_LOCK = 'energy_lock',           // Bloquear sacrificios
  ENERGY_STEAL = 'energy_steal',         // Robar energía
  FORCE_SACRIFICE = 'force_sacrifice',   // Obligar a sacrificar
  SACRIFICE_PAYOFF = 'sacrifice_payoff', // Efecto por sacrificios
  ENERGY_PROTECTION = 'energy_protection', // Protección de zona energía
}

export enum Target {
  ENEMY_REPUTATION = 'enemy_reputation',
  RANDOM_ENEMY = 'random_enemy',
  SAME_ALBUM_CARDS = 'same_album_cards',
  TAPPED_CARDS = 'tapped_cards',
  SELF = 'self',
  ALL_CARDS = 'all_cards',
  ALL_ENEMY_CARDS = 'all_enemy_cards',
  ALL_OWN_CARDS = 'all_own_cards',
  CONDITIONAL_CARDS = 'conditional_cards',
  ENEMY_BACKSTAGE = 'enemy_backstage',

  // NUEVOS: TARGETS DE ENERGÍA
  RIVAL_ENERGY_ZONE_RANDOM = 'rival_energy_zone_random',
  RIVAL_ENERGY_ZONE_ALL = 'rival_energy_zone_all',
  YOUR_ENERGY_ZONE_ALL = 'your_energy_zone_all',
}

export enum Keyword {
  PROVOKE = 'provoke',
  HASTE = 'haste',
  FLYING = 'flying',
  TRAMPLE = 'trample',
  SUSTAIN = 'sustain',
  STEALTH = 'stealth',
}

export enum Condition {
  UNDERDOG = 'underdog',
  MAINSTREAM = 'mainstream',
  SOLO = 'solo',
  EMPTY_HAND = 'empty_hand',

  // NUEVOS: CONDICIONES DE ENERGÍA
  IF_MORE_ENERGY = 'if_more_energy',
  IF_LESS_ENERGY = 'if_less_energy',
  IF_SACRIFICED_THIS_TURN = 'if_sacrificed_this_turn',
}

export interface GeneratedAbility {
  id: string;
  trigger: Trigger;
  effect: Effect;
  target: Target;
  value: number;
  condition?: Condition;
  modifier?: string;
  text: string;
  mechanicTags: string[];
  cost?: number;
  statPenalty: number;
}

// ============================================
// TIPOS DE APIS EXTERNAS
// ============================================

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
// TIPOS DE JUEGO
// ============================================

export enum TurnPhase {
  OPENING = 'opening',
  MAIN = 'main',
  CLOSING = 'closing',
}

export enum CombatType {
  CLASH = 'clash',
  AMBUSH = 'ambush',
  DIRECT = 'direct',
}

export enum GameEndCondition {
  KNOCKOUT = 'knockout',
  HYPE_WIN = 'hype_win',
  FORGOTTEN = 'forgotten',
  DRAW = 'draw',
}

export interface PlayedCard extends Card {
  // INSTANCIA ÚNICA en el juego
  instanceId: string;            // Único por cada vez que se juega

  // STATS ACTUALES
  currentAtk: number;
  currentDef: number;

  // ESTADO DE COMBATE
  isTapped: boolean;             // ¿Atacó?
  isTapped90: boolean;           // Pánico Escénico
  damageThisTurn: number;

  // UBICACIÓN
  laneId?: string;               // ID de la lane en combate
  inBackstage?: boolean;

  // ESTADO VISUAL
  isSelected?: boolean;
  visualEffect?: string;

  // MEJORAS (LEGACY/RESONANCIA)
  temporaryBoosts?: {
    atkBonus: number;
    defBonus: number;
    untilEndOfTurn: boolean;
  };
  permanentDiscos?: number;
  isSilenced?: boolean;
}

export interface PlayerState {
  playerId: string;
  userId?: string;
  reputation: number;
  hype: number;
  energy: {
    basePerTurn: number;         // 1, 2, 3... crece cada turno
    sacrificesThisTurn: number;  // 0 o 1
    permanentFromSacrifices: number; // Historial de +1s
    current: number;             // Disponible real
    max: number;                 // UI
  };
  zones: PlayerZones;
}

export interface PlayerZones {
  deck: Card[];
  hand: Card[];
  board: PlayedCard[];
  backstage: PlayedCard[];

  // NUEVO: Zona de Energía
  energyZone: {
    cards: Card[];
    currentCount: number;
  };

  deckCount: number;
  handCount: number;
}

export interface GameState {
  matchId: string;
  turn: number;
  phase: TurnPhase;
  activePlayer: 'player_A' | 'player_B';
  players: {
    player_A: PlayerState;
    player_B: PlayerState;
  };
  isGameOver: boolean;
  winner?: string;
  endCondition?: GameEndCondition;
  pendingReaction?: ReactionState;
  history: GameAction[];
  _phaseState?: any;  // ← ESTA LÍNEA DEBE ESTAR
  board: BoardState;
}

export interface Lane {
  laneId: string;
  yourCard?: PlayedCard;
  rivalCard?: PlayedCard;
}

export interface BoardState {
  lanes: Lane[];
}

export interface ReactionState {
  attackerId: string;
  targetId: string;
  combatType: CombatType;
  declaredDamage: number;
  defenderId: string;
  remainingTime: number;
}

export interface GameAction {
  turn: number;
  actor: string;
  action: string;
  details: any;
  timestamp: number;
}

// ============================================
// TIPOS DE ECONOMÍA
// ============================================

export interface PlayerInventory {
  userId: string;
  regalias: number;
  wildcards: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  inventory: {
    [cardId: string]: number;
  };
  pityTimer: {
    silverGold: number;
    platinum: number;
  };
  vault: {
    progress: number;
    lastGrantedAt: Date;
  };
}

export interface BoosterPackResult {
  cards: string[];
  wildcardGranted?: CardRarity;
}

// ============================================
// TIPOS DE RESPUESTAS DE API
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface SearchMusicResponse {
  cards: MasterCardTemplate[];
  total: number;
  query: string;
}

export interface MatchHistoryResponse {
  matchId: string;
  player_A: {
    playerId: string;
    name: string;
    finalReputation: number;
    finalHype: number;
  };
  player_B: {
    playerId: string;
    name: string;
    finalReputation: number;
    finalHype: number;
  };
  winner: string;
  endCondition: GameEndCondition;
  duration: number;
  createdAt: Date;
}

// ============================================
// CONSTANTES DEL JUEGO
// ============================================

export const GAME_CONSTANTS = {
  // Vida
  STARTING_REPUTATION: 30,

  // Hype
  HYPE_WIN_THRESHOLD: 20,

  // Energía
  STARTING_ENERGY_MAX: 1,

  // Cartas
  PLAYSET_LIMIT: 4,
  MIN_DECK_SIZE: 60,
  MAX_DECK_SIZE: 200,
  STARTING_HAND_SIZE: 5,

  // Economía
  BOOSTER_PRICE: 300,
  REGALIAS_WIN: 100,
  REGALIAS_LOSS: 25,
  PITY_TIMER_SILVER_GOLD: 6,
  PITY_TIMER_PLATINUM: 24,

  // Rareza
  RARITY_COLORS: {
    BRONZE: '#808080',
    SILVER: '#cd7f32',
    GOLD: '#c0c0c0',
    PLATINUM: '#ffd700',
  },

  // Tags de búsqueda
  ABILITY_TAGS: [
    'damage',
    'removal',
    'heal',
    'sustain',
    'buff',
    'boost',
    'debuff',
    'nerf',
    'hype',
    'win_condition',
    'draw',
    'card_advantage',
    'mill',
    'discard',
    'silence',
    'control',
    'scry',
    'combo',
    'synergy',
    'exile',
    'permanent_removal',
    'counters',
    'permanent_buff',
    'hype_steal',
    'disrupt',
    'survival',
    'stat_reduction',
    'tempo',
    'resource_denial',
    'high_value',
  ],

  // Géneros
  MUSIC_GENRES: [
    'Rock',
    'Metal',
    'Punk',
    'Pop',
    'R&B',
    'Soul',
    'K-Pop',
    'Hip-Hop',
    'Rap',
    'Trap',
    'Electronic',
    'Dance',
    'House',
    'Classical',
    'Jazz',
    'Blues',
    'Country',
    'Folk',
    'Indie',
    'Latino',
    'Reggaeton',
    'Salsa',
  ],
} as const;

// ============================================
// TIPOS PARA COMPONENTES REACT
// ============================================

export interface CardComponentProps {
  card: MasterCardTemplate;
  size?: 'small' | 'medium' | 'large';
  onFlip?: (isFlipped: boolean) => void;
  defaultFlipped?: boolean;
  showDetails?: boolean;
  onClick?: () => void;
  selected?: boolean;
}

export interface GameBoardProps {
  gameState: GameState;
  onAttack: (attackerId: string, targetId: string) => void;
  onEndTurn: () => void;
  onPlayCard: (cardId: string, targetId?: string) => void;
}

export interface BoosterStoreProps {
  inventory: PlayerInventory;
  onBoosterOpen: (cards: MasterCardTemplate[]) => void;
  canAfford: boolean;
}

// ============================================
// TIPOS PARA HOOKS DE REACT
// ============================================

export interface UseGameStateReturn {
  gameState: GameState;
  startMatch: (p1: string, p2: string, d1: MasterCardTemplate[], d2: MasterCardTemplate[]) => void;
  playCard: (cardId: string, targetId?: string) => void;
  attack: (attackerId: string, targetId: string) => void;
  endTurn: () => void;
  processReaction: (reaction: 'intercept' | 'event' | 'pass') => void;
}

export interface UseInventoryReturn {
  inventory: PlayerInventory;
  openBooster: () => void;
  craftCard: (cardId: string, rarity: CardRarity) => void;
  purchaseBooster: () => void;
  grantReward: (amount: number) => void;
}

// ============================================
// ENUMS PARA STRINGS SEGUROS
// ============================================

export const GENRE_ARCHETYPES = {
  ROCK: {
    name: 'Rock',
    archetype: 'Aggro',
    colors: '#FF6B6B',
    primaryEffect: Effect.DAMAGE,
  },
  POP: {
    name: 'Pop',
    archetype: 'Control',
    colors: '#FFB3BA',
    primaryEffect: Effect.HYPE,
  },
  HIPHOP: {
    name: 'Hip-Hop',
    archetype: 'Tempo',
    colors: '#FFD700',
    primaryEffect: Effect.DEBUFF,
  },
  ELECTRONIC: {
    name: 'Electronic',
    archetype: 'Combo',
    colors: '#45B7D1',
    primaryEffect: Effect.DRAW,
  },
  JAZZ: {
    name: 'Jazz',
    archetype: 'Control',
    colors: '#95E1D3',
    primaryEffect: Effect.SOUNDCHECK,
  },
} as const;

// ============================================
// TIPOS PARA VALIDACIÓN
// ============================================

export type ValidCardType = 'CREATURE' | 'EVENT' | 'ARTIFACT';
export type ValidCardRarity = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type ValidCardState = 'UNTAPPED' | 'TAPPED';
export type ValidTurnPhase = 'opening' | 'main' | 'closing';
export type ValidGameEndCondition = 'knockout' | 'hype_win' | 'forgotten' | 'draw';

// ============================================
// RE-EXPORTAR TODO
// ============================================

// ============================================
// RE-EXPORTAR TODO DESDE LIB
// ============================================

export * from '@/lib/abilityEngine';
export * from '@/lib/cardGenerator';
export * from '@/lib/combatSystem';
export * from '@/lib/economySystem';
export * from '@/lib/gameStateEngine';
export * from '@/lib/turnPhaseManager';

export { DetailedPhase, ValidAction } from '@/lib/gameStateEngine';
export type { PhaseState, ActionValidation } from '@/lib/gameStateEngine';
export type { PhaseExecutionResult } from '@/lib/turnPhaseManager';