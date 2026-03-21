/**
 * SISTEMA DE ECONOMÍA - MusicTCG
 * GDD Sección 7: Economía y Colección (El Sistema de Comodines)
 * GDD Sección 11: Adquisición de Cartas Específicas (La Disquera)
 * 
 * Implementa:
 * - Regalías (moneda blanda)
 * - Comodines (material de crafteo)
 * - Límite de Play-set (4 copias máximo)
 * - Protección Anti-Duplicados
 * - Medidor de Hype (Pity Timer)
 * - La Bóveda (Vault)
 */

import { CardRarity } from '@/types/types';

// ============================================
// TIPOS Y INTERFACES
// ============================================

export interface PlayerInventory {
  userId: string;
  regalias: number; // Moneda blanda
  wildcards: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  inventory: {
    [cardId: string]: number; // cardId: cantidad
  };
  pityTimer: {
    silverGold: number; // Sobres abiertos (pity en 6)
    platinum: number; // Sobres abiertos (pity en 24)
  };
  vault: {
    progress: number; // 0-100
    lastGrantedAt: Date;
  };
}

export interface BoosterPackResult {
  cards: string[]; // Array de cardIds obtenidas
  wildcardGranted?: CardRarity; // Si se otorgó un comodín
}

// ============================================
// LÍMITES Y REGLAS (GDD 7)
// ============================================

export const GAME_RULES = {
  PLAYSET_LIMIT: 4, // GDD 7.1: Máximo 4 copias del mismo cardId
  BOOSTER_CARDS_COUNT: 5, // 5 cartas por sobre (recomendación estándar)
  REGALIAS_WIN_REWARD: 100, // Regalías por victoria
  REGALIAS_LOSS_REWARD: 25, // Regalías por derrota
  PITY_TIMER_SILVER_GOLD: 6, // Comodín garantizado cada 6 sobres
  PITY_TIMER_PLATINUM: 24, // Comodín Platino garantizado cada 24 sobres
  VAULT_THRESHOLD: 100, // Bóveda se abre al 100%
  VAULT_INCREMENT_PER_DUPLICATE: 10, // +10% por carta duplicada
};

// ============================================
// GENERADOR DE SOBRES
// ============================================

export class BoosterGenerator {
  /**
   * GDD 7: Generar un sobre (5 cartas aleatorias)
   * 
   * Proceso:
   * 1. Seleccionar 5 cartas aleatorias del universo
   * 2. Aplicar probabilidades de rareza (80% común, 15% rara, 4% épica, 1% legendaria)
   * 3. Aplicar protección anti-duplicados
   */

  static generateBoosterPack(
    availableCards: string[], // IDs de cartas disponibles
    inventory: PlayerInventory,
    rarity?: CardRarity // Opcional: forzar booster de género específico
  ): string[] {
    const cards: string[] = [];
    const BOOSTER_SIZE = GAME_RULES.BOOSTER_CARDS_COUNT;

    // Distribuir rarezas según probabilidad estándar de TCG
    const rarityDistribution = [
      { rarity: 'BRONZE', count: 3, probability: 0.6 },
      { rarity: 'SILVER', count: 1, probability: 0.25 },
      { rarity: 'GOLD', count: 0, probability: 0.12 },
      { rarity: 'PLATINUM', count: 0, probability: 0.03 },
    ];

    // Garantizar al menos 1 rara
    const guaranteed = this.selectRandomCard(availableCards, 'SILVER');
    if (guaranteed) cards.push(guaranteed);

    // Llenar el resto según probabilidades
    while (cards.length < BOOSTER_SIZE) {
      const roll = Math.random();
      let selectedRarity: CardRarity;

      if (roll < 0.6) {
        selectedRarity = 'BRONZE';
      } else if (roll < 0.85) {
        selectedRarity = 'SILVER';
      } else if (roll < 0.97) {
        selectedRarity = 'GOLD';
      } else {
        selectedRarity = 'PLATINUM';
      }

      const card = this.selectRandomCard(availableCards, selectedRarity);
      if (card && !cards.includes(card)) {
        cards.push(card);
      }
    }

    return cards;
  }

  private static selectRandomCard(
    availableCards: string[],
    rarity?: CardRarity
  ): string | null {
    // En el juego real, esto consultaría Supabase filtrando por rareza
    // Por ahora retornamos una aleatoria de las disponibles

    if (!availableCards.length) return null;

    const index = Math.floor(Math.random() * availableCards.length);
    return availableCards[index];
  }
}

