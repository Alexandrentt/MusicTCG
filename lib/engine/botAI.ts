// lib/engine/botAI.ts
import { GameState, PlayedCard, Card, PlayerState, TurnPhase } from '../../types/types';
import { BotDifficulty } from '../../types/multiplayer';
import { GameStateEngine } from './gameStateEngine';

/**
 * MOTOR DE INTELIGENCIA ARTIFICIAL - MusicTCG
 * Implementa 4 niveles de dificultad: EASY, NORMAL, HARD, IMPOSSIBLE
 */

export class BotAI {
    private difficulty: BotDifficulty;

    constructor(difficulty: BotDifficulty = BotDifficulty.NORMAL) {
        this.difficulty = difficulty;
    }

    /**
     * Decide la mejor acción a realizar dado el estado actual
     */
    public async getNextAction(state: GameState): Promise<{ action: string, payload: any }> {
        // Solo actuar si es su turno
        if (state.activePlayer !== 'player_B') return { action: 'NONE', payload: null };

        const possibleActions = this.getValidActions(state);
        if (possibleActions.length === 0) return { action: 'END_TURN', payload: null };

        switch (this.difficulty) {
            case BotDifficulty.EASY:
                return this.getEasyAction(possibleActions);
            case BotDifficulty.NORMAL:
                return this.getNormalAction(state, possibleActions);
            case BotDifficulty.HARD:
                return this.getHardAction(state, possibleActions);
            case BotDifficulty.IMPOSSIBLE:
                return this.getImpossibleAction(state);
            default:
                return { action: 'END_TURN', payload: null };
        }
    }

    // ── Dificultades ──────────────────────────────────────────────────────────

    private getEasyAction(actions: any[]) {
        // Aleatorio puro
        return actions[Math.floor(Math.random() * actions.length)];
    }

    private getNormalAction(state: GameState, actions: any[]) {
        // Prioridad: 1. Jugar cartas, 2. Atacar si puede, 3. Sacrificar si necesita mano
        const playCardAction = actions.find(a => a.action === 'PLAY_CARD');
        if (playCardAction) return playCardAction;

        const attackAction = actions.find(a => a.action === 'ATTACK');
        if (attackAction) return attackAction;

        return actions[Math.floor(Math.random() * actions.length)];
    }

    private getHardAction(state: GameState, actions: any[]) {
        // Greedy: Evaluar estado resultante de cada acción y elegir el mejor
        let bestScore = -Infinity;
        let bestAction = actions[0];

        for (const action of actions) {
            const nextState = GameStateEngine.applyAction(state, action.action, action.payload);
            const score = this.evaluateBoard(nextState);
            if (score > bestScore) {
                bestScore = score;
                bestAction = action;
            }
        }
        return bestAction;
    }

    private getImpossibleAction(state: GameState) {
        // Minimax con Poda Alfa-Beta (Profundidad 3-4)
        const result = this.alphaBeta(state, 3, -Infinity, Infinity, true);
        return result.action || { action: 'END_TURN', payload: null };
    }

    // ── Lógica Core ───────────────────────────────────────────────────────────

    private getValidActions(state: GameState): any[] {
        const actions: any[] = [];
        const bot = state.players.player_B;

        // 1. Jugar cartas de la mano
        bot.zones.hand.forEach((card: any) => {
            if (bot.energy.current >= card.cost) {
                actions.push({ action: 'PLAY_CARD', payload: { cardInstanceId: card.instanceId, laneId: 'lane_0' } });
            }
        });

        // 2. Ataques
        bot.zones.board.forEach(card => {
            if (!card.isTapped) {
                // Ataque directo a Reputación
                actions.push({ action: 'ATTACK', payload: { attackerInstanceId: card.instanceId, targetInstanceId: 'REPUTATION' } });

                // Ataque a cartas rivales
                state.players.player_A.zones.board.forEach(enemy => {
                    actions.push({ action: 'ATTACK', payload: { attackerInstanceId: card.instanceId, targetInstanceId: enemy.instanceId } });
                });
            }
        });

        // 3. Sacrificio (Energía)
        if (bot.energy.sacrificesThisTurn === 0 && bot.zones.hand.length > 0) {
            actions.push({ action: 'SACRIFICE', payload: { cardInstanceId: (bot.zones.hand[0] as any).instanceId } });
        }

        // 4. Terminar Turno
        actions.push({ action: 'END_TURN', payload: null });

        return actions;
    }

    /**
     * Valora el tablero (-100 a +100 por ahora) desde la perspectiva del BOT
     */
    private evaluateBoard(state: GameState): number {
        const bot = state.players.player_B;
        const player = state.players.player_A;

        if (state.isGameOver) {
            if (state.winner === 'player_B') return 1000;
            if (state.winner === 'player_A') return -1000;
        }

        let score = 0;

        // 1. Diferencia de Reputación
        score += (bot.reputation - player.reputation) * 2;

        // 2. Control de Tablero (Stats totales en board)
        const botPower = bot.zones.board.reduce((acc, c) => acc + (c.currentAtk + c.currentDef), 0);
        const playerPower = player.zones.board.reduce((acc, c) => acc + (c.currentAtk + c.currentDef), 0);
        score += (botPower - playerPower);

        // 3. Recurso: Mano vs Energía
        score += bot.zones.hand.length * 3;
        score += bot.energy.max * 1.5;

        return score;
    }

    // ── Minimax (Alpha-Beta) ──────────────────────────────────────────────────

    private alphaBeta(state: GameState, depth: number, alpha: number, beta: number, isBot: boolean): { score: number, action?: any } {
        if (depth === 0 || state.isGameOver) {
            return { score: this.evaluateBoard(state) };
        }

        const actions = this.getValidActions(state);

        if (isBot) {
            let maxEval = -Infinity;
            let bestAction = actions[0];

            for (const action of actions) {
                // No profundizar en END_TURN si es la primera acción elegida
                if (action.action === 'END_TURN' && actions.length > 1) continue;

                const nextState = GameStateEngine.applyAction(state, action.action, action.payload);
                const evalScore = this.alphaBeta(nextState, depth - 1, alpha, beta, false).score;

                if (evalScore > maxEval) {
                    maxEval = evalScore;
                    bestAction = action;
                }
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return { score: maxEval, action: bestAction };
        } else {
            let minEval = Infinity;
            for (const action of actions) {
                const nextState = GameStateEngine.applyAction(state, action.action, action.payload);
                const evalScore = this.alphaBeta(nextState, depth - 1, alpha, beta, true).score;
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return { score: minEval };
        }
    }
}
