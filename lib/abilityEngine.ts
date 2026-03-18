/**
 * MOTOR DE HABILIDADES PROCEDURALES - MusicTCG
 * Implementa exactamente lo definido en GDD Sección 8
 * 
 * Este módulo genera habilidades dinámicas usando:
 * - Palabras Clave Estáticas (Keywords Core)
 * - Constructor Dinámico [Gatillo] + [Efecto] + [Objetivo]
 * - Modificadores y Condicionantes (GDD 8.4)
 * - Alcance Global y AoE (GDD 8.2.B expandido)
 */

// ============================================
// TIPOS Y INTERFACES
// ============================================

export enum Trigger {
    // Gatillos Base (GDD 8.2.A)
    INTRO = 'intro', // Cuando es invocada
    OUTRO = 'outro', // Cuando es destruida
    ATTACK = 'attack', // Cada vez que ataca
    SOLO = 'solo', // Habilidad Activa
    AURA = 'aura', // Pasiva Continua
}

export enum Effect {
    // Efectos Base (GDD 8.2.B)
    DAMAGE = 'damage',
    HEAL = 'heal',
    BUFF = 'buff',
    DEBUFF = 'debuff',
    HYPE = 'hype',
    DRAW = 'draw',
    MILL = 'mill',
    SILENCE = 'silence',
    TRAMPLE = 'trample',        // Línea 265
    STEALTH = 'stealth',        // Línea 308
    HASTE = 'haste',            // Línea 339
    ALL_CARDS = 'all_cards',    // Línea 347
    // Efectos Expandidos (GDD 8.4 - Mecánicas Avanzadas)
    ENCORE = 'encore', // Costo adicional opcional
    SOUNDCHECK = 'soundcheck', // Mirar el tope del mazo
    FEATURING = 'featuring', // Acoplar a otra carta
    CANCELLED = 'cancelled', // Remover del juego
    DISCO_ORO = 'disco_oro', // Contadores permanentes
    // Efectos Anti-Meta (GDD 9.4)
    BOICOT = 'boicot', // Robar/Reducir Hype
    HEAL_REPUTATION = 'heal_reputation', // Curación de Reputación
    NERF = 'nerf', // Reducir stats
    MANA_DISRUPTION = 'mana_disruption', // Retrasar Energía
    MIND_CONTROL = 'mind_control', // Tomar control
}

export enum Target {
    // Objetivos Base (GDD 8.2.C)
    ENEMY_REPUTATION = 'enemy_reputation',
    RANDOM_ENEMY = 'random_enemy',
    SAME_ALBUM_CARDS = 'same_album_cards',
    TAPPED_CARDS = 'tapped_cards',
    SELF = 'self',
    // Objetivos Expandidos (Global & AoE - GDD expandida)
    ALL_CARDS = 'all_cards', // Fuego Amigo
    ALL_ENEMY_CARDS = 'all_enemy_cards', // Asimétrico
    ALL_OWN_CARDS = 'all_own_cards', // Sinergia de Masas
    CONDITIONAL_CARDS = 'conditional_cards', // Global Condicionado
    ENEMY_BACKSTAGE = 'enemy_backstage', // Interferencia
}

export enum Keyword {
    // Palabras Clave Estáticas (GDD 8.1)
    PROVOKE = 'provoke', // Muro de Sonido
    HASTE = 'haste', // Tempo / Frenesí
    FLYING = 'flying', // VIP / Evasión
    TRAMPLE = 'trample', // Distorsión / Arrollar
    SUSTAIN = 'sustain', // Regeneración
    STEALTH = 'stealth', // Acústico / Sigilo
}

export enum Condition {
    // Condicionantes (GDD 8.4.A)
    UNDERDOG = 'underdog', // Si tu Reputación <= 10
    MAINSTREAM = 'mainstream', // Si tienes más Hype que el rival
    SOLO = 'solo', // Si eres la única carta en el Escenario
    EMPTY_HAND = 'empty_hand', // Si tienes 0 cartas en la mano
}

// ============================================
// ESTRUCTURA DE HABILIDAD GENERADA
// ============================================