// ============================================
// PROCESADOR DE SOBRES (Aplicar Protecciones)
// ============================================

export class BoosterProcessor {
  /**
   * GDD 7.2: Protección Anti-Duplicados
   * 
   * Si obtienes una 5ª copia de una carta:
   * - No se añade al inventario
   * - Se convierte automáticamente en 1 Comodín de esa rareza
   * - Se incrementa el progreso de la Bóveda
   */

  static processBoosterCards(
    cards: string[],
    inventory: PlayerInventory,
    cardRarities: { [cardId: string]: CardRarity }
  ): BoosterPackResult {
    const result: BoosterPackResult = {
      cards: [],
      wildcardGranted: undefined,
    };

    // Antes de procesar, incrementar pity timers
    inventory.pityTimer.silverGold++;
    inventory.pityTimer.platinum++;

    for (const cardId of cards) {
      const currentCount = inventory.inventory[cardId] || 0;
      const rarity = cardRarities[cardId];

      // GDD 7.2: Limit check
      if (currentCount >= GAME_RULES.PLAYSET_LIMIT) {
        // Es una duplicada > 4
        // Convertir a comodín
        this.grantWildcard(inventory, rarity);
        this.incrementVault(inventory);

        result.cards.push(cardId);
      } else {
        // Añadir normalmente
        inventory.inventory[cardId] = currentCount + 1;
        result.cards.push(cardId);
      }
    }

    // GDD 7.2: Chequear Pity Timers
    if (inventory.pityTimer.silverGold >= GAME_RULES.PITY_TIMER_SILVER_GOLD) {
      // Otorgar Comodín Plata u Oro garantizado
      const wildcard = Math.random() < 0.5 ? 'silver' : 'gold';
      inventory.wildcards[wildcard as 'silver' | 'gold']++;
      inventory.pityTimer.silverGold = 0;
      result.wildcardGranted = wildcard === 'silver' ? 'SILVER' : 'GOLD';
    }

    if (inventory.pityTimer.platinum >= GAME_RULES.PITY_TIMER_PLATINUM) {
      // Otorgar Comodín Platino garantizado
      inventory.wildcards.platinum++;
      inventory.pityTimer.platinum = 0;
      result.wildcardGranted = 'PLATINUM';
    }

    return result;
  }

  private static grantWildcard(inventory: PlayerInventory, rarity: CardRarity): void {
    // GDD 7.2: Convertir a comodín
    switch (rarity) {
      case 'BRONZE':
        inventory.wildcards.bronze++;
        break;
      case 'SILVER':
        inventory.wildcards.silver++;
        break;
      case 'GOLD':
        inventory.wildcards.gold++;
        break;
      case 'PLATINUM':
        inventory.wildcards.platinum++;
        break;
    }
  }

  private static incrementVault(inventory: PlayerInventory): void {
    // GDD 7.2: La Bóveda
    inventory.vault.progress += GAME_RULES.VAULT_INCREMENT_PER_DUPLICATE;

    if (inventory.vault.progress >= GAME_RULES.VAULT_THRESHOLD) {
      // Abrir la bóveda: otorgar paquete de comodines
      this.openVault(inventory);
      inventory.vault.progress = 0;
    }
  }

  private static openVault(inventory: PlayerInventory): void {
    // GDD 7.2: Otorgar paquete de comodines aleatorios
    const grants = [
      { rarity: 'bronze', chance: 0.4 },
      { rarity: 'silver', chance: 0.3 },
      { rarity: 'gold', chance: 0.25 },
      { rarity: 'platinum', chance: 0.05 },
    ];

    for (let i = 0; i < 3; i++) {
      // Otorgar 3 comodines
      const roll = Math.random();
      let selected = 'bronze';

      if (roll < 0.4) {
        selected = 'bronze';
      } else if (roll < 0.7) {
        selected = 'silver';
      } else if (roll < 0.95) {
        selected = 'gold';
      } else {
        selected = 'platinum';
      }

      inventory.wildcards[selected as 'bronze' | 'silver' | 'gold' | 'platinum']++;
    }

    inventory.vault.lastGrantedAt = new Date();
  }
}

