import { GameState, EffectContext, EffectType, TurnPhase, BoardEntity, StatusEffect } from './gameState';

export const triggerMap: Record<string, TriggerType> = {
    distortion: 'ON_PLAY',     // Deals damage when played
    hypeEngine: 'ON_PLAY',     // Heals owner when played
    dissTrack: 'ON_DEATH',     // Lowers opponent's stats when dies
    frenzy: 'ON_ATTACK',       // Gets stronger every time it attacks
    sustain: 'PASSIVE_AURA',   // Increases max health while alive
    stealth: 'PASSIVE',        // Cannot be targeted until attacks
    vip: 'PASSIVE',            // Takes reduced damage or gains shield 
    taunt: 'PASSIVE',          // Must be targeted
    soundtrack: 'ON_DRAW'      // Effect when drawn
};

export type TriggerType = 'ON_PLAY' | 'ON_DEATH' | 'PASSIVE_AURA' | 'PASSIVE' | 'ON_ATTACK' | 'ON_DRAW' | 'ON_PHASE_START';

// Structure of an effect template related to a Keyword
export interface KeywordEffect {
    keyword: string;
    trigger: TriggerType;
    resolve: (state: GameState, sourceId: string, targetId?: string) => void;
}

export const EngineAbilities: KeywordEffect[] = [
    {
        keyword: 'distortion',
        trigger: 'ON_PLAY',
        resolve: (state, sourceId, targetId) => {
            // Deal direct damage to opponent's reputation
            pushEffectToStack(state, {
                id: crypto.randomUUID(),
                sourceInstanceId: sourceId,
                effectType: EffectType.DEAL_DAMAGE,
                payload: { amount: 2, target: 'OPPONENT' }
            });
        }
    },
    {
        keyword: 'hypeEngine',
        trigger: 'ON_PLAY',
        resolve: (state, sourceId, targetId) => {
            // Heal owner's reputation
            pushEffectToStack(state, {
                id: crypto.randomUUID(),
                sourceInstanceId: sourceId,
                effectType: EffectType.HEAL,
                payload: { amount: 3, target: 'OWNER' }
            });
        }
    },
    {
        keyword: 'dissTrack',
        trigger: 'ON_DEATH',
        resolve: (state, sourceId, targetId) => {
            // Silence a random enemy card when this dies
            pushEffectToStack(state, {
                id: crypto.randomUUID(),
                sourceInstanceId: sourceId,
                effectType: EffectType.SILENCE,
                payload: { target: 'RANDOM_OPPONENT_CARD' }
            });
        }
    },
    {
        keyword: 'frenzy',
        trigger: 'ON_ATTACK',
        resolve: (state, sourceId) => {
            // Gain +1 ATK when attacking
            pushEffectToStack(state, {
                id: crypto.randomUUID(),
                sourceInstanceId: sourceId,
                effectType: EffectType.BUFF_ATK,
                payload: { amount: 1, target: sourceId }
            });
        }
    },
    {
        keyword: 'sustain',
        trigger: 'ON_PLAY',
        resolve: (state, sourceId) => {
            // Heal board cards +1 DEF
            pushEffectToStack(state, {
                id: crypto.randomUUID(),
                sourceInstanceId: sourceId,
                effectType: EffectType.BUFF_DEF,
                payload: { amount: 1, target: 'ALL_FRIENDLIES' }
            });
        }
    },
    {
        keyword: 'stealth',
        trigger: 'ON_PLAY',
        resolve: (state, sourceId) => {
            // Adds stealth status logic
            pushEffectToStack(state, {
                id: crypto.randomUUID(),
                sourceInstanceId: sourceId,
                effectType: EffectType.ADD_STATUS,
                payload: { status: 'STEALTH', target: sourceId }
            });
        }
    },
    {
        keyword: 'vip',
        trigger: 'ON_PLAY',
        resolve: (state, sourceId) => {
            pushEffectToStack(state, {
                id: crypto.randomUUID(),
                sourceInstanceId: sourceId,
                effectType: EffectType.ADD_STATUS,
                payload: { status: 'VIP', target: sourceId }
            });
        }
    },
    {
        keyword: 'taunt',
        trigger: 'ON_PLAY',
        resolve: (state, sourceId) => {
            pushEffectToStack(state, {
                id: crypto.randomUUID(),
                sourceInstanceId: sourceId,
                effectType: EffectType.ADD_STATUS,
                payload: { status: 'TAUNT', target: sourceId }
            });
        }
    }
];

export function pushEffectToStack(state: GameState, effect: EffectContext) {
    state.effectStack.push(effect);
}

export function resolveStack(state: GameState, simulate: boolean = false) {
    // LIFO (Last In First Out) Stack Resolution mechanism (like MtG)
    while (state.effectStack.length > 0) {
        const effect = state.effectStack.pop();
        if (effect) {
            if (!simulate) console.log(`Resolving Effect: ${effect.effectType} on Target: ${effect.payload?.target}`);
            applyEffect(state, effect);
        }
    }
}

function applyEffect(state: GameState, effect: EffectContext) {
    const isBotActive = state.activePlayer === 'BOT';
    const ownerState = isBotActive ? state.bot : state.player;
    const opponentState = isBotActive ? state.player : state.bot;

    switch (effect.effectType) {
        case EffectType.DEAL_DAMAGE:
            if (effect.payload.target === 'OPPONENT') {
                opponentState.health = Math.max(0, opponentState.health - effect.payload.amount);
            }
            break;
        case EffectType.HEAL:
            if (effect.payload.target === 'OWNER') {
                ownerState.health = Math.min(ownerState.maxHealth, ownerState.health + effect.payload.amount);
            }
            break;
        case EffectType.BUFF_ATK:
            const atkTarget = [...ownerState.board, ...opponentState.board].find(c => c.instanceId === effect.payload.target);
            if (atkTarget && !atkTarget.isSilenced) atkTarget.atk += effect.payload.amount;
            break;
        case EffectType.BUFF_DEF:
            if (effect.payload.target === 'ALL_FRIENDLIES') {
                ownerState.board.forEach(card => {
                    if (!card.isSilenced) card.def += effect.payload.amount;
                });
            }
            break;
        case EffectType.SILENCE:
            if (effect.payload.target === 'RANDOM_OPPONENT_CARD' && opponentState.board.length > 0) {
                const randomIndex = Math.floor(Math.random() * opponentState.board.length);
                opponentState.board[randomIndex].isSilenced = true;
            }
            break;
        case EffectType.ADD_STATUS:
            const statTarget = [...ownerState.board, ...opponentState.board].find(c => c.instanceId === effect.payload.target);
            if (statTarget && !statTarget.isSilenced) statTarget.statuses.push(effect.payload.status);
            break;
        case EffectType.REMOVE_STATUS:
            const statRemoveTarget = [...ownerState.board, ...opponentState.board].find(c => c.instanceId === effect.payload.target);
            if (statRemoveTarget) statRemoveTarget.statuses = statRemoveTarget.statuses.filter(s => s !== effect.payload.status);
            break;
    }

    if (ownerState.health <= 0 || opponentState.health <= 0) {
        state.isGameOver = true;
        state.winner = ownerState.health <= 0 ? opponentState.id as 'PLAYER' | 'BOT' : ownerState.id as 'PLAYER' | 'BOT'; // rough assignment
    }
}
