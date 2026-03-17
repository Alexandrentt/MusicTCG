/**
 * ─────────────────────────────────────────────────────────────────────────────
 * botAI.ts — Motor de Inteligencia Artificial para el Bot (DDA)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Implementa:
 *   1. calculateDeckPower  → Calcula el "Power Level" de un mazo
 *   2. getDifficultyLevel  → Mapea Power → Novato | Intermedio | Experto
 *   3. generateBotDeck     → Genera un mazo procedural que iguala ±10% el power del jugador
 *   4. botPlayTurn         → Motor de decisión heurístico que devuelve BotAction[]
 *
 * Restricciones:
 *   - Solo lógica pura, sin React/UI
 *   - Tipado estricto en TypeScript
 *   - Devuelve acciones serializables que la UI puede animar
 */

import { CardData, generateCard } from '@/lib/engine/generator';
import { BoardCard, PlayerState, hasKw } from '@/hooks/useGameEngine';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Niveles de dificultad del bot */
export type DifficultyLevel = 'novato' | 'intermedio' | 'experto';

/** Acciones atómicas que el bot puede realizar en un turno */
export type BotAction =
    | { type: 'PROMOTE'; cardIndex: number }
    | { type: 'PLAY_CARD'; cardIndex: number }
    | { type: 'ACTIVATE_BACKSTAGE'; backstageIndex: number }
    | { type: 'ATTACK'; attackerIndex: number; targetIndex: number | null }
    | { type: 'END_TURN' };

