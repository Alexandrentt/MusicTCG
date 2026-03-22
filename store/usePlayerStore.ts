import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CardData } from '@/lib/engine/generator';
import { PlayerRank, PlayerLevel, createDefaultRank, createDefaultLevel, computeVictory, computeLoss, computeXPGain, XPSource } from '@/lib/engine/rankingSystem';
import { ChestSlot, ChestType, CHEST_CONFIG } from '@/lib/monetization/chestSystem';
import { UserRole } from '@/lib/auth/roleSystem';

export interface Deck {
  id: string;
  name: string;
  coverArt?: string;
  cards: Record<string, number>;
}

export interface Mission {
  id: string;
  type: 'mill' | 'open_pack' | 'craft';
  description: string;
  progress: number;
  target: number;
  reward: number;
  completed: boolean;
}

export interface PlayerState {
  regalias: number;
  wildcards: {
    BRONZE: number;
    SILVER: number;
    GOLD: number;
    PLATINUM: number;
    MYTHIC: number;
  };
  wildcardProgress: {
    BRONZE: number;
    SILVER: number;
    GOLD: number;
    PLATINUM: number;
    MYTHIC: number;
  };
  inventory: Record<string, {
    card: CardData;
    count: number;
    obtainedAt: number;
    useAltArt?: boolean;
    altArtUrl?: string;
    altArtSource?: 'youtube' | 'caa' | 'generative';
  }>;
  decks: Record<string, Deck>;

  freePacksCount: number;
  lastFreePackTime: number;
  dailyMissions: Mission[];
  lastMissionResetTime: number;
  language: string;
  discoveryUsername: string;
  hasReceivedInitialPacks: boolean;
  hasCompletedOnboarding: boolean;
  isInBattle: boolean;
  playMusicInBattle: boolean;
  pityCounters: {
    GOLD: number;
    PLATINUM: number;
  };
  rank: PlayerRank;
  level: PlayerLevel;

  // Chest System
  chestQueue: ChestSlot[];
  maxChestSlots: number;
  premiumGold: number;

  // Monetization
  isPaying: boolean;
  role: UserRole;
  featureFlags: {
    cosmetics: boolean;
    skins: boolean;
    battlePass: boolean;
    ads: boolean;
  };

  // Actions
  addRegalias: (amount: number) => void;
  spendRegalias: (amount: number) => boolean;
  addCard: (card: CardData, count?: number) => { added: boolean; convertedToWildcard: boolean };
  addCards: (cards: CardData[]) => { added: number; converted: number };
  setInventory: (inventory: Record<string, any>) => void;
  craftCard: (card: CardData) => boolean;
  /**
   * Muele una carta del inventario.
   * Si la carta llega a 0 copias, se elimina del inventario y de todos los mazos.
   * Aumenta el progreso del comodín de la rareza correspondiente.
   * Si el progreso llega a 5, se otorga un comodín y se reinicia el progreso.
   */
  millCard: (cardId: string, count?: number) => boolean;
  millAllDuplicates: () => number;

  createDeck: (name: string) => void;
  deleteDeck: (deckId: string) => void;
  addCardToDeck: (deckId: string, card: CardData) => boolean;
  removeCardFromDeck: (deckId: string, cardId: string) => void;

  checkHourlyPacks: () => void;
  consumeFreePack: (count: number) => boolean;
  checkDailyMissions: () => void;
  updateMissionProgress: (type: string, amount: number) => void;
  claimMissionReward: (missionId: string) => void;
  inspectingCard: CardData | null;
  setInspectingCard: (card: CardData | null) => void;
  setLanguage: (lang: string) => void;
  setDiscoveryUsername: (username: string) => void;
  updateRank: (won: boolean) => any;
  updateXP: (source: XPSource, multiplier?: number) => any;
  setHasReceivedInitialPacks: (val: boolean) => void;
  setIsInBattle: (val: boolean) => void;
  setPlayMusicInBattle: (val: boolean) => void;
  incrementPity: (rarity: 'GOLD' | 'PLATINUM') => void;
  resetPity: (rarity: 'GOLD' | 'PLATINUM') => void;
  completeOnboarding: (deckName: string, cards: CardData[]) => void;
  setCardAltArt: (cardId: string, use: boolean, url?: string, source?: string) => void;
  recalculateInventory: () => void;
  resetAll: () => void;

