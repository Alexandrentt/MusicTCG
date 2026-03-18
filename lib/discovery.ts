import { db } from './firebase';
import { collection, doc, setDoc, getDoc, serverTimestamp, query, orderBy, limit, getDocs, deleteDoc } from 'firebase/firestore';
import { CardData } from './engine/generator';

export async function logDiscovery(card: CardData, discovererName: string = 'Anonymous') {
  try {
    const discoveryRef = doc(db, 'discovered_songs', card.id);
    const docSnap = await getDoc(discoveryRef);

    if (!docSnap.exists()) {
      await setDoc(discoveryRef, {
        ...card,
        discoveredBy: discovererName,
        discoveredAt: serverTimestamp(),
        timesFound: 1
      });
    } else {
      // Increment times found
      await setDoc(discoveryRef, {
        timesFound: (docSnap.data().timesFound || 1) + 1
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error logging discovery:', error);
  }
}

export async function getRecentDiscoveries(count: number = 20) {
  try {
    const q = query(
      collection(db, 'discovered_songs'),
      orderBy('discoveredAt', 'desc'),
      limit(count)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting recent discoveries:', error);
    return [];
  }
}

export async function getGlobalStats() {
  try {
    const querySnapshot = await getDocs(collection(db, 'discovered_songs'));
    const total = querySnapshot.size;
    let totalTimesFound = 0;
    const rarityCounts: Record<string, number> = {
      COMMON: 0,
      UNCOMMON: 0,
      RARE: 0,
      GOLD: 0,
      PLATINUM: 0
    };

    querySnapshot.forEach(doc => {
      const data = doc.data();
      totalTimesFound += (data.timesFound || 1);
      if (data.rarity && rarityCounts[data.rarity] !== undefined) {
        rarityCounts[data.rarity]++;
      }
    });

    return {
      totalUnique: total,
      totalDiscoveries: totalTimesFound,
      rarityCounts
    };
  } catch (error) {
    return null;
  }
}

/**
 * Resetea todos los descubrimientos globales (Admin Only).
 */
export async function resetGlobalDiscoveries() {
  try {
    const querySnapshot = await getDocs(collection(db, 'discovered_songs'));
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    console.log('Global discoveries reset successfully.');
  } catch (error) {
    console.error('Error resetting global discoveries:', error);
  }
}
