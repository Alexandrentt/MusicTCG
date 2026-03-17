export enum TurnPhase {
    START = 'START',       // Resolve "At the beginning of your turn" effects, recharge Energy
    DRAW = 'DRAW',         // Player draws 1 card
    MAIN = 'MAIN',         // Play cards by paying energy cost
    COMBAT = 'COMBAT',     // Select attackers and targets, calculate damage
    REPLICA = 'REPLICA',   // Opponent can intercept or react (Mana Float)
    END = 'END'            // Clean up destroyed cards, resolve "At the end of turn" effects, switch turn
}

export interface GameState {
    turnPhase: TurnPhase;
    turnNumber: number;
    activePlayer: 'PLAYER' | 'BOT';

    player: PlayerState;
    bot: PlayerState;

    effectStack: EffectContext[];
    isGameOver: boolean;
    winner: 'PLAYER' | 'BOT' | null;
}

export interface PlayerState {
    id: string;
    name: string;
    energy: number;
    maxEnergy: number;
    health: number;          // Reputation
    maxHealth: number;

    deck: string[];          // Card IDs
    hand: string[];          // Card IDs
    board: BoardEntity[];    // Current active cards
    graveyard: string[];     // Destroyed Card IDs
}

export interface BoardEntity {
    instanceId: string;      // Unique ID for this instance on the board
    cardId: string;
    atk: number;
    def: number;
    maxDef: number;
    isSilenced: boolean;
    canAttack: boolean;
    hasAttacked: boolean;
    statuses: StatusEffect[];
}

export type StatusEffect = 'STEALTH' | 'TAUNT' | 'VIP' | 'SHIELD';

// Represents an action waiting to be resolved in the Engine
export interface EffectContext {
    id: string;
    sourceInstanceId: string;     // The card that triggered the effect
    targetInstanceId?: string;    // The card/player targeted
    effectType: EffectType;
    payload?: any;
}

export enum EffectType {
    DEAL_DAMAGE = 'DEAL_DAMAGE',
    HEAL = 'HEAL',
    DRAW_CARD = 'DRAW_CARD',
    BUFF_ATK = 'BUFF_ATK',
    BUFF_DEF = 'BUFF_DEF',
    SILENCE = 'SILENCE',
    ADD_STATUS = 'ADD_STATUS',
    REMOVE_STATUS = 'REMOVE_STATUS',
}

// Actions the UI or Bot can dispatch to the engine
export type GameAction =
    | { type: 'END_PHASE' }
    | { type: 'PLAY_CARD'; cardId: string; targetInstanceId?: string }
    | { type: 'ATTACK'; attackerInstanceId: string; targetInstanceId?: string }
    | { type: 'RESOLVE_STACK' };
