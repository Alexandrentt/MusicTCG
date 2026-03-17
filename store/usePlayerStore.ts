import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CardData } from '@/lib/engine/generator';

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
  };
  wildcardProgress: {
    BRONZE: number;
    SILVER: number;
    GOLD: number;
    PLATINUM: number;
  };
  inventory: Record<string, { card: CardData; count: number }>;
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

  // Actions
  addRegalias: (amount: number) => void;
  spendRegalias: (amount: number) => boolean;
  addCard: (card: CardData) => { added: boolean; convertedToWildcard: boolean };
  addCards: (cards: CardData[]) => { added: number; converted: number };
  craftCard: (card: CardData) => boolean;
  /**
   * Muele una carta del inventario.
   * Si la carta llega a 0 copias, se elimina del inventario y de todos los mazos.
   * Aumenta el progreso del comodín de la rareza correspondiente.
   * Si el progreso llega a 5, se otorga un comodín y se reinicia el progreso.
   */
  millCard: (cardId: string) => boolean;
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
  setLanguage: (lang: string) => void;
  setDiscoveryUsername: (username: string) => void;
  setHasReceivedInitialPacks: (val: boolean) => void;
  setIsInBattle: (val: boolean) => void;
  setPlayMusicInBattle: (val: boolean) => void;
  incrementPity: (rarity: 'GOLD' | 'PLATINUM') => void;
  resetPity: (rarity: 'GOLD' | 'PLATINUM') => void;
  completeOnboarding: (deckName: string, cards: CardData[]) => void;
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
      },
      wildcardProgress: {
        BRONZE: 0,
        SILVER: 0,
        GOLD: 0,
        PLATINUM: 0,
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
      },

      addRegalias: (amount) => set((state) => ({ regalias: state.regalias + amount })),

      spendRegalias: (amount) => {
        const { regalias } = get();
        if (regalias >= amount) {
          set({ regalias: regalias - amount });
          return true;
        }
        return false;
      },

      addCard: (card) => {
        let result = { added: false, convertedToWildcard: false };
        set((state) => {
          const existing = state.inventory[card.id];
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
                [card.id]: { card, count: count + 1 }
              }
            };
          }
        });
        return result;
      },

      addCards: (cards) => {
        let added = 0;
        let converted = 0;
        cards.forEach(card => {
          const res = get().addCard(card);
          if (res.added) added++;
          if (res.convertedToWildcard) converted++;
        });
        return { added, converted };
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
              [card.id]: { card, count: count + 1 }
            }
          }));
          get().updateMissionProgress('craft', 1);
          return true;
        }
        return false;
      },

      millCard: (cardId) => {
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
              ...(state.wildcardProgress || { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 }),
              [rarity]: newProgress
            },
            wildcards: {
              ...(state.wildcards || { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 }),
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
          const newWildcardProgress = { ...(state.wildcardProgress || { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 }) };
          const newWildcards = { ...(state.wildcards || { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 }) };

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
                coverArt: deck.coverArt || card.artUrl,
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

      checkHourlyPacks: () => set((state) => {
        const now = Date.now();
        const lastTime = state.lastFreePackTime || now;
        const hoursPassed = Math.floor((now - lastTime) / (1000 * 60 * 60));

        if (hoursPassed > 0) {
          const newCount = Math.min((state.freePacksCount || 0) + hoursPassed, 10);
          return {
            freePacksCount: newCount,
            lastFreePackTime: lastTime + (hoursPassed * 1000 * 60 * 60)
          };
        }
        return state;
      }),

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
              newInventory[card.id] = { card, count: count + 1 };
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
                coverArt: cards[0]?.artUrl,
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
    }),
    {
      name: 'musictcg-player-storage',
    }
  )
);