export interface GeneratedAbility {
    id: string; // Hash único
    trigger: Trigger;
    effect: Effect;
    target: Target;
    value: number; // Magnitud del efecto (daño, hype, cartas robadas, etc)
    condition?: Condition; // Opcional: condicionante
    modifier?: string; // Opcional: modificador especial (Encore, Soundcheck, etc)
    text: string; // Descripción humanizada (GDD 8.2)
    mechanicTags: string[]; // Tags ocultos para búsqueda (GDD 10.1)
    cost?: number; // Costo energía adicional (para Solo)
    statPenalty: number; // Penalización de stats por esta habilidad
}

// ============================================
// GENERADOR DE HABILIDADES CON HASH DETERMINISTA
// ============================================

export class AbilityGenerator {
    /**
     * Genera una habilidad basada en:
     * - ID único de la canción (semilla del Hash)
     * - Género musical (define la "piscina" de habilidades)
     * - Coste de Energía (limita poder)
     * 
     * GDD 8.3: Con 6 Gatillos, 7 Efectos base, 5 Objetivos => 600+ permutaciones
     * GDD 8.4: Con condicionantes y modificadores => 12,000+ permutaciones
     */

    private static createDeterministicHash(trackId: string): number {
        // Convertir trackId string a número usando algoritmo simple pero determinístico
        let hash = 0;
        for (let i = 0; i < trackId.length; i++) {
            const char = trackId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Mantener 32-bit
        }
        return Math.abs(hash);
    }

    static generateAbility(
        trackId: string,
        genre: string,
        cost: number,
        rarity: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
    ): GeneratedAbility | null {
        const seed = this.createDeterministicHash(trackId);
        const random = (this.seededRandom(seed) * 100) | 0;

        // GDD 8.1: Chance de recibir una Palabra Clave Estática (en lugar de dinámica)
        if (random < 15) {
            return this.generateKeywordAbility(seed, genre, cost, rarity);
        }

        // GDD 8.2: Constructor Dinámico
        return this.generateDynamicAbility(seed, genre, cost, rarity);
    }

    private static generateKeywordAbility(
        seed: number,
        genre: string,
        cost: number,
        rarity: string
    ): GeneratedAbility {
        const keywordPool = [
            { keyword: Keyword.PROVOKE, text: 'Muro de Sonido', penalty: 1 },
            { keyword: Keyword.HASTE, text: 'Frenesí', penalty: 1 },
            { keyword: Keyword.FLYING, text: 'VIP', penalty: 1 },
            { keyword: Keyword.TRAMPLE, text: 'Distorsión', penalty: 2 },
            { keyword: Keyword.SUSTAIN, text: 'Sustain', penalty: 1 },
            { keyword: Keyword.STEALTH, text: 'Acústico', penalty: 1 },
        ];

        const selected =
            keywordPool[this.seededRandom(seed + 1) * keywordPool.length | 0];

        return {
            id: `kw_${seed}`,
            trigger: Trigger.AURA,
            effect: Effect.BUFF, // Simplificación: las keywords son buffs a reglas
            target: Target.SELF,
            value: 0,
            text: selected.text,
            mechanicTags: [selected.keyword],
            statPenalty: selected.penalty,
        };
    }

