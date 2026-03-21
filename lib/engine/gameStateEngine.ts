// lib/engine/gameStateEngine.ts
import { GameState, PlayerState, PlayedCard, Card, TurnPhase, GameEndCondition, CombatType } from '../../types/types';

/**
 * MOTOR DE LÓGICA PURA (SIN REACT)
 * Este motor permite realizar simulaciones para la IA y validar acciones en multiplayer.
 */

export class GameStateEngine {

    /**
     * Ejecuta una acción y devuelve una copia del nuevo estado
     */
    static applyAction(state: GameState, action: string, payload: any): GameState {
        const newState = JSON.parse(JSON.stringify(state)) as GameState;
        const activePlayer = newState.players[newState.activePlayer];

        switch (action) {
            case 'PLAY_CARD':
                this.playCard(newState, payload.cardInstanceId, payload.laneId);
                break;
            case 'ATTACK':
                this.resolveAttack(newState, payload.attackerInstanceId, payload.targetInstanceId);
                break;
            case 'SACRIFICE':
                this.sacrificeCard(newState, payload.cardInstanceId);
                break;
            case 'END_TURN':
                this.endTurn(newState);
                break;
        }

        this.checkWinConditions(newState);
        return newState;
    }

    private static playCard(state: GameState, cardId: string, laneId: string) {
        const player = state.players[state.activePlayer];
        const cardIdx = player.zones.hand.findIndex(c => (c as any).instanceId === cardId || c.id === cardId);
        if (cardIdx === -1) return;

        const card = player.zones.hand[cardIdx];
        if (player.energy.current < card.cost) return;

        // Descontar coste
        player.energy.current -= card.cost;

        // Mover a tablero
        const playedCard: PlayedCard = {
            ...card,
            instanceId: cardId, // Debería ser generada al entrar a mano o jugar
            currentAtk: card.atk,
            currentDef: card.def,
            isTapped: true, // Pánico Escénico por defecto si no tiene Haste
            isTapped90: false,
            damageThisTurn: 0,
            laneId
        };

        if (card.type === 'CREATURE') {
            player.zones.board.push(playedCard);
        } else {
            // EVENT: Resolver efecto y al cementerio
            this.resolveEventEffect(state, playedCard);
        }

        player.zones.hand.splice(cardIdx, 1);
    }

    private static resolveAttack(state: GameState, attackerId: string, targetId: string) {
        const attackerOwner = state.activePlayer;
        const defenderOwner = state.activePlayer === 'player_A' ? 'player_B' : 'player_A';

        const attacker = state.players[attackerOwner].zones.board.find(c => c.instanceId === attackerId);
        if (!attacker || attacker.isTapped) return;

        // Marcar como usado
        attacker.isTapped = true;

        if (targetId === 'REPUTATION') {
            // Ataque directo
            state.players[defenderOwner].reputation -= attacker.currentAtk;
        } else {
            // Ataque a carta (Choque/Emboscada)
            const target = state.players[defenderOwner].zones.board.find(c => c.instanceId === targetId);
            if (!target) return;

            // Choque: Si el objetivo no está tapeado, devuelve daño
            if (!target.isTapped) {
                attacker.currentDef -= target.currentAtk;
            }
            target.currentDef -= attacker.currentAtk;

            // Limpieza de muertos
            this.cleanupDead(state);
        }
    }

    private static sacrificeCard(state: GameState, cardId: string) {
        const player = state.players[state.activePlayer];
        if (player.energy.sacrificesThisTurn >= 1) return;

        const cardIdx = player.zones.hand.findIndex(c => (c as any).instanceId === cardId || c.id === cardId);
        if (cardIdx === -1) return;

        player.energy.max++;
        player.energy.current++;
        player.energy.sacrificesThisTurn++;
        player.zones.hand.splice(cardIdx, 1);
    }

    private static endTurn(state: GameState) {
        state.activePlayer = state.activePlayer === 'player_A' ? 'player_B' : 'player_A';
        state.turn++;
        state.phase = TurnPhase.OPENING;

        const nextPlayer = state.players[state.activePlayer];
        // Enderezar cartas
        nextPlayer.zones.board.forEach(c => c.isTapped = false);
        // Restaurar energía
        nextPlayer.energy.current = nextPlayer.energy.max;
        nextPlayer.energy.sacrificesThisTurn = 0;

        // Robar carta (Placeholder)
        if (nextPlayer.zones.deck.length > 0) {
            nextPlayer.zones.hand.push(nextPlayer.zones.deck.pop()!);
        }
    }

    private static cleanupDead(state: GameState) {
        ['player_A', 'player_B'].forEach((pKey: any) => {
            const p = state.players[pKey as 'player_A' | 'player_B'];
            p.zones.board = p.zones.board.filter(c => c.currentDef > 0);
        });
    }

    private static checkWinConditions(state: GameState) {
        if (state.players.player_A.reputation <= 0) {
            state.isGameOver = true;
            state.winner = 'player_B';
            state.endCondition = GameEndCondition.KNOCKOUT;
        } else if (state.players.player_B.reputation <= 0) {
            state.isGameOver = true;
            state.winner = 'player_A';
            state.endCondition = GameEndCondition.KNOCKOUT;
        }
        // TODO: HYPE_WIN, OLVIDO
    }

    private static resolveEventEffect(state: GameState, event: PlayedCard) {
        // Placeholder de efectos de evento
        console.log("Resolviendo evento:", event.name);
    }
}
