'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlayerStore } from '@/store/usePlayerStore';

// Debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

export default function SupabaseSync() {
  const state = usePlayerStore();
  const isWriting = useRef(false);

  // Effect for setting up listeners and handling initial load
  useEffect(() => {
    let channels: any[] = [];

    const handleUserSetup = async (user: any) => {
      // --- Fetch initial data ---
      const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single();
      const { data: inventoryData } = await supabase.from('inventories').select('*').eq('user_id', user.id).single();
      const { data: decksData } = await supabase.from('decks').select('*').eq('user_id', user.id).single();

      if (userData) {
        isWriting.current = true;
        usePlayerStore.setState({
          regalias: userData.regalias,
          wildcards: userData.wildcards,
          wildcardProgress: userData.wildcard_progress,
          freePacksCount: userData.free_packs_count,
          lastFreePackTime: userData.last_free_pack_time,
          dailyMissions: userData.daily_missions,
          lastMissionResetTime: userData.last_mission_reset_time,
          language: userData.language,
          discoveryUsername: userData.discovery_username,
          hasReceivedInitialPacks: userData.has_received_initial_packs,
          pityCounters: userData.pity_counters,
        });
        setTimeout(() => isWriting.current = false, 100);
      } else {
        // First time login - create the document from default state
        const fullState = usePlayerStore.getState();
        const { inventory, decks, ...profile } = fullState;
        
        const serializableProfile = Object.fromEntries(
          Object.entries(profile).filter(([_, v]) => typeof v !== 'function')
        );

        // Map camelCase to snake_case for Supabase
        await supabase.from('users').upsert({
          id: user.id,
          regalias: serializableProfile.regalias,
          wildcards: serializableProfile.wildcards,
          wildcard_progress: serializableProfile.wildcardProgress,
          free_packs_count: serializableProfile.freePacksCount,
          last_free_pack_time: serializableProfile.lastFreePackTime,
          daily_missions: serializableProfile.dailyMissions,
          last_mission_reset_time: serializableProfile.lastMissionResetTime,
          language: serializableProfile.language,
          discovery_username: serializableProfile.discoveryUsername,
          has_received_initial_packs: serializableProfile.hasReceivedInitialPacks,
          pity_counters: serializableProfile.pityCounters,
        });
        await supabase.from('inventories').upsert({ user_id: user.id, inventory: inventory });
        await supabase.from('decks').upsert({ user_id: user.id, decks: decks });
      }

      if (inventoryData) {
        isWriting.current = true;
        usePlayerStore.setState({ inventory: inventoryData.inventory });
        setTimeout(() => isWriting.current = false, 100);
      }

      if (decksData) {
        isWriting.current = true;
        usePlayerStore.setState({ decks: decksData.decks });
        setTimeout(() => isWriting.current = false, 100);
      }

      // --- Listen for remote changes ---
      const userChannel = supabase.channel('public:users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, payload => {
          const data = payload.new as any;
          if (data) {
            isWriting.current = true;
            usePlayerStore.setState({
              regalias: data.regalias,
              wildcards: data.wildcards,
              wildcardProgress: data.wildcard_progress,
              freePacksCount: data.free_packs_count,
              lastFreePackTime: data.last_free_pack_time,
              dailyMissions: data.daily_missions,
              lastMissionResetTime: data.last_mission_reset_time,
              language: data.language,
              discoveryUsername: data.discovery_username,
              hasReceivedInitialPacks: data.has_received_initial_packs,
              pityCounters: data.pity_counters,
            });
            setTimeout(() => isWriting.current = false, 100);
          }
        }).subscribe();

      const inventoryChannel = supabase.channel('public:inventories')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventories', filter: `user_id=eq.${user.id}` }, payload => {
          const data = payload.new as any;
          if (data) {
            isWriting.current = true;
            usePlayerStore.setState({ inventory: data.inventory });
            setTimeout(() => isWriting.current = false, 100);
          }
        }).subscribe();

      const decksChannel = supabase.channel('public:decks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'decks', filter: `user_id=eq.${user.id}` }, payload => {
          const data = payload.new as any;
          if (data) {
            isWriting.current = true;
            usePlayerStore.setState({ decks: data.decks });
            setTimeout(() => isWriting.current = false, 100);
          }
        }).subscribe();

      channels = [userChannel, inventoryChannel, decksChannel];
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Clean up old listeners
      channels.forEach(channel => supabase.removeChannel(channel));
      channels = [];

      if (session?.user) {
        handleUserSetup(session.user);
      }
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUserSetup(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  //  Effect for syncing local changes TO Supabase
  useEffect(() => {
    if (isWriting.current) return; // Prevent writing state we just received

    const debouncedWrite = debounce(async (currentUser: any, stateToSync: any) => {
        const { inventory, decks, ...profile } = stateToSync;
        
        // Filter out functions
        const userProfile = Object.fromEntries(
          Object.entries(profile).filter(([_, v]) => typeof v !== 'function')
        );

        try {
            await Promise.all([
                supabase.from('users').upsert({
                  id: currentUser.id,
                  regalias: userProfile.regalias,
                  wildcards: userProfile.wildcards,
                  wildcard_progress: userProfile.wildcardProgress,
                  free_packs_count: userProfile.freePacksCount,
                  last_free_pack_time: userProfile.lastFreePackTime,
                  daily_missions: userProfile.dailyMissions,
                  last_mission_reset_time: userProfile.lastMissionResetTime,
                  language: userProfile.language,
                  discovery_username: userProfile.discoveryUsername,
                  has_received_initial_packs: userProfile.hasReceivedInitialPacks,
                  pity_counters: userProfile.pityCounters,
                }),
                supabase.from('inventories').upsert({ user_id: currentUser.id, inventory }),
                supabase.from('decks').upsert({ user_id: currentUser.id, decks })
            ]);
        } catch(error) {
            console.error("Error writing to Supabase:", error);
        }
    }, 2000);

    const unsubStore = usePlayerStore.subscribe(currentState => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user && !isWriting.current) {
             debouncedWrite(session.user, currentState);
          }
        });
    });

    return () => {
        unsubStore();
    }

  }, []);

  return null;
}