    private static generateDynamicAbility(
        seed: number,
        genre: string,
        cost: number,
        rarity: string
    ): GeneratedAbility {
        // GDD 8.2.A: Seleccionar Gatillo
        const triggers = Object.values(Trigger);
        const triggerIndex = (this.seededRandom(seed) * triggers.length) | 0;
        const trigger = triggers[triggerIndex];

        // GDD 8.2.B: Seleccionar Efecto (filtrado por género)
        const effectPool = this.getEffectPoolByGenre(genre);
        const effectIndex = (this.seededRandom(seed + 1) * effectPool.length) | 0;
        const effect = effectPool[effectIndex];

        // GDD 8.2.C: Seleccionar Objetivo
        const targets = Object.values(Target).filter(
            (t) => t !== Target.CONDITIONAL_CARDS
        );
        const targetIndex = (this.seededRandom(seed + 2) * targets.length) | 0;
        const target = targets[targetIndex];

        // Calcular valor del efecto basado en coste
        const value = Math.max(1, Math.min(cost, 3));

        // GDD 8.4: Posible condicionante (baja probabilidad)
        let condition: Condition | undefined;
        if (this.seededRandom(seed + 3) < 0.2) {
            const conditions = Object.values(Condition);
            const condIndex = (this.seededRandom(seed + 4) * conditions.length) | 0;
            condition = conditions[condIndex];
        }

        // GDD 8.4: Posible modificador de MTG
        let modifier: string | undefined;
        if (
            this.seededRandom(seed + 5) < 0.15 &&
            (rarity === 'GOLD' || rarity === 'PLATINUM')
        ) {
            const modifiers = ['encore', 'soundcheck', 'featuring'];
            modifier = modifiers[(this.seededRandom(seed + 6) * modifiers.length) | 0];
        }

        const text = this.generateAbilityText(
            trigger,
            effect,
            target,
            value,
            condition,
            modifier
        );
        const mechanicTags = this.generateMechanicTags(
            trigger,
            effect,
            target,
            condition
        );

        // GDD 9.2: Aplicar Presupuesto e Impuestos
        const statPenalty = this.calculateStatPenalty(effect, target, rarity);

        return {
            id: `dyn_${seed}`,
            trigger,
            effect,
            target,
            value,
            condition,
            modifier,
            text,
            mechanicTags,
            statPenalty,
        };
    }

    /**
     * GDD 6.4: Géneros definen "piscinas" de habilidades
     */
    private static getEffectPoolByGenre(genre: string): Effect[] {
        const normalizedGenre = genre.toLowerCase();

        // Rock / Metal / Punk (Arquetipo: Aggro)
        if (
            normalizedGenre.includes('rock') ||
            normalizedGenre.includes('metal') ||
            normalizedGenre.includes('punk')
        ) {
            return [
                Effect.DAMAGE,
                Effect.DAMAGE,
                Effect.TRAMPLE,
                Effect.DEBUFF,
                Effect.SILENCE,
            ];
        }

        // Pop / R&B / K-Pop (Arquetipo: Control & Sustain)
        if (
            normalizedGenre.includes('pop') ||
            normalizedGenre.includes('r&b') ||
            normalizedGenre.includes('soul')
        ) {
            return [Effect.HEAL, Effect.HEAL, Effect.HYPE, Effect.BUFF, Effect.DRAW];
        }

        // Hip-Hop / Rap (Arquetipo: Debuff / Tempo)
        if (normalizedGenre.includes('hip') || normalizedGenre.includes('rap')) {
            return [
                Effect.DEBUFF,
                Effect.BOICOT,
                Effect.NERF,
                Effect.MANA_DISRUPTION,
            ];
        }

        // Electronic / Dance (Arquetipo: Combo / Mill)
        if (
            normalizedGenre.includes('electronic') ||
            normalizedGenre.includes('dance') ||
            normalizedGenre.includes('house')
        ) {
            return [Effect.DRAW, Effect.MILL, Effect.DRAW, Effect.ENCORE, Effect.HYPE];
        }

        // Classical / Jazz / Blues (Arquetipo: Estrategia Compleja)
        if (
            normalizedGenre.includes('classic') ||
            normalizedGenre.includes('jazz') ||
            normalizedGenre.includes('blues')
        ) {
            return [
                Effect.SOUNDCHECK,
                Effect.BUFF,
                Effect.STEALTH,
                Effect.HEAL,
                Effect.SILENCE,
            ];
        }

        // Default: Pool equilibrada
        return [
            Effect.DAMAGE,
            Effect.HEAL,
            Effect.HYPE,
            Effect.DRAW,
            Effect.DEBUFF,
        ];
    }