/** Estado comprimido del juego que el bot necesita para decidir */
export interface BotGameState {
    botState: PlayerState;
    playerState: PlayerState;
    turnCount: number;
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const RARITY_WEIGHTS: Record<CardData['rarity'], number> = {
    BRONZE: 1,
    SILVER: 2,
    GOLD: 4,
    PLATINUM: 7,
};

/** Canciones genéricas (hardcoded) para generar cartas del bot */
const BOT_SONG_POOL: Array<{
    name: string;
    artist: string;
    genre: string;
}> = [
        // Rock
        { name: 'Electric Storm', artist: 'Voltage', genre: 'Rock' },
        { name: 'Iron Riff', artist: 'Metalcore', genre: 'Rock' },
        { name: 'Broken Strings', artist: 'Shredder', genre: 'Rock' },
        { name: 'Fury Road', artist: 'Highway', genre: 'Rock' },
        { name: 'Thunder Anthem', artist: 'Stormbreaker', genre: 'Rock' },
        // Pop
        { name: 'Neon Lights', artist: 'Glitter', genre: 'Pop' },
        { name: 'Crystal Heart', artist: 'Starfire', genre: 'Pop' },
        { name: 'Midnight Dance', artist: 'Luna', genre: 'Pop' },
        { name: 'Sugar Rush', artist: 'Candy Pop', genre: 'Pop' },
        { name: 'Golden Hour', artist: 'Sunset', genre: 'Pop' },
        // Hip-Hop
        { name: 'Street Cypher', artist: 'MC Flow', genre: 'Hip-Hop' },
        { name: 'Block Party', artist: 'DJ Spin', genre: 'Hip-Hop' },
        { name: 'Mic Drop', artist: 'Lyrical', genre: 'Hip-Hop' },
        { name: 'Cash Flow', artist: 'Money Maker', genre: 'Hip-Hop' },
        { name: 'Underground King', artist: 'Raw Talent', genre: 'Hip-Hop' },
        // Electronic
        { name: 'Synthwave Dream', artist: 'Neon Driver', genre: 'Electronic' },
        { name: 'Bass Cannon', artist: '808 Master', genre: 'Electronic' },
        { name: 'Digital Pulse', artist: 'Cybernet', genre: 'Electronic' },
        { name: 'Rave Protocol', artist: 'Techno Angel', genre: 'Electronic' },
        { name: 'Pixel Beat', artist: 'Chipset', genre: 'Electronic' },
        // Events / Utility
        { name: 'Acoustic Live Session', artist: 'Studio', genre: 'Pop' },
        { name: 'Unplugged Remix', artist: 'Studio', genre: 'Rock' },
        { name: 'Demo Version', artist: 'Indie Lab', genre: 'Pop' },
        { name: 'Live Concert Edit', artist: 'Arena', genre: 'Rock' },
        { name: 'Intro Track', artist: 'Album Opener', genre: 'Electronic' },
    ];

// ─── 1. Cálculo de Poder del Mazo ──────────────────────────────────────────

/**
 * Calcula el "Power Level" de un mazo basándose en la rareza de sus cartas.
 * Escala: BRONZE=1, SILVER=2, GOLD=4, PLATINUM=7
 *
 * @param deck - Array de cartas que componen el mazo
 * @returns Número entero representando el Power Level
 */
export function calculateDeckPower(deck: CardData[]): number {
    return Math.round(
        deck.reduce((total, card) => total + RARITY_WEIGHTS[card.rarity], 0)
    );
}

/**
 * Determina el nivel de dificultad basado en el Power Level.
 *
 * - Novato:      Power < 60   (mazo de puros bronces/platas básicos)
 * - Intermedio:  60 ≤ Power ≤ 90
 * - Experto:     Power > 90   (mazo con oros y platinos)
 */
export function getDifficultyLevel(powerLevel: number): DifficultyLevel {
    if (powerLevel < 60) return 'novato';
    if (powerLevel <= 90) return 'intermedio';
    return 'experto';
}

// ─── 2. Generación del Mazo del Bot ────────────────────────────────────────

/**
 * Genera una carta sintética para el bot con una rareza específica.
 */
function generateBotCard(rarity: CardData['rarity'], index: number): CardData {
    const song = BOT_SONG_POOL[index % BOT_SONG_POOL.length];
    const trackData = {
        trackId: `bot_${rarity}_${index}_${Date.now()}`,
        trackName: song.name,
        artistName: song.artist,
        collectionName: 'El Algoritmo',
        primaryGenreName: song.genre,
        artworkUrl100: `https://picsum.photos/seed/bot${index}${rarity}/300/300`,
        previewUrl: '',
    };
    return generateCard(trackData, rarity);
}

/**
 * Genera un mazo de 40 cartas para el bot cuyo Deck Score esté
 * dentro de un rango de ±10% del targetPowerLevel del jugador.
 *
 * Algoritmo:
 *  1. Calcula cuántas cartas de cada rareza se necesitan para
 *     acercarse al target.
 *  2. Usa un enfoque greedy: llena con bronces primero, luego
 *     "upgradea" cartas para alcanzar el target.
 */
export function generateBotDeck(targetPowerLevel: number): CardData[] {
    const DECK_SIZE = 40;
    const minTarget = Math.floor(targetPowerLevel * 0.9);
    const maxTarget = Math.ceil(targetPowerLevel * 1.1);

    // Clamp target to reasonable bounds
    const safeTarget = Math.max(40, Math.min(targetPowerLevel, 280)); // 40*1=40 min, 40*7=280 max

    // Estrategia: calcular distribución de rarezas
    // Empezamos con todo bronce (40 puntos) y vamos subiendo
    const rarities: CardData['rarity'][] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
    const deck: CardData['rarity'][] = new Array(DECK_SIZE).fill('BRONZE');
    let currentPower = DECK_SIZE * RARITY_WEIGHTS.BRONZE; // 40

    // Upgrade cartas hasta alcanzar el target
    let attempts = 0;
    while (currentPower < minTarget && attempts < 200) {
        const idx = Math.floor(Math.random() * DECK_SIZE);
        const currentRarity = deck[idx];
        const currentRarityIdx = rarities.indexOf(currentRarity);

        if (currentRarityIdx < rarities.length - 1) {
            const nextRarity = rarities[currentRarityIdx + 1];
            const diff = RARITY_WEIGHTS[nextRarity] - RARITY_WEIGHTS[currentRarity];
            if (currentPower + diff <= maxTarget) {
                deck[idx] = nextRarity;
                currentPower += diff;
            }
        }
        attempts++;
    }

    // Si nos pasamos, downgrade aleatorio
    attempts = 0;
    while (currentPower > maxTarget && attempts < 200) {
        const idx = Math.floor(Math.random() * DECK_SIZE);
        const currentRarity = deck[idx];
        const currentRarityIdx = rarities.indexOf(currentRarity);

        if (currentRarityIdx > 0) {
            const prevRarity = rarities[currentRarityIdx - 1];
            const diff = RARITY_WEIGHTS[currentRarity] - RARITY_WEIGHTS[prevRarity];
            if (currentPower - diff >= minTarget) {
                deck[idx] = prevRarity;
                currentPower -= diff;
            }
        }
        attempts++;
    }

    // Generar las cartas reales con las rarezas calculadas
    const cards: CardData[] = deck.map((rarity, i) => generateBotCard(rarity, i));

    // Garantizar al menos 5 eventos (~12.5% del mazo)
    const eventCount = cards.filter(c => c.type === 'EVENT').length;
    if (eventCount < 5) {
        // Convertir las últimas cartas a eventos
        for (let i = cards.length - 1; i >= 0 && cards.filter(c => c.type === 'EVENT').length < 5; i--) {
            if (cards[i].type !== 'EVENT') {
                cards[i] = {
                    ...cards[i],
                    type: 'EVENT',
                    stats: { atk: 0, def: 0 },
                    cost: Math.max(1, Math.floor(cards[i].cost / 2)),
                    abilities: [{
                        keyword: 'Backstage',
                        description: 'Restaura 2 de Defensa a todas tus cartas.',
                    }],
                };
            }
        }
    }

    return cards.sort(() => Math.random() - 0.5);
}

// ─── 3. Motor de Decisión (Heurística del Bot) ────────────────────────────

/**
 * Evalúa el "valor de amenaza" de una carta en el tablero.
 * Se usa para determinar prioridades de ataque.
 */
function threatScore(card: BoardCard): number {
    let score = card.currentAtk * 2 + card.currentDef;
    if (hasKw(card, 'frenzy')) score += 3;
    if (hasKw(card, 'distortion')) score += 2;
    if (hasKw(card, 'hypeEngine')) score += 4; // Genera hype pasivo
    if (hasKw(card, 'taunt')) score += 1;
    if (card.stageFright) score -= 2; // Menos amenaza si no puede atacar aún
    return score;
}

/**
 * Determina si el bot tiene "lethal" — suficiente daño total
 * en mesa (no-tapped, no-stageFright) para matar al jugador.
 */
function hasLethal(botBoard: BoardCard[], playerHp: number, playerBoard: BoardCard[]): boolean {
    // Si hay taunters activos, no podemos atacar directamente
    const activeTaunters = playerBoard.filter(c => hasKw(c, 'taunt') && !c.isTapped);
    if (activeTaunters.length > 0) return false;

    const totalDamage = botBoard
        .filter(c => !c.isTapped && !c.stageFright)
        .reduce((sum, c) => sum + c.currentAtk, 0);

    return totalDamage >= playerHp;
}

/**
 * Encuentra el mejor "tradeo" para una carta atacante contra las cartas defensoras.
 * Un tradeo óptimo es matar una carta enemiga perdiendo la menor inversión posible.
 *
 * @returns índice de la mejor carta objetivo, o null si es mejor atacar directo
 */
function findBestTrade(
    attacker: BoardCard,
    playerBoard: BoardCard[],
): number | null {
    let bestIdx: number | null = null;
    let bestValue = -Infinity;

    for (let i = 0; i < playerBoard.length; i++) {
        const defender = playerBoard[i];
        // Skip stealth cards que no han atacado
        if (hasKw(defender, 'stealth') && !defender.hasAttacked) continue;

        const canKill = attacker.currentAtk >= defender.currentDef;
        const willDie = !defender.isTapped && defender.currentAtk >= attacker.currentDef;

        if (canKill) {
            // Valor = amenaza de la carta que matamos - lo que perdemos
            const myLoss = willDie ? threatScore(attacker) : 0;
            const theirLoss = threatScore(defender);
            const tradeValue = theirLoss - myLoss;

            if (tradeValue > bestValue) {
                bestValue = tradeValue;
                bestIdx = i;
            }
        }
    }

    // Solo trade si es profitable (ganamos más de lo que perdemos)
    return bestValue > 0 ? bestIdx : null;
}

/**
 * Selecciona la carta a jugar según el nivel de dificultad.
 */
function selectCardToPlay(
    hand: CardData[],
    energy: number,
    difficulty: DifficultyLevel,
): number {
    const playable = hand
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => card.cost <= energy && card.type !== 'EVENT');

