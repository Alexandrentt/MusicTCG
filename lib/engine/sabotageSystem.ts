// src/lib/engine/sabotageSystem.ts

import { SabotageType } from '@/types/abilities';
import { usePlayerStore } from '@/store/usePlayerStore';
import { CardData } from '@/lib/engine/generator';

interface SabotageState {
    type: SabotageType;
    roundsRemaining: number;
}

const activeSabotages: Record<string, SabotageState[]> = {};

/**
 * Aplica un sabotaje a un jugador (SELF o OPPONENT).
 * El ID puede ser el uid o el guestId.
 */
export function applySabotage(playerId: string, type: SabotageType, duration: number) {
    if (!activeSabotages[playerId]) activeSabotages[playerId] = [];

    // No duplicar mismo tipo, solo renovar duración si es necesario
    const existing = activeSabotages[playerId].find(s => s.type === type);
    if (existing) {
        existing.roundsRemaining = Math.max(existing.roundsRemaining, duration);
    } else {
        activeSabotages[playerId].push({ type, roundsRemaining: duration });
    }
}

/**
 * Obtiene los sabotajes activos para un jugador.
 */
export function getActiveSabotages(playerId: string): SabotageType[] {
    return (activeSabotages[playerId] || [])
        .filter(s => s.roundsRemaining > 0)
        .map(s => s.type);
}

/**
 * Decrementa la duración de todos los sabotajes al final del turno.
 */
export function tickSabotages(playerId: string) {
    if (!activeSabotages[playerId]) return;
    activeSabotages[playerId] = activeSabotages[playerId]
        .map(s => ({ ...s, roundsRemaining: s.roundsRemaining - 1 }))
        .filter(s => s.roundsRemaining > 0);
}

/**
 * Modifica la carta robada según los sabotajes activos.
 * @param playerId El jugador que ROBARÁ la carta.
 * @param deck El mazo actual (para SWAP o REVERSE).
 * @returns La carta resultante (puede ser nula si es VOID).
 */
export function processDrawWithSabotage(playerId: string, deck: CardData[]): { cards: CardData[]; modifiedDeck: CardData[] } {
    const sabotages = getActiveSabotages(playerId);
    if (sabotages.length === 0) return { cards: [deck[0]], modifiedDeck: deck.slice(1) };

    let currentDeck = [...deck];
    let drawnCards: CardData[] = [];

    // 1: ENCRYPT (No afecta el robo físico, solo visual - manejado en UI)

    // 2: REVERSE_DRAW (Roba del final)
    if (sabotages.includes('REVERSE_DRAW') && currentDeck.length > 0) {
        drawnCards.push(currentDeck.pop()!);
    }
    // 3: VOID (Roba carta vacía o null)
    else if (sabotages.includes('VOID') && currentDeck.length > 0) {
        // Simulamos carta vacía (podríamos inyectar una carta especial 'JUNK')
        drawnCards.push({
            id: 'void_card',
            name: 'Silent Track',
            artist: 'The Void',
            rarity: 'BRONZE',
            type: 'EVENT',
            genre: 'Experimental',
            atk: 0,
            def: 0,
            stats: {
                atk: 0,
                def: 0,
            },
            cost: 0,
            album: 'The Nothing',
            artworkUrl: '',
            abilities: [],
            keywords: [],
            themeColor: '#000000',
        });
        currentDeck.shift(); // Quitamos la de arriba igual
    }
    // 4: SWAP (Roba la SEGUNDA carta en vez de la primera para arruinar estrategia)
    else if (sabotages.includes('SWAP') && currentDeck.length > 1) {
        const second = currentDeck.splice(1, 1)[0];
        drawnCards.push(second);
    }
    else {
        drawnCards.push(currentDeck.shift()!);
    }

    // 5: DUPLICATE (Si robas, robas 2 veces pero solo consume 1 mazo)
    if (sabotages.includes('DUPLICATE') && currentDeck.length > 0) {
        drawnCards.push(currentDeck.shift()!);
    }

    return { cards: drawnCards, modifiedDeck: currentDeck };
}