    /**
     * GDD 9.2: Calcular penalización de stats por habilidad
     * Tier 3 (Básicas): -1
     * Tier 2 (Fuertes): -2 a -3
     * Tier 1 (Devastadoras): -4 a -6
     */
    private static calculateStatPenalty(
        effect: Effect,
        target: Target,
        rarity: string
    ): number {
        let basePenalty = 1; // Tier 3

        // Efectos Tier 2
        if (
            [Effect.DRAW, Effect.DAMAGE, Effect.HASTE, Effect.NERF].includes(effect)
        ) {
            basePenalty = 2;
        }

        // Efectos Tier 1 (Devastadores)
        if (
            [
                Effect.ALL_CARDS,
                Effect.SILENCE,
                Effect.MILL,
                Effect.MIND_CONTROL,
            ].includes(effect)
        ) {
            basePenalty = 4;
        }

        // GDD 9.3: Descuento para rarezas altas (Star Power Bonus)
        let penalty = basePenalty;
        if (rarity === 'GOLD') {
            penalty = Math.max(0, basePenalty - 1);
        } else if (rarity === 'PLATINUM') {
            penalty = Math.max(0, basePenalty - 2);
        }

        return penalty;
    }

    /**
     * GDD 10.1: Generar etiquetas mecánicas para búsqueda
     */
    private static generateMechanicTags(
        trigger: Trigger,
        effect: Effect,
        target: Target,
        condition?: Condition
    ): string[] {
        const tags: string[] = [trigger, effect, target];

        if (condition) {
            tags.push(condition);
        }

        // Mapeo a etiquetas amigables para búsqueda
        const friendlyTags: { [key in Effect]: string[] } = {
            [Effect.DAMAGE]: ['damage', 'removal'],
            [Effect.HEAL]: ['heal', 'sustain'],
            [Effect.BUFF]: ['buff', 'boost'],
            [Effect.DEBUFF]: ['debuff', 'nerf'],
            [Effect.HYPE]: ['hype', 'win_condition'],
            [Effect.DRAW]: ['draw', 'card_advantage'],
            [Effect.MILL]: ['mill', 'discard'],
            [Effect.SILENCE]: ['silence', 'removal'],
            [Effect.TRAMPLE]: ['trample', 'pierce', 'overkill'],
            [Effect.STEALTH]: ['stealth', 'evasion', 'unblock'],
            [Effect.HASTE]: ['haste', 'tempo', 'immediate'],
            [Effect.ALL_CARDS]: ['aoe', 'global', 'board_wipe'],
            [Effect.ENCORE]: ['encore', 'flexibility'],
            [Effect.SOUNDCHECK]: ['control', 'scry'],
            [Effect.FEATURING]: ['combo', 'synergy'],
            [Effect.CANCELLED]: ['exile', 'permanent_removal'],
            [Effect.DISCO_ORO]: ['counters', 'permanent_buff'],
            [Effect.BOICOT]: ['hype_steal', 'disrupt'],
            [Effect.HEAL_REPUTATION]: ['heal', 'survival'],
            [Effect.NERF]: ['debuff', 'stat_reduction'],
            [Effect.MANA_DISRUPTION]: ['tempo', 'resource_denial'],
            [Effect.MIND_CONTROL]: ['control', 'high_value'],
        };

        return [
            ...tags,
            ...(friendlyTags[effect] || []),
        ];
    }