// ============================================
// CRAFTEO EN LA DISQUERA (GDD 11)
// ============================================

export class RecordLabelCrafter {
  /**
   * GDD 11.2: La Economía de la Disquera
   * 
   * 1 Comodín de Rareza X = 1 Carta a elección de Rareza X
   * Las rarezas están aisladas (no se pueden mezclar)
   */

  static craftCard(
    cardId: string,
    cardRarity: CardRarity,
    inventory: PlayerInventory
  ): boolean {
    // Mapeo de rareza a tipo de comodín
    const wildcardTypeMap: { [key in CardRarity]: keyof typeof inventory.wildcards } = {
      BRONZE: 'bronze',
      SILVER: 'silver',
      GOLD: 'gold',
      PLATINUM: 'platinum',
      MYTHIC: 'platinum', // Use platinum for mythic wildcards
    };

    const wildcardType = wildcardTypeMap[cardRarity];

    // Verificar que el jugador tiene el comodín
    if (inventory.wildcards[wildcardType] < 1) {
      throw new Error(`No tienes Comodines ${cardRarity}`);
    }

    // Verificar que no excede el límite de 4
    const currentCount = inventory.inventory[cardId] || 0;
    if (currentCount >= GAME_RULES.PLAYSET_LIMIT) {
      throw new Error(`Ya tienes 4 copias de esta carta`);
    }

    // Aplicar gasto de comodín
    inventory.wildcards[wildcardType]--;
    inventory.inventory[cardId] = currentCount + 1;

    return true;
  }

  /**
   * GDD 11.3: Filtro Inverso (Buscando Talento)
   * Mostrar todas las cartas de la comunidad con una etiqueta específica
   */
  static discoverCardsByMechanic(
    mechanicTag: string,
    discoveredCards: { [cardId: string]: { rarity: CardRarity; name: string } }
  ): Array<{ cardId: string; rarity: CardRarity; name: string }> {
    // En el juego real, esto consultaría una tabla de "cartas descubiertas globalmente"
    // Por ahora retornamos las que están en discoveredCards

    return Object.entries(discoveredCards)
      .map(([cardId, data]) => ({
        cardId,
        rarity: data.rarity,
        name: data.name,
      }))
      .slice(0, 20); // Top 20 más populares
  }
}

// ============================================
// RECOMPENSAS Y PROGRESIÓN
// ============================================

export class RewardSystem {
  /**
   * GDD: Otorgar recompensas por completar partidas
   */

  static grantMatchReward(
    inventory: PlayerInventory,
    isVictory: boolean
  ): number {
    const regalias = isVictory
      ? GAME_RULES.REGALIAS_WIN_REWARD
      : GAME_RULES.REGALIAS_LOSS_REWARD;

    inventory.regalias += regalias;

    return regalias;
  }

  /**
   * Otorgar recompensas por misiones diarias (Giras)
   */
  static grantDailyQuestReward(inventory: PlayerInventory, questId: string): number {
    // Diferentes misiones otorgan diferentes cantidades
    const rewards: { [key: string]: number } = {
      PLAY_20_ROCK: 50,
      DESTROY_15_CARDS: 75,
      WIN_3_MATCHES: 200,
      PLAY_100_CARDS: 100,
    };

    const reward = rewards[questId] || 50;
    inventory.regalias += reward;

    return reward;
  }
}

// ============================================
// HELPERS DE CURRENCY
// ============================================

export function canAffordBooster(
  inventory: PlayerInventory,
  boosterPrice: number = 300
): boolean {
  // Precio estándar de un booster: 300 Regalías
  return inventory.regalias >= boosterPrice;
}

export function purchaseBooster(
  inventory: PlayerInventory,
  boosterPrice: number = 300
): boolean {
  if (!canAffordBooster(inventory, boosterPrice)) {
    return false;
  }

  inventory.regalias -= boosterPrice;
  return true;
}

export function getRarityWildcardCount(
  inventory: PlayerInventory,
  rarity: CardRarity
): number {
  const map: { [key in CardRarity]: keyof typeof inventory.wildcards } = {
    BRONZE: 'bronze',
    SILVER: 'silver',
    GOLD: 'gold',
    PLATINUM: 'platinum',
    MYTHIC: 'platinum', // Use platinum for mythic wildcards
  };

  return inventory.wildcards[map[rarity]];
}