    if (playable.length === 0) return -1;

    switch (difficulty) {
        case 'novato':
            // Juega la PRIMERA carta que pueda pagar (sin pensar)
            return playable[0].index;

        case 'intermedio':
            // Curve matching: juega la carta MÁS CARA que pueda pagar
            playable.sort((a, b) => b.card.cost - a.card.cost);
            return playable[0].index;

        case 'experto': {
            // Evalúa el valor: prioriza cartas con habilidades útiles y mana efficiency
            playable.sort((a, b) => {
                const aValue = a.card.stats.atk + a.card.stats.def + (a.card.abilities.length * 2);
                const bValue = b.card.stats.atk + b.card.stats.def + (b.card.abilities.length * 2);
                // Priorizar la mejor relación valor/coste, pero sin desperdiciar energía
                const aEfficiency = aValue / Math.max(1, a.card.cost);
                const bEfficiency = bValue / Math.max(1, b.card.cost);

                // Si tiene exactamente la energía para una carta grande, prioriza esa
                if (a.card.cost === energy && b.card.cost < energy) return -1;
                if (b.card.cost === energy && a.card.cost < energy) return 1;

                return bEfficiency - aEfficiency;
            });
            return playable[0].index;
        }
    }
}

/**
 * Motor de decisión principal del bot.
 *
 * Analiza el estado del juego y devuelve un array secuencial de acciones
 * que la UI puede animar una por una.
 *
 * @param gameState  - Estado completo del juego (bot + player)
 * @param difficulty - Nivel de inteligencia del bot
 * @returns Array de BotAction[] en orden de ejecución
 */
export function botPlayTurn(
    gameState: BotGameState,
    difficulty: DifficultyLevel,
): BotAction[] {
    const actions: BotAction[] = [];
    const { botState, playerState } = gameState;

    // Copia mutable para simular el estado durante la planificación
    let simulatedEnergy = botState.energy;
    const simulatedHand = [...botState.hand];
    const simulatedBoard = [...botState.board];

    // ── Fase 0: Promoción ──
    // Promocionar una carta si tenemos >4 en mano y no estamos a max energy
    if (botState.canPromote && botState.maxEnergy < 10 && simulatedHand.length > 4) {
        // Novato: promociona la primera carta siempre
        // Intermedio: promociona la carta más barata
        // Experto: promociona la carta menos valiosa
        let promoteIdx = 0;

        if (difficulty === 'intermedio') {
            // Carta más barata
            let minCost = Infinity;
            simulatedHand.forEach((c, i) => {
                if (c.cost < minCost) { minCost = c.cost; promoteIdx = i; }
            });
        } else if (difficulty === 'experto') {
            // Carta con peor ratio stats/cost (menos valiosa)
            let minValue = Infinity;
            simulatedHand.forEach((c, i) => {
                const value = (c.stats.atk + c.stats.def + c.abilities.length * 2) / Math.max(1, c.cost);
                if (value < minValue) { minValue = value; promoteIdx = i; }
            });
        }

        actions.push({ type: 'PROMOTE', cardIndex: promoteIdx });
        simulatedHand.splice(promoteIdx, 1);
    }

    // ── Fase 1: Jugar cartas de la mano ──
    let cardsPlayed = 0;
    const MAX_PLAYS_PER_TURN = 5; // Evitar loops infinitos

    while (cardsPlayed < MAX_PLAYS_PER_TURN) {
        const idx = selectCardToPlay(simulatedHand, simulatedEnergy, difficulty);
        if (idx === -1) break;

        const card = simulatedHand[idx];
        actions.push({ type: 'PLAY_CARD', cardIndex: idx });
        simulatedEnergy -= card.cost;
        simulatedHand.splice(idx, 1);
        cardsPlayed++;
    }

    // ── Fase 1.5: Activar eventos de Backstage ──
    for (let i = 0; i < botState.backstage.length; i++) {
        const bsCard = botState.backstage[i];
        if (bsCard.cost <= simulatedEnergy) {
            actions.push({ type: 'ACTIVATE_BACKSTAGE', backstageIndex: i });
            simulatedEnergy -= bsCard.cost;
        }
    }

    // ── Fase 2: Atacar ──
    const attackers = simulatedBoard.filter(c => !c.isTapped && !c.stageFright);

    if (attackers.length > 0) {
        switch (difficulty) {
            case 'novato': {
                // Ataca a objetivos aleatorios
                for (const attacker of attackers) {
                    const atkIdx = simulatedBoard.indexOf(attacker);
                    if (playerState.board.length > 0) {
                        // Siempre verifica taunters
                        const taunterIdx = playerState.board.findIndex(
                            c => hasKw(c, 'taunt') && !c.isTapped
                        );
                        if (taunterIdx >= 0) {
                            actions.push({ type: 'ATTACK', attackerIndex: atkIdx, targetIndex: taunterIdx });
                        } else {
                            // Objetivo aleatorio (criatura o directo, 50/50)
                            if (Math.random() > 0.5) {
                                const rndTarget = Math.floor(Math.random() * playerState.board.length);
                                actions.push({ type: 'ATTACK', attackerIndex: atkIdx, targetIndex: rndTarget });
                            } else {
                                actions.push({ type: 'ATTACK', attackerIndex: atkIdx, targetIndex: null });
                            }
                        }
                    } else {
                        actions.push({ type: 'ATTACK', attackerIndex: atkIdx, targetIndex: null });
                    }
                }
                break;
            }

            case 'intermedio': {
                // Prioriza criaturas del jugador antes que ataque directo
                for (const attacker of attackers) {
                    const atkIdx = simulatedBoard.indexOf(attacker);

                    // Taunter first
                    const taunterIdx = playerState.board.findIndex(
                        c => hasKw(c, 'taunt') && !c.isTapped
                    );
                    if (taunterIdx >= 0) {
                        actions.push({ type: 'ATTACK', attackerIndex: atkIdx, targetIndex: taunterIdx });
                        continue;
                    }

                    // Atacar criaturas si hay, sino directo
                    if (playerState.board.length > 0) {
                        // Atacar la criatura con menor DEF que podamos matar
                        let bestTarget = 0;
                        let minDef = Infinity;
                        playerState.board.forEach((c, i) => {
                            if (c.currentDef < minDef && !(hasKw(c, 'stealth') && !c.hasAttacked)) {
                                minDef = c.currentDef;
                                bestTarget = i;
                            }
                        });
                        actions.push({ type: 'ATTACK', attackerIndex: atkIdx, targetIndex: bestTarget });
                    } else {
                        actions.push({ type: 'ATTACK', attackerIndex: atkIdx, targetIndex: null });
                    }
                }
                break;
            }

            case 'experto': {
                // Verificar lethal primero
                if (hasLethal(simulatedBoard, playerState.hp, playerState.board)) {
                    // ¡Tenemos lethal! Atacar todo directo
                    for (const attacker of attackers) {
                        const atkIdx = simulatedBoard.indexOf(attacker);
                        actions.push({ type: 'ATTACK', attackerIndex: atkIdx, targetIndex: null });
                    }
                    break;
                }

                // Si no hay lethal, buscar tradeos óptimos
                // Ordenar atacantes por ATK descendente (los más fuertes tradean mejor)
                const sortedAttackers = [...attackers].sort(
                    (a, b) => threatScore(b) - threatScore(a)
                );

                const attackedTargets = new Set<number>();

                for (const attacker of sortedAttackers) {
                    const atkIdx = simulatedBoard.indexOf(attacker);

                    // Taunter first (obligatorio)
                    const taunterIdx = playerState.board.findIndex(
                        (c, i) => hasKw(c, 'taunt') && !c.isTapped && !attackedTargets.has(i)
                    );
                    if (taunterIdx >= 0) {
                        actions.push({ type: 'ATTACK', attackerIndex: atkIdx, targetIndex: taunterIdx });
                        attackedTargets.add(taunterIdx);
                        continue;
                    }

                    // Buscar el mejor tradeo
                    const tradeTarget = findBestTrade(attacker, playerState.board);

                    if (tradeTarget !== null && !attackedTargets.has(tradeTarget)) {
                        // Tradeo profitable encontrado
                        const defender = playerState.board[tradeTarget];
                        // Si la amenaza del target es alta (ATK >= 3), priorizar matarla
                        if (threatScore(defender) >= 5) {
                            actions.push({ type: 'ATTACK', attackerIndex: atkIdx, targetIndex: tradeTarget });
                            attackedTargets.add(tradeTarget);
                            continue;
                        }
                    }

                    // Si no hay buen tradeo, ataque directo (chip damage)
                    if (playerState.board.length === 0 || tradeTarget === null) {
                        actions.push({ type: 'ATTACK', attackerIndex: atkIdx, targetIndex: null });
                    } else {
                        // Si hay un tradeo pero no es "crítico", atacar directo si el jugador tiene poca vida
                        if (playerState.hp <= 10) {
                            actions.push({ type: 'ATTACK', attackerIndex: atkIdx, targetIndex: null });
                        } else {
                            actions.push({ type: 'ATTACK', attackerIndex: atkIdx, targetIndex: tradeTarget });
                            attackedTargets.add(tradeTarget);
                        }
                    }
                }
                break;
            }
        }
    }

    // ── Fase 3: Fin de turno ──
    actions.push({ type: 'END_TURN' });

    return actions;
}