    private static generateAbilityText(
        trigger: Trigger,
        effect: Effect,
        target: Target,
        value: number,
        condition?: Condition,
        modifier?: string
    ): string {
        let text = '';

        // Agregar condición al inicio
        if (condition === Condition.UNDERDOG) {
            text += 'Si tu Reputación es 10 o menos, ';
        } else if (condition === Condition.MAINSTREAM) {
            text += 'Si tienes más Hype que tu rival, ';
        } else if (condition === Condition.SOLO) {
            text += 'Si eres la única carta en tu Escenario, ';
        } else if (condition === Condition.EMPTY_HAND) {
            text += 'Si tu mano está vacía, ';
        }

        // Trigger
        switch (trigger) {
            case Trigger.INTRO:
                text += 'Cuando es invocada: ';
                break;
            case Trigger.OUTRO:
                text += 'Cuando es destruida: ';
                break;
            case Trigger.ATTACK:
                text += 'Cada vez que ataca: ';
                break;
            case Trigger.SOLO:
                text += `Paga ${value} Energía: `;
                break;
            case Trigger.AURA:
                text += 'Mientras está Enderezada: ';
                break;
        }

        // Efecto y Target
        switch (effect) {
            case Effect.DAMAGE:
                text += `Inflige ${value} daño a ${this.targetToText(target)}.`;
                break;
            case Effect.HEAL:
                text += `Restaura ${value} Defensa a ${this.targetToText(target)}.`;
                break;
            case Effect.HYPE:
                text += `Ganas +${value} Hype.`;
                break;
            case Effect.DRAW:
                text += `Robas ${value} carta(s).`;
                break;
            case Effect.MILL:
                text += `El rival descarta ${value} carta(s).`;
                break;
            case Effect.BUFF:
                text += `Otorga +${value} ATK/DEF a ${this.targetToText(target)}.`;
                break;
            case Effect.DEBUFF:
                text += `Reduce -${value} ATK/DEF a ${this.targetToText(target)}.`;
                break;
            case Effect.SILENCE:
                text += `Silencia a ${this.targetToText(target)}.`;
                break;
            case Effect.BOICOT:
                text += `El rival pierde ${value} Hype.`;
                break;
            case Effect.HEAL_REPUTATION:
                text += `Restauras ${value} Reputación.`;
                break;
            case Effect.NERF:
                text += `${this.targetToText(target)} tiene sus stats en 1/1.`;
                break;
            case Effect.MANA_DISRUPTION:
                text += `El rival devuelve una Energía a su mano.`;
                break;
            case Effect.MIND_CONTROL:
                text += `Toma control de una carta rival hasta fin de turno.`;
                break;
            default:
                text += 'Efecto especial.';
        }

        // Agregar modificador si existe
        if (modifier === 'encore') {
            text += ` Encore (+${value + 1} Energía): Efecto repetido.`;
        } else if (modifier === 'soundcheck') {
            text += ` Soundcheck ${value}: Mira las primeras ${value} cartas de tu Playlist.`;
        } else if (modifier === 'featuring') {
            text += ` Featuring: Puede jugarse sobre otra carta.`;
        }

        return text;
    }

    private static targetToText(target: Target): string {
        switch (target) {
            case Target.ENEMY_REPUTATION:
                return 'a la Reputación rival';
            case Target.RANDOM_ENEMY:
                return 'a una carta rival aleatoria';
            case Target.SAME_ALBUM_CARDS:
                return 'a todas tus cartas del mismo Álbum';
            case Target.TAPPED_CARDS:
                return 'a todas las cartas Giradas';
            case Target.SELF:
                return 'a ti';
            case Target.ALL_CARDS:
                return 'a todas las cartas en el Escenario';
            case Target.ALL_ENEMY_CARDS:
                return 'a todas las cartas rivales';
            case Target.ALL_OWN_CARDS:
                return 'a todas tus cartas';
            case Target.ENEMY_BACKSTAGE:
                return 'a todos los Eventos rivales';
            default:
                return 'a un objetivo';
        }
    }

    /**
     * Generador de números seudoaleatorios determinísticos
     */
    private static seededRandom(seed: number): number {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
}

// ============================================
// VALIDADOR DE BALANCE (GDD 9.2 - 9.4)
// ============================================

export class AbilityValidator {
    /**
     * GDD 9.2: Asegurar que cartas "rotas" tengan el Coste adecuado
     */
    static validateAndAdjustCost(
        ability: GeneratedAbility | null,
        baseCardCost: number,
        baseBudget: number
    ): { finalCost: number; finalBudget: number } {
        if (!ability) {
            return { finalCost: baseCardCost, finalBudget: baseBudget };
        }

        let surcharge = 0;

        // GDD 9.2: Aplicar Recargo por Tier de Habilidad
        if (ability.statPenalty === 0) {
            surcharge = 0; // Tier 3: Sin recargo
        } else if (ability.statPenalty <= 2) {
            surcharge = 1; // Tier 2: +1 Coste
        } else if (ability.statPenalty >= 4) {
            surcharge = 3; // Tier 1: +3 o +4 Coste
        }

        const finalCost = Math.min(baseCardCost + surcharge, 8); // Cap en 8
        const finalBudget = Math.max(baseBudget - ability.statPenalty, 0);

        return { finalCost, finalBudget };
    }
}