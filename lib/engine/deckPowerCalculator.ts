import { MasterCardTemplate } from '@/types/types';
import { BotDifficulty } from '@/types/multiplayer';

export interface DeckPowerScore {
  baseScore: number;               // 0-100
  synergyBonus: number;            // Bonus por combos
  raretyScore: number;             // Promedio de rareza
  costEfficiency: number;          // Relación coste/stats
  mechanicsScore: number;          // Poder de habilidades
  
  finalScore: number;              // Score final (0-100)
  difficulty: BotDifficulty;       // Dificultad recomendada
}

export function calculateDeckPowerScore(
  cards: MasterCardTemplate[]
): DeckPowerScore {
  if (!cards || cards.length === 0) {
    return {
      baseScore: 0,
      synergyBonus: 0,
      raretyScore: 0,
      costEfficiency: 0,
      mechanicsScore: 0,
      finalScore: 0,
      difficulty: BotDifficulty.EASY,
    };
  }

  // Rareza promedio
  const rarityScores: Record<string, number> = {
    BRONZE: 10,
    SILVER: 25,
    GOLD: 50,
    PLATINUM: 75,
    MYTHIC: 100,
  };

  const rarityScore =
    cards.reduce((sum, card) => sum + (rarityScores[card.rarity] || 0), 0) /
    cards.length;

  // Eficiencia de coste
  const costEfficiency = cards.reduce((sum, card) => {
    const totalStats = (card.atk || 0) + (card.def || 0);
    const efficiency = totalStats / Math.max(card.cost || 1, 1);
    return sum + efficiency;
  }, 0) / cards.length;

  // Poder de habilidades
  const mechanicsScore = calculateMechanicsScore(cards);

  // Sinergia (Album bonus, mismo género, etc)
  const synergyBonus = calculateSynergyBonus(cards);

  // Curva de coste
  const costCurveScore = calculateCostCurveScore(cards);

  // Cálculo final
  const baseScore =
    (rarityScore * 0.3 +  // 30% rareza
    costEfficiency * 2.5 + // Ajustado para stats
    mechanicsScore * 0.25 + // 25% habilidades
    costCurveScore * 0.2); // 20% curva

  const finalScore = Math.min(100, Math.max(0, baseScore + synergyBonus));

  const difficulty =
    finalScore < 30
      ? BotDifficulty.EASY
      : finalScore < 60
      ? BotDifficulty.NORMAL
      : finalScore < 85
      ? BotDifficulty.HARD
      : BotDifficulty.IMPOSSIBLE;

  return {
    baseScore,
    synergyBonus,
    raretyScore: rarityScore,
    costEfficiency,
    mechanicsScore,
    finalScore,
    difficulty,
  };
}

function calculateMechanicsScore(cards: MasterCardTemplate[]): number {
  const mechanicScores: Record<string, number> = {
    draw: 15,
    damage: 20,
    heal: 18,
    hype_generator: 25,
    debuff: 15,
    board_wipe: 30,
    evasion: 12,
    tempo: 20,
    removal: 18,
  };

  let totalScore = 0;
  let count = 0;

  for (const card of cards) {
    if (card.abilities) {
      for (const ability of card.abilities) {
        if (ability.mechanicTags) {
          for (const mechanic of ability.mechanicTags) {
             totalScore += mechanicScores[mechanic] || 10;
             count++;
          }
        }
      }
    }
  }

  return count > 0 ? Math.min(100, (totalScore / count) * 4) : 0;
}

function calculateSynergyBonus(cards: MasterCardTemplate[]): number {
  // Album bonus: 3+ cartas del mismo álbum = +2 stats
  const albumCounts = new Map<string, number>();
  let synergyBonus = 0;

  for (const card of cards) {
    const album = card.album || 'unknown';
    albumCounts.set(album, (albumCounts.get(album) || 0) + 1);
  }

  for (const count of albumCounts.values()) {
    if (count >= 3) {
      synergyBonus += 5 * Math.floor(count / 3);
    }
  }

  const genreCounts = new Map<string, number>();
  for (const card of cards) {
    const genre = card.genre || 'unknown';
    genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
  }

  if (genreCounts.size > 0) {
    const maxGenreCount = Math.max(...Array.from(genreCounts.values()));
    if (maxGenreCount >= cards.length * 0.5) {
      synergyBonus += 3;
    }
  }

  return Math.min(15, synergyBonus);
}

function calculateCostCurveScore(cards: MasterCardTemplate[]): number {
  const costCounts = new Map<number, number>();

  for (const card of cards) {
    const cost = card.cost || 1;
    costCounts.set(cost, (costCounts.get(cost) || 0) + 1);
  }

  // Calcular desviación de la curva ideal
  const idealCurve = [40, 30, 15, 10, 5];  // % para coste 1,2,3,4,5+
  let deviation = 0;

  for (let i = 0; i < idealCurve.length; i++) {
    const actualPercent = ((costCounts.get(i + 1) || 0) / Math.max(1, cards.length)) * 100;
    deviation += Math.abs(actualPercent - idealCurve[i]);
  }

  return Math.max(0, 100 - deviation);
}

export function analyzeDeckPower(cards: MasterCardTemplate[]) {
  const score = calculateDeckPowerScore(cards);
  return getDeckPowerDescription(score.finalScore);
}

export function getDeckPowerDescription(score: number): string {
  if (score < 30) return "🟢 Principiante";
  if (score < 60) return "🟡 Competitivo";
  if (score < 85) return "🟠 Fuerte - Experto";
  return "🔴 Imparable - Dios";
}