/**
 * Ejecuta la respuesta del bot durante la fase de Réplica.
 * Decide si interceptar un ataque o dejar pasar.
 *
 * @returns 'skip' | { type: 'intercept', interceptorIdx: number } | { type: 'backstage', idx: number }
 */
export function botReplicaResponse(
    botState: PlayerState,
    attackerCard: BoardCard | null,
    isDirectAttack: boolean,
    difficulty: DifficultyLevel,
): { action: 'skip' } | { action: 'intercept'; interceptorIdx: number } | { action: 'backstage'; backstageIdx: number } {
    // Intentar usar backstage si hay energía
    const playableBackstage = botState.backstage.findIndex(c => c.cost <= botState.energy);
    if (playableBackstage >= 0) {
        return { action: 'backstage', backstageIdx: playableBackstage };
    }

    // Novato: nunca intercepta
    if (difficulty === 'novato') {
        return { action: 'skip' };
    }

    // Solo interceptar ataques directos con energía disponible
    if (!isDirectAttack || botState.energy < 1) {
        return { action: 'skip' };
    }

    // Intermedio: intercepta si tiene una carta con buen DEF
    if (difficulty === 'intermedio') {
        const interceptor = botState.board.findIndex(c => !c.isTapped && c.currentDef >= 3);
        if (interceptor >= 0) {
            return { action: 'intercept', interceptorIdx: interceptor };
        }
        return { action: 'skip' };
    }

    // Experto: intercepta con la carta que mejor resista el golpe
    if (difficulty === 'experto' && attackerCard) {
        // Encuentra la carta que sobreviva al ataque y tenga menos valor
        let bestInterceptor = -1;
        let bestSurvivalMargin = -Infinity;

        botState.board.forEach((card, idx) => {
            if (card.isTapped) return;
            const survives = card.currentDef > attackerCard.currentAtk;
            if (survives) {
                const margin = card.currentDef - attackerCard.currentAtk;
                // Preferir la carta con menor valor propio pero que sobreviva
                const adjustedMargin = margin - threatScore(card) * 0.1;
                if (adjustedMargin > bestSurvivalMargin) {
                    bestSurvivalMargin = adjustedMargin;
                    bestInterceptor = idx;
                }
            }
        });

        if (bestInterceptor >= 0) {
            return { action: 'intercept', interceptorIdx: bestInterceptor };
        }

        // Si nadie sobrevive pero el ataque es letal-range, sacrificar la carta más débil
        if (botState.hp <= attackerCard.currentAtk * 2) {
            const weakest = botState.board
                .map((c, i) => ({ card: c, idx: i }))
                .filter(({ card }) => !card.isTapped)
                .sort((a, b) => threatScore(a.card) - threatScore(b.card))[0];

            if (weakest) {
                return { action: 'intercept', interceptorIdx: weakest.idx };
            }
        }
    }

    return { action: 'skip' };
}