  // Chest Actions
  addChest: (chest: ChestSlot) => boolean;
  startChestUnlock: (chestId: string) => void;
  openChest: (chestId: string) => void;
  accelerateChest: (chestId: string) => void;
  updateChestTimers: () => void;

  // Monetization Actions
  setPayingStatus: (val: boolean) => void;
  addPremiumGold: (amount: number) => void;
  updateFeatureFlag: (flag: 'cosmetics' | 'skins' | 'battlePass' | 'ads', enabled: boolean) => void;
  // Store UI State
  activeStoreTab: 'packs' | 'premium' | 'cosmetics';
  setActiveStoreTab: (tab: 'packs' | 'premium' | 'cosmetics') => void;
}


export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      regalias: 1500, // Starting amount for testing
      wildcards: {
        BRONZE: 0,
        SILVER: 0,
        GOLD: 0,
        PLATINUM: 0,
        MYTHIC: 0,
      },
      wildcardProgress: {
        BRONZE: 0,
        SILVER: 0,
        GOLD: 0,
        PLATINUM: 0,
        MYTHIC: 0,
      },
      inventory: {},
      decks: {},
      freePacksCount: 0,
      lastFreePackTime: Date.now(),
      dailyMissions: [],
      lastMissionResetTime: 0,
      language: 'es', // Default, will be updated by component
      discoveryUsername: '',
      hasReceivedInitialPacks: false,
      hasCompletedOnboarding: false,
      isInBattle: false,
      playMusicInBattle: true,
      pityCounters: {
        GOLD: 0,
        PLATINUM: 0,
        MYTHIC: 0,
      },
      rank: createDefaultRank('local-user'),
      level: createDefaultLevel('local-user'),

      chestQueue: [],
      maxChestSlots: 4,
      premiumGold: 50, // Starter premium gold
      isPaying: false,
      role: UserRole.FREE,
      featureFlags: {
        cosmetics: false,
        skins: false,
        battlePass: false,
        ads: false
      },

      inspectingCard: null,
      setInspectingCard: (card) => set({ inspectingCard: card }),
      setCardAltArt: (cardId, use, url, source) => set(state => ({
        inventory: {
          ...state.inventory,
          [cardId]: {
            ...state.inventory[cardId],
            useAltArt: use,
            altArtUrl: url,
            altArtSource: source as any,
          }
        }
      })),
      addRegalias: (amount) => set((state) => ({ regalias: state.regalias + amount })),

      spendRegalias: (amount) => {
        const { regalias } = get();
        if (regalias >= amount) {
          set({ regalias: regalias - amount });
          return true;
        }
        return false;
      },

      addCard: (card, count) => {
        let result = { added: false, convertedToWildcard: false };
        set((state) => {
          // Master Card Logic: Find if we already own this exact song
          let targetCardId = card.id;
          const existingMaster = Object.values(state.inventory).find(
            item =>
              item.card.name.toLowerCase() === card.name.toLowerCase() &&
              item.card.artist.toLowerCase() === card.artist.toLowerCase()
          );

          if (existingMaster) {
            targetCardId = existingMaster.card.id;
          }

          const existing = state.inventory[targetCardId];
          const count = existing ? existing.count : 0;

          // Rule 7.1 & 7.2: Play-set limit is 4. 5th copy becomes a wildcard.
          if (count >= 4) {
            result = { added: false, convertedToWildcard: true };
            return {
              wildcards: {
                ...state.wildcards,
                [card.rarity]: state.wildcards[card.rarity] + 1
              }
            };
          } else {
            result = { added: true, convertedToWildcard: false };
            return {
              inventory: {
                ...state.inventory,
                // Use the master card if it exists to maintain consistency
                [targetCardId]: {
                  card: existing ? existing.card : card,
                  count: count + 1,
                  obtainedAt: existing?.obtainedAt ?? Date.now(),
                }
              }
            };
          }
        });
        return result;
      },

      addCards: (cards) => {
        let addedCount = 0;
        let convertedCount = 0;

        set((state) => {
          const newInventory = { ...state.inventory };
          const newWildcards = { ...state.wildcards };

          cards.forEach(card => {
            // Master Card Logic
            const existingMaster = Object.values(newInventory).find(
              item =>
                item.card.name.toLowerCase() === card.name.toLowerCase() &&
                item.card.artist.toLowerCase() === card.artist.toLowerCase()
            );

            const targetId = existingMaster ? existingMaster.card.id : card.id;
            const existing = newInventory[targetId];
            const count = existing ? existing.count : 0;

            if (count >= 4) {
              convertedCount++;
              newWildcards[card.rarity] = (newWildcards[card.rarity] || 0) + 1;
            } else {
              addedCount++;
              newInventory[targetId] = {
                card: existing ? existing.card : card,
                count: count + 1,
                obtainedAt: existing?.obtainedAt ?? Date.now(),
              };
            }
          });

          return { inventory: newInventory, wildcards: newWildcards };
        });

        return { added: addedCount, converted: convertedCount };
      },

      craftCard: (card) => {
        const { wildcards, inventory } = get();
        const existing = inventory[card.id];
        const count = existing ? existing.count : 0;

        // Cannot craft if already at max copies
        if (count >= 4) return false;

        // Check if player has the required wildcard
        if (wildcards[card.rarity] > 0) {
          set((state) => ({
            wildcards: {
              ...state.wildcards,
              [card.rarity]: state.wildcards[card.rarity] - 1
            },
            inventory: {
              ...state.inventory,
              [card.id]: { card, count: count + 1, obtainedAt: Date.now() }
            }
          }));
          get().updateMissionProgress('craft', 1);
          return true;
        }
        return false;
      },

      millCard: (cardId, count) => {
        let success = false;
        set((state) => {
          const item = state.inventory[cardId];
          if (!item || item.count <= 0) return state;

          const rarity = item.card.rarity;
          const newCount = item.count - 1;
          const newInventory = { ...state.inventory };

          if (newCount <= 0) {
            delete newInventory[cardId];
          } else {
            newInventory[cardId] = { ...item, count: newCount };
          }

          const newDecks = { ...state.decks };
          Object.keys(newDecks).forEach(dId => {
            const deck = newDecks[dId];
            if (deck.cards[cardId] > newCount) {
              const dCards = { ...deck.cards };
              if (newCount === 0) delete dCards[cardId];
              else dCards[cardId] = newCount;
              newDecks[dId] = { ...deck, cards: dCards };
            }
          });

          // Update wildcard progress safely
          const currentProgress = state.wildcardProgress?.[rarity] || 0;
          let newProgress = currentProgress + 1;
          let newWildcards = state.wildcards?.[rarity] || 0;

          if (newProgress >= 5) {
            newProgress = 0;
            newWildcards += 1;
          }

          success = true;
          return {
            inventory: newInventory,
            decks: newDecks,
            wildcardProgress: {
              ...(state.wildcardProgress || { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0, MYTHIC: 0 }),
              [rarity]: newProgress
            },
            wildcards: {
              ...(state.wildcards || { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0, MYTHIC: 0 }),
              [rarity]: newWildcards
            }
          };
        });
        if (success) get().updateMissionProgress('mill', 1);
        return success;
      },

      millAllDuplicates: () => {
        let totalMilled = 0;
        set((state) => {
          const newInventory = { ...state.inventory };
          const newDecks = { ...state.decks };
          const newWildcardProgress = { ...(state.wildcardProgress || { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0, MYTHIC: 0 }) };
          const newWildcards = { ...(state.wildcards || { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0, MYTHIC: 0 }) };

          Object.values(state.inventory).forEach(item => {
            if (item.count > 4) {
              const toMill = item.count - 4;
              const rarity = item.card.rarity;

              for (let i = 0; i < toMill; i++) {
                totalMilled++;

                // Update inventory
                const currentItem = newInventory[item.card.id];
                if (currentItem.count > 1) {
                  newInventory[item.card.id] = { ...currentItem, count: currentItem.count - 1 };
                } else {
                  delete newInventory[item.card.id];
                }

                // Update decks
                const currentCount = newInventory[item.card.id]?.count || 0;
                Object.keys(newDecks).forEach(dId => {
                  const deck = newDecks[dId];
                  if (deck.cards[item.card.id] > currentCount) {
                    const dCards = { ...deck.cards };
                    if (currentCount === 0) delete dCards[item.card.id];
                    else dCards[item.card.id] = currentCount;
                    newDecks[dId] = { ...deck, cards: dCards };
                  }
                });

                // Update progress
                newWildcardProgress[rarity] = (newWildcardProgress[rarity] || 0) + 1;
                if (newWildcardProgress[rarity] >= 5) {
                  newWildcardProgress[rarity] = 0;
                  newWildcards[rarity] = (newWildcards[rarity] || 0) + 1;
                }
              }
            }
          });

          return {
            inventory: newInventory,
            decks: newDecks,
            wildcardProgress: newWildcardProgress,
            wildcards: newWildcards
          };
        });

        if (totalMilled > 0) {
          get().updateMissionProgress('mill', totalMilled);
        }
        return totalMilled;
      },

      createDeck: (name) => set((state) => {
        const id = Date.now().toString();
        return {
          decks: {
            ...state.decks,
            [id]: { id, name, cards: {} }
          }
        };
      }),

      deleteDeck: (deckId) => set((state) => {
        const newDecks = { ...state.decks };
        delete newDecks[deckId];
        return { decks: newDecks };
      }),

      addCardToDeck: (deckId, card) => {
        let success = false;
        set((state) => {
          const deck = state.decks[deckId];
          if (!deck) return state;

          const currentDeckCount = Object.values(deck.cards).reduce((a, b) => a + b, 0);
          if (currentDeckCount >= 200) return state;

          const cardInDeck = deck.cards[card.id] || 0;
          if (cardInDeck >= 4) return state;

          const owned = state.inventory[card.id]?.count || 0;
          if (cardInDeck >= owned) return state;

          success = true;
          return {
            decks: {
              ...state.decks,
              [deckId]: {
                ...deck,
                coverArt: deck.coverArt || card.artworkUrl,
                cards: {
                  ...deck.cards,
                  [card.id]: cardInDeck + 1
                }
              }
            }
          };
        });
        return success;
      },

      removeCardFromDeck: (deckId, cardId) => set((state) => {
        const deck = state.decks[deckId];
        if (!deck || !deck.cards[cardId]) return state;

        const newCount = deck.cards[cardId] - 1;
        const newCards = { ...deck.cards };
        if (newCount <= 0) {
          delete newCards[cardId];
        } else {
          newCards[cardId] = newCount;
        }

        return {
          decks: {
            ...state.decks,
            [deckId]: {
              ...deck,
              cards: newCards
            }
          }
        };
      }),

      checkHourlyPacks: () => {
        const state = get();
        const now = new Date();
        const lastChecked = new Date(state.lastFreePackTime || (now.getTime() - (3600 * 1000))); // Default 1 hr ago if null

        // Calculate how many :30 marks have passed
        // We iterate hour by hour from lastChecked to now
        let marksPassed = 0;
        let checkPtr = new Date(lastChecked);
        checkPtr.setSeconds(0, 0);

        // Move checkPtr to the next :30 mark after lastChecked
        if (checkPtr.getMinutes() >= 30) {
          checkPtr.setHours(checkPtr.getHours() + 1);
        }
        checkPtr.setMinutes(30);

        while (checkPtr.getTime() <= now.getTime()) {
          marksPassed++;
          checkPtr.setHours(checkPtr.getHours() + 1);
        }

        if (marksPassed > 0) {
          const newCount = Math.min((state.freePacksCount || 0) + marksPassed, 10);
          set({
            freePacksCount: newCount,
            lastFreePackTime: now.getTime()
          });
        }
      },

      consumeFreePack: (count) => {
        const { freePacksCount } = get();
        if (freePacksCount >= count) {
          set({ freePacksCount: freePacksCount - count });
          get().updateMissionProgress('open_pack', count);
          return true;
        }
        return false;
      },

      checkDailyMissions: () => set((state) => {
        const now = Date.now();
        const lastReset = state.lastMissionResetTime || 0;
        const daysPassed = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));

        if (daysPassed > 0 || !state.dailyMissions || state.dailyMissions.length === 0) {
          const newMissions: Mission[] = [
            { id: 'm1', type: 'open_pack', description: 'Abre 3 sobres', progress: 0, target: 3, reward: 150, completed: false },
            { id: 'm2', type: 'mill', description: 'Muele 5 cartas', progress: 0, target: 5, reward: 100, completed: false },
            { id: 'm3', type: 'craft', description: 'Contrata 1 carta', progress: 0, target: 1, reward: 200, completed: false }
          ];
          return {
            dailyMissions: newMissions,
            lastMissionResetTime: now
          };
        }
        return state;
      }),

      updateMissionProgress: (type, amount) => set((state) => {
        if (!state.dailyMissions) return state;
        const newMissions = state.dailyMissions.map(m => {
          if (m.type === type && !m.completed) {
            const newProgress = Math.min(m.progress + amount, m.target);
            return { ...m, progress: newProgress, completed: newProgress >= m.target };
          }
          return m;
        });
        return { dailyMissions: newMissions };
      }),

      claimMissionReward: (missionId) => set((state) => {
        const mission = state.dailyMissions?.find(m => m.id === missionId);
        if (mission && mission.completed) {
          const newMissions = state.dailyMissions.filter(m => m.id !== missionId);
          return {
            dailyMissions: newMissions,
            regalias: state.regalias + mission.reward
          };
        }
        return state;
      }),

      setLanguage: (lang) => set({ language: lang }),
      setDiscoveryUsername: (username) => set({ discoveryUsername: username }),
      setInventory: (inventory) => set({ inventory }),

      updateRank: (won) => {
        const { rank } = get();
        if (won) {
          const { result, updated } = computeVictory(rank);
          set({ rank: updated });
          if (result.reward) {
            get().addRegalias(result.reward.regalias);
            if (result.reward.wildcardRarity) {
              const rarity = result.reward.wildcardRarity as keyof PlayerState['wildcards'];
              set(state => ({
                wildcards: {
                  ...state.wildcards,
                  [rarity]: state.wildcards[rarity] + 1
                }
              }));
            }
          }
          return result;
        } else {
          const { result, updated } = computeLoss(rank);
          set({ rank: updated });
          return result;
        }
      },

      updateXP: (source, multiplier = 1) => {
        const { level } = get();
        const { result, updated } = computeXPGain(level, source, multiplier);
        set({ level: updated });

        // Grant level rewards
        result.rewards.forEach(({ reward }) => {
          if (reward.regalias) get().addRegalias(reward.regalias);
          if (reward.wildcardRarity) {
            const rarity = reward.wildcardRarity as keyof PlayerState['wildcards'];
            set(state => ({
              wildcards: {
                ...state.wildcards,
                [rarity]: state.wildcards[rarity] + 1
              }
            }));
          }
        });
        return result;
      },
      setHasReceivedInitialPacks: (val) => set({ hasReceivedInitialPacks: val }),
      setIsInBattle: (val) => set({ isInBattle: val }),
      setPlayMusicInBattle: (val) => set({ playMusicInBattle: val }),
      incrementPity: (rarity) => set((state) => ({
        pityCounters: {
          ...state.pityCounters,
          [rarity]: state.pityCounters[rarity] + 1
        }
      })),
      resetPity: (rarity) => set((state) => ({
        pityCounters: {
          ...state.pityCounters,
          [rarity]: 0
        }
      })),
      completeOnboarding: (deckName, cards) => {
        set((state) => {
          const newInventory = { ...state.inventory };
          const newDeckId = Date.now().toString();
          const deckCards: Record<string, number> = {};

          cards.forEach(card => {
            const existing = newInventory[card.id];
            const count = existing ? existing.count : 0;
            if (count < 4) {
              newInventory[card.id] = { card, count: count + 1, obtainedAt: Date.now() };
              deckCards[card.id] = (deckCards[card.id] || 0) + 1;
            }
          });

          return {
            hasCompletedOnboarding: true,
            inventory: newInventory,
            decks: {
              ...state.decks,
              [newDeckId]: {
                id: newDeckId,
                name: deckName,
                coverArt: cards[0]?.artworkUrl,
                cards: deckCards
              }
            },
            wildcards: {
              ...state.wildcards,
              BRONZE: state.wildcards.BRONZE + 5,
              SILVER: state.wildcards.SILVER + 2,
              GOLD: state.wildcards.GOLD + 1
            }
          };
        });
      },

      recalculateInventory: () => {
        const { inventory } = get();
        const { generateCard } = require('@/lib/engine/generator');

        const newInventory = { ...inventory };
        Object.keys(newInventory).forEach(id => {
          const item = newInventory[id];
          // Regeneramos la carta basándonos en su trackId original pero con la lógica nueva
          const updatedCard = generateCard({
            trackId: item.card.id,
            trackName: item.card.name,
            artistName: item.card.artist,
            primaryGenreName: item.card.genre,
            videoId: item.card.videoId,
            trackNumber: item.card.trackNumber
          }, item.card.rarity);

          newInventory[id] = { ...item, card: updatedCard };
        });

        set({ inventory: newInventory });
      },

      resetAll: () => set({
        inventory: {},
        decks: {},
        regalias: 1500,
        wildcards: { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0, MYTHIC: 0 },
        wildcardProgress: { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0, MYTHIC: 0 },
        hasCompletedOnboarding: false,
        hasReceivedInitialPacks: false
      }),

      addChest: (chest) => {
        const { chestQueue, maxChestSlots } = get();
        if (chestQueue.length >= maxChestSlots) return false;
        set({ chestQueue: [...chestQueue, chest] });
        return true;
      },

      startChestUnlock: (chestId) => set((state) => {
        const now = Date.now();
        const chest = state.chestQueue.find(c => c.id === chestId);
        if (!chest || chest.status !== 'LOCKED') return state;

        const isAnyUnlocking = state.chestQueue.some(c => c.status === 'UNLOCKING');
        if (isAnyUnlocking) return state;

        const duration = CHEST_CONFIG[chest.type].duration;
        return {
          chestQueue: state.chestQueue.map(c =>
            c.id === chestId
              ? { ...c, status: 'UNLOCKING' as const, unlocksAt: now + duration, timeRemainingMs: duration }
              : c
          )
        };
      }),

      openChest: (chestId) => {
        const { chestQueue } = get();
        const chest = chestQueue.find(c => c.id === chestId);
        if (!chest || chest.status !== 'READY') return;

        // Give gold
        get().addRegalias(chest.rewards.gold);

        // Give wildcards
        if (chest.rewards.wildcards) {
          set(state => {
            const newWildcards = { ...state.wildcards };
            chest.rewards.wildcards!.forEach(wc => {
              const r = wc.rarity as keyof typeof newWildcards;
              newWildcards[r] = (newWildcards[r] || 0) + wc.count;
            });
            return { wildcards: newWildcards };
          });
        }

        set({
          chestQueue: chestQueue.filter(c => c.id !== chestId)
        });
      },

      accelerateChest: (chestId) => {
        const { chestQueue, premiumGold } = get();
        const chest = chestQueue.find(c => c.id === chestId);
        if (!chest || (chest.status !== 'UNLOCKING' && chest.status !== 'LOCKED')) return;

        if (premiumGold >= chest.accelerateCost) {
          set({
            premiumGold: premiumGold - chest.accelerateCost,
            chestQueue: chestQueue.map(c =>
              c.id === chestId ? { ...c, status: 'READY' as const, timeRemainingMs: 0 } : c
            )
          });
        }
      },

      updateChestTimers: () => set((state) => {
        const now = Date.now();
        let changed = false;
        const newQueue = state.chestQueue.map(c => {
          if (c.status === 'UNLOCKING') {
            const remaining = Math.max(0, c.unlocksAt - now);
            if (remaining === 0) {
              changed = true;
              return { ...c, status: 'READY' as const, timeRemainingMs: 0 };
            }
            if (Math.abs(c.timeRemainingMs - remaining) > 1000) {
              changed = true;
              return { ...c, timeRemainingMs: remaining };
            }
          }
          return c;
        });
        return changed ? { chestQueue: newQueue } : state;
      }),

      setPayingStatus: (val) => set({ isPaying: val, role: val ? UserRole.PAYING : UserRole.FREE }),
      addPremiumGold: (amount) => set(state => ({ premiumGold: (state.premiumGold || 0) + amount })),
      updateFeatureFlag: (flag, enabled) => set((state) => ({
        featureFlags: { ...state.featureFlags, [flag]: enabled }
      })),
      activeStoreTab: 'packs',
      setActiveStoreTab: (tab) => set({ activeStoreTab: tab }),
    }),
    {
      name: 'musictcg-player-storage',
    }
  )
);
