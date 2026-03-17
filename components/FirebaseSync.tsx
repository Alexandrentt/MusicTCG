'use client';

import { useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot, DocumentData } from 'firebase/firestore';
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

export default function FirebaseSync() {
  const state = usePlayerStore();
  const isWriting = useRef(false);

  // Effect for setting up listeners and handling initial load
  useEffect(() => {
    let unsubscribers: (() => void)[] = [];

    const handleUserSetup = (user: User) => {
      const userRef = doc(db, 'users', user.uid);
      const inventoryRef = doc(db, 'inventories', user.uid);
      const decksRef = doc(db, 'decks', user.uid);

      // --- Listen for remote changes ---
      const onUserSnapshot = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          isWriting.current = true; // Prevent feedback loop
          usePlayerStore.setState({
            regalias: data.regalias,
            wildcards: data.wildcards,
            wildcardProgress: data.wildcardProgress,
            freePacksCount: data.freePacksCount,
            lastFreePackTime: data.lastFreePackTime,
            dailyMissions: data.dailyMissions,
            lastMissionResetTime: data.lastMissionResetTime,
            language: data.language,
            discoveryUsername: data.discoveryUsername,
            hasReceivedInitialPacks: data.hasReceivedInitialPacks,
            pityCounters: data.pityCounters,
          });
          setTimeout(() => isWriting.current = false, 100); 
        } else {
           // First time login - create the document from default state
           const fullState = usePlayerStore.getState();
           const { inventory, decks, ...profile } = fullState;
           
           // Filter out functions from profile
           const serializableProfile = Object.fromEntries(
             Object.entries(profile).filter(([_, v]) => typeof v !== 'function')
           );

           setDoc(userRef, { uid: user.uid, ...serializableProfile });
           setDoc(inventoryRef, { uid: user.uid, inventory: inventory });
           setDoc(decksRef, { uid: user.uid, decks: decks });
        }
      });

      const onInventorySnapshot = onSnapshot(inventoryRef, (snapshot) => {
         if (snapshot.exists()) {
            isWriting.current = true;
            usePlayerStore.setState({ inventory: snapshot.data().inventory });
            setTimeout(() => isWriting.current = false, 100);
         }
      });

      const onDecksSnapshot = onSnapshot(decksRef, (snapshot) => {
        if (snapshot.exists()) {
            isWriting.current = true;
            usePlayerStore.setState({ decks: snapshot.data().decks });
            setTimeout(() => isWriting.current = false, 100);
        }
      });

      unsubscribers = [onUserSnapshot, onInventorySnapshot, onDecksSnapshot];
    };

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      // Clean up old listeners
      unsubscribers.forEach(unsub => unsub());
      unsubscribers = [];

      if (user) {
        handleUserSetup(user);
      } else {
        // User is signed out, maybe clear local state or handle guest data
      }
    });

    return () => {
      authUnsubscribe();
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  //  Effect for syncing local changes TO firestore
  useEffect(() => {
    if (isWriting.current) return; // Prevent writing state we just received

    const debouncedWrite = debounce(async (currentUser: User, stateToSync: DocumentData) => {
        const { inventory, decks, ...profile } = stateToSync;
        
        // Filter out functions
        const userProfile = Object.fromEntries(
          Object.entries(profile).filter(([_, v]) => typeof v !== 'function')
        );

        const userRef = doc(db, 'users', currentUser.uid);
        const inventoryRef = doc(db, 'inventories', currentUser.uid);
        const decksRef = doc(db, 'decks', currentUser.uid);

        try {
            await Promise.all([
                setDoc(userRef, userProfile , { merge: true }),
                setDoc(inventoryRef, { inventory }, { merge: true }),
                setDoc(decksRef, { decks }, { merge: true })
            ]);
        } catch(error) {
            console.error("Error writing to Firestore:", error);
        }
    }, 2000);

    const unsubStore = usePlayerStore.subscribe(currentState => {
        const user = auth.currentUser;
        if (user && !isWriting.current) {
           debouncedWrite(user, currentState);
        }
    });

    return () => {
        unsubStore();
    }

  }, []);

  return null;
}
