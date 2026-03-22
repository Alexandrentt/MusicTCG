

### Solución: Nuevo hook `hooks/useAuth.ts`

Crear este archivo nuevo:

```typescript
// hooks/useAuth.ts
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export interface AuthProfile {
  user: User | null;
  username: string;
  isAdmin: boolean;
  role: 'ADMIN' | 'PAYING' | 'FREE';
  isPaying: boolean;
  loading: boolean;
}

export function useAuth(): AuthProfile {
  const [user, setUser]         = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin]   = useState(false);
  const [role, setRole]         = useState<'ADMIN' | 'PAYING' | 'FREE'>('FREE');
  const [isPaying, setIsPaying] = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const loadProfile = async (u: User) => {
      const { data } = await supabase
        .from('users')
        .select('username, is_admin, role, is_paying')
        .eq('id', u.id)
        .maybeSingle();

      if (data) {
        setUsername(data.username || u.user_metadata?.username || '');
        setIsAdmin(data.is_admin ?? false);
        setRole(data.role ?? 'FREE');
        setIsPaying(data.is_paying ?? false);
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user);
      } else {
        setUser(null);
        setUsername('');
        setIsAdmin(false);
        setRole('FREE');
        setIsPaying(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, username, isAdmin, role, isPaying, loading };
}
```

---

## FEATURE 3: Solo el admin puede asignar canciones míticas

### Parte A: Servicio `lib/admin/mythicService.ts`

Crear este archivo nuevo:

```typescript
// lib/admin/mythicService.ts
import { supabase } from '@/lib/supabase';

export interface MythicSong {
  trackId: string;
  trackName: string;
  artistName: string;
  reason?: string;
}

/**
 * Agrega una canción como mítica. Solo funciona si el usuario es admin.
 * El RLS de Supabase lo bloquea si no lo es.
 */
export async function addMythicSong(song: MythicSong): Promise<{ success: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: 'No autenticado' };

  // Verificar admin en cliente (el RLS lo verifica también en servidor)
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Sin permisos de administrador' };
  }

  const { error } = await supabase.from('mythic_songs').insert({
    track_id:    song.trackId,
    track_name:  song.trackName,
    artist_name: song.artistName,
    reason:      song.reason || '',
    added_by:    session.user.id,
  });

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Esta canción ya es mítica' };
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function removeMythicSong(trackId: string): Promise<{ success: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: 'No autenticado' };

  const { error } = await supabase
    .from('mythic_songs')
    .delete()
    .eq('track_id', trackId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getMythicSongs(): Promise<MythicSong[]> {
  const { data, error } = await supabase
    .from('mythic_songs')
    .select('track_id, track_name, artist_name, reason')
    .order('added_at', { ascending: false });

  if (error || !data) return [];
  return data.map(row => ({
    trackId:    row.track_id,
    trackName:  row.track_name,
    artistName: row.artist_name,
    reason:     row.reason,
  }));
}

/**
 * Verifica si un track_id específico es mítico.
 * Usar en el generador de cartas para forzar rareza MYTHIC.
 */
export async function isMythicSong(trackId: string): Promise<boolean> {
  const { data } = await supabase
    .from('mythic_songs')
    .select('track_id')
    .eq('track_id', trackId)
    .maybeSingle();
  return !!data;
}

// Cache en memoria para no hacer una query por cada carta generada
let mythicCache: Set<string> | null = null;
let cacheExpiry = 0;

export async function getMythicTrackIds(): Promise<Set<string>> {
  const now = Date.now();
  if (mythicCache && now < cacheExpiry) return mythicCache;

  const { data } = await supabase
    .from('mythic_songs')
    .select('track_id');

  mythicCache = new Set((data || []).map(r => r.track_id));
  cacheExpiry = now + 5 * 60 * 1000; // Cache 5 minutos
  return mythicCache;
}
```

### Parte B: Modificar `lib/engine/generator.ts` para respetar míticas

En `lib/engine/generator.ts`, modificar la función `generateCard` para aceptar un Set de IDs míticos.

Buscar:
```typescript
export function generateCard(track: any, forcedRarity?: CardRarity, youtubeData?: any): CardData {
```

Reemplazar con:
```typescript
export function generateCard(
  track: any,
  forcedRarity?: CardRarity,
  youtubeData?: any,
  mythicTrackIds?: Set<string>
): CardData {
```

Luego, justo después de la línea donde se define `masterRarity`:
```typescript
  let masterRarity: CardRarity = 'BRONZE';
  const rarityRoll = masterRandom();
  if (rarityRoll > 0.999) masterRarity = 'MYTHIC';
  // ... resto
```

Agregar **antes** del bloque de rarityRoll:
```typescript
  // Si el admin marcó esta canción como mítica, siempre es MYTHIC
  const trackIdStr = String(track.trackId || '');
  if (mythicTrackIds?.has(trackIdStr)) {
    masterRarity = 'MYTHIC';
  } else {
    // Lógica original de rareza
    const rarityRoll = masterRandom();
    if (rarityRoll > 0.999) masterRarity = 'MYTHIC';
    else if (rarityRoll > 0.95) masterRarity = 'PLATINUM';
    else if (rarityRoll > 0.8)  masterRarity = 'GOLD';
    else if (rarityRoll > 0.5)  masterRarity = 'SILVER';
  }
```

**IMPORTANTE**: Eliminar la línea `if (rarityRoll > 0.999) masterRarity = 'MYTHIC';` original para no duplicarla.

### Parte C: Panel de admin para míticas en `app/profile/page.tsx`

Dentro del bloque `{(role === 'ADMIN' || user?.email === 'admin@musictcg.com') && (...)}`, agregar una sección nueva al final:

```typescript
// Importar al inicio del archivo:
// import { addMythicSong, removeMythicSong, getMythicSongs, MythicSong } from '@/lib/admin/mythicService';

// Estado adicional (agregar junto a los otros useState):
const [mythicSongs, setMythicSongs]     = useState<MythicSong[]>([]);
const [mythicSearch, setMythicSearch]   = useState('');
const [mythicResults, setMythicResults] = useState<any[]>([]);
const [addingMythic, setAddingMythic]   = useState(false);

// Cargar míticas al montar (agregar en el useEffect principal):
// getMythicSongs().then(setMythicSongs);

// Sección a agregar dentro del panel admin:
<div className="mt-6 border-t border-red-500/20 pt-6">
  <h4 className="text-sm font-black text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
    <Sparkles className="w-4 h-4" /> Canciones Míticas
  </h4>

  {/* Buscador */}
  <div className="flex gap-2 mb-4">
    <input
      type="text"
      placeholder="Busca una canción para hacerla mítica..."
      value={mythicSearch}
      onChange={e => setMythicSearch(e.target.value)}
      className="flex-1 bg-black/40 border border-red-500/30 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-400"
      onKeyDown={async e => {
        if (e.key !== 'Enter' || !mythicSearch.trim()) return;
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(mythicSearch)}&entity=song&limit=5`);
        const d = await res.json();
        setMythicResults(d.results || []);
      }}
    />
    <button
      onClick={async () => {
        if (!mythicSearch.trim()) return;
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(mythicSearch)}&entity=song&limit=5`);
        const d = await res.json();
        setMythicResults(d.results || []);
      }}
      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold"
    >
      Buscar
    </button>
  </div>

  {/* Resultados de búsqueda */}
  {mythicResults.map(track => (
    <div key={track.trackId} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 mb-2">
      <img src={track.artworkUrl100} alt="" className="w-10 h-10 rounded object-cover" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{track.trackName}</p>
        <p className="text-xs text-gray-400 truncate">{track.artistName}</p>
      </div>
      <button
        disabled={addingMythic}
        onClick={async () => {
          setAddingMythic(true);
          const result = await addMythicSong({
            trackId:    String(track.trackId),
            trackName:  track.trackName,
            artistName: track.artistName,
            reason:     'Admin designation',
          });
          if (result.success) {
            toast.success(`"${track.trackName}" ahora es MÍTICA ✨`);
            const updated = await getMythicSongs();
            setMythicSongs(updated);
            setMythicResults([]);
            setMythicSearch('');
          } else {
            toast.error(result.error || 'Error al agregar');
          }
          setAddingMythic(false);
        }}
        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-black"
      >
        MÍTICA ✨
      </button>
    </div>
  ))}

  {/* Lista de míticas actuales */}
  <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">
      Canciones míticas actuales ({mythicSongs.length})
    </p>
    {mythicSongs.map(song => (
      <div key={song.trackId} className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
        <div>
          <p className="text-sm font-bold text-purple-300">{song.trackName}</p>
          <p className="text-xs text-gray-500">{song.artistName}</p>
        </div>
        <button
          onClick={async () => {
            const result = await removeMythicSong(song.trackId);
            if (result.success) {
              toast.success('Rareza mítica removida');
              setMythicSongs(prev => prev.filter(s => s.trackId !== song.trackId));
            } else {
              toast.error(result.error || 'Error');
            }
          }}
          className="text-red-400 hover:text-red-300 text-xs font-bold"
        >
          Quitar
        </button>
      </div>
    ))}
    {mythicSongs.length === 0 && (
      <p className="text-xs text-gray-600 italic">No hay canciones míticas designadas aún.</p>
    )}
  </div>
</div>
```

---

## FEATURE 4: Orden más reciente primero en la colección

### Problema
El inventario se almacena como un Record y no tiene timestamp de obtención.

### Solución: Modificar la función `addCard` en `store/usePlayerStore.ts`

Buscar el tipo `PlayerState` (la interfaz, no la del juego):
```typescript
inventory: Record<string, { card: CardData; count: number }>;
```
Reemplazar con:
```typescript
inventory: Record<string, { card: CardData; count: number; obtainedAt: number }>;
```

Buscar la función `addCard` en el store, dentro del bloque `set`:
```typescript
return {
  inventory: {
    ...state.inventory,
    [targetCardId]: { card: existing ? existing.card : card, count: count + 1 }
  }
};
```
Reemplazar con:
```typescript
return {
  inventory: {
    ...state.inventory,
    [targetCardId]: {
      card: existing ? existing.card : card,
      count: count + 1,
      obtainedAt: existing?.obtainedAt ?? Date.now(), // Preserva el original si ya existe
    }
  }
};
```

Hacer lo mismo en `addCards` para el `newInventory[targetId] = ...`:
```typescript
newInventory[targetId] = {
  card: existing ? existing.card : card,
  count: count + 1,
  obtainedAt: existing?.obtainedAt ?? Date.now(),
};
```

### Modificar el filtrado en `app/studio/page.tsx`

Buscar `filteredInventory` (el `useMemo`):
```typescript
const filteredInventory = useMemo(() => {
  return inventoryList.filter((item) => {
    // ...filtros
  });
}, [...]);
```

Reemplazar con:
```typescript
const filteredInventory = useMemo(() => {
  return inventoryList
    .filter((item) => {
      const query = globalSearchQuery.toLowerCase();
      const matchesSearch =
        item.card.name.toLowerCase().includes(query) ||
        item.card.artist.toLowerCase().includes(query);
      const matchesRarity = rarityFilter === 'all' || item.card.rarity === rarityFilter;
      const matchesGenre  = genreFilter  === 'all' || item.card.genre.toLowerCase() === genreFilter.toLowerCase();
      const matchesCost   = costFilter   === 'all' || item.card.cost === parseInt(costFilter);
      return matchesSearch && matchesRarity && matchesGenre && matchesCost;
    })
    // Más reciente primero
    .sort((a, b) => (b.obtainedAt ?? 0) - (a.obtainedAt ?? 0));
}, [inventoryList, globalSearchQuery, rarityFilter, genreFilter, costFilter]);
```

---

## FEATURE 5: Modal de apertura unificado (Tienda = Sobres Gratis)

El modal de la tienda actual tiene animación de "abanico" y el de sobres gratis tiene un "grid".
Vamos a unificarlos: **siempre grid**, con el flip de carta individual.

### Paso A: Crear componente `components/store/PackOpenModal.tsx`

Crear este archivo nuevo:

```typescript
// components/store/PackOpenModal.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, ChevronRight } from 'lucide-react';
import { CardData } from '@/lib/engine/generator';
import Card from '@/components/cards/Card';
import CardBack from '@/components/CardBack';

export interface OpenedCardItem {
  card: CardData;
  isDuplicate: boolean;
  revealed: boolean;
}

interface PackOpenModalProps {
  cards: OpenedCardItem[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  onRevealCard: (index: number) => void;
  onRevealAll: () => Promise<void>;
  isRevealingAll?: boolean;
}

function FlipCard({
  item,
  index,
  onReveal,
}: {
  item: OpenedCardItem;
  index: number;
  onReveal: (i: number) => void;
}) {
  const isRare = item.card.rarity === 'GOLD' || item.card.rarity === 'PLATINUM' || item.card.rarity === 'MYTHIC';
  const isMythic = item.card.rarity === 'MYTHIC';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, y: 40 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 280, damping: 22 }}
      className="relative perspective-1000 cursor-pointer shrink-0"
      onClick={() => !item.revealed && onReveal(index)}
    >
      {/* Aura mítica */}
      {isMythic && item.revealed && (
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -inset-3 rounded-2xl blur-lg pointer-events-none z-0"
          style={{ background: 'rgba(168,85,247,0.5)' }}
        />
      )}

      {/* Contenedor 3D */}
      <div
        className="preserve-3d transition-all duration-700 relative z-10"
        style={{
          transform: item.revealed ? 'rotateY(0deg)' : 'rotateY(180deg)',
          width: 'clamp(130px, 28vw, 200px)',
          aspectRatio: '2.5 / 3.5',
        }}
      >
        {/* Frente */}
        <div className="absolute inset-0 backface-hidden rounded-xl overflow-hidden">
          <Card data={item.card} className="w-full h-full" disableHover={!item.revealed} />
          {item.isDuplicate && (
            <div className="absolute top-2 right-2 bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full z-20 border border-black shadow-lg">
              +COMODÍN
            </div>
          )}
        </div>

        {/* Reverso */}
        <div
          className="absolute inset-0 backface-hidden rounded-xl overflow-hidden"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <CardBack className="w-full h-full" isRare={isRare} size="full" />
          {!item.revealed && (
            <div className="absolute inset-0 flex items-end justify-center pb-3">
              <span className="text-[9px] text-white/60 font-black uppercase tracking-widest animate-pulse">
                Toca para revelar
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Aura de rareza post-reveal */}
      {isRare && !isMythic && item.revealed && (
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -inset-1 rounded-xl blur-sm pointer-events-none z-0"
          style={{
            background: item.card.rarity === 'PLATINUM'
              ? 'rgba(0,255,255,0.25)'
              : 'rgba(255,215,0,0.25)',
          }}
        />
      )}
    </motion.div>
  );
}

export default function PackOpenModal({
  cards,
  isOpen,
  onClose,
  title = '¡Cartas Obtenidas!',
  subtitle,
  onRevealCard,
  onRevealAll,
  isRevealingAll = false,
}: PackOpenModalProps) {
  const allRevealed = cards.length > 0 && cards.every(c => c.revealed);

  // Auto-revelar no-Platinum al abrir
  // Las PLATINUM y MYTHIC se revelan manualmente para el drama
  return (
    <AnimatePresence>
      {isOpen && cards.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex flex-col bg-black/97 backdrop-blur-2xl overflow-hidden"
        >
          {/* Partículas de fondo */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-0.5 h-0.5 bg-white/10 rounded-full"
                style={{
                  left: `${(i * 13.7) % 100}%`,
                  top:  `${(i * 17.3) % 100}%`,
                }}
              />
            ))}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden relative z-10">
            {/* Header */}
            <div className="shrink-0 text-center pt-6 pb-3 px-4">
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-2xl font-black text-white tracking-tighter italic uppercase"
              >
                🎁 {title}
              </motion.h2>
              {subtitle && (
                <p className="text-gray-500 text-xs mt-1 font-bold uppercase tracking-widest">
                  {subtitle}
                </p>
              )}
              <p className="text-gray-600 text-xs mt-1">
                {allRevealed
                  ? `✅ ${cards.length} cartas reveladas`
                  : `Toca cada carta · ${cards.filter(c => c.revealed).length}/${cards.length} reveladas`}
              </p>
            </div>

            {/* Grid de cartas */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
              <div className="flex flex-wrap gap-3 justify-center py-4">
                {cards.map((item, i) => (
                  <FlipCard
                    key={`${item.card.id}_${i}`}
                    item={item}
                    index={i}
                    onReveal={onRevealCard}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 p-5 pb-24 border-t border-white/5 flex flex-col gap-3 bg-black/90 backdrop-blur-xl sticky bottom-0 z-[600]">
              {!allRevealed && (
                <button
                  onClick={onRevealAll}
                  disabled={isRevealingAll}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  {isRevealingAll ? 'Revelando...' : 'Revelar Todo'}
                </button>
              )}
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={onClose}
                className="w-full bg-white text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] uppercase tracking-tighter text-sm border-2 border-white/10 flex items-center justify-center gap-2"
              >
                {allRevealed ? 'CONTINUAR' : 'OMITIR Y CONTINUAR'}
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Paso B: Reemplazar el modal en `app/store/page.tsx`

**1. Agregar import al inicio:**
```typescript
import PackOpenModal, { OpenedCardItem } from '@/components/store/PackOpenModal';
```

**2. Cambiar el estado de `openedCards`:**
```typescript
// ANTES:
const [openedCards, setOpenedCards] = useState<{ card: CardData; isDuplicate: boolean; revealed: boolean }[]>([]);

// DESPUÉS (mismo tipo pero importado):
const [openedCards, setOpenedCards] = useState<OpenedCardItem[]>([]);
```

**3. Eliminar el componente `PackCard` interno** (las ~80 líneas de la función `PackCard` que está dentro de `StorePage`). Ya no se usa.

**4. Reemplazar la sección de "FASE 2: Muestra las cartas en Abanico"** dentro del modal de apertura.

Buscar todo el bloque desde `{packPhase === 'cards' && (` hasta su cierre `)}` y reemplazar con:

```typescript
{/* El modal de apertura ahora usa el componente unificado */}
<PackOpenModal
  cards={openedCards}
  isOpen={isOpening && packPhase === 'cards'}
  onClose={closeOpening}
  title={`${openedCards.length} Cartas Obtenidas`}
  subtitle={currentPack ? `Sobre ${currentPack.emoji} ${currentPack.nameKey}` : undefined}
  onRevealCard={(i) => {
    setOpenedCards(prev => prev.map((c, idx) => idx === i ? { ...c, revealed: true } : c));
  }}
  onRevealAll={async () => {
    setRevealingAll(true);
    for (let i = 0; i < openedCards.length; i++) {
      setOpenedCards(prev => prev.map((c, idx) => idx === i ? { ...c, revealed: true } : c));
      await new Promise(r => setTimeout(r, 120));
    }
    setRevealingAll(false);
  }}
  isRevealingAll={revealingAll}
/>
```

**5. Mantener la FASE 1 del sobre** (la animación del sobre sacudiéndose). Solo reemplazar la fase 2.

**6. Quitar el `selectedCard` overlay** del store (el modal de inspección individual) o dejarlo, según preferencia. No afecta la apertura.

### Paso C: Reemplazar el modal en `app/page.tsx` (sobres gratis)

El modal de sobres gratis ya usa un sistema parecido. Reemplazarlo con el componente unificado.

**1. Agregar import:**
```typescript
import PackOpenModal, { OpenedCardItem } from '@/components/store/PackOpenModal';
```

**2. Cambiar el estado:**
```typescript
// ANTES:
const [openedCards, setOpenedCards] = useState<{ card: CardData; isDuplicate: boolean }[]>([]);
const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());

// DESPUÉS (un solo array con el flag revealed):
const [openedCards, setOpenedCards] = useState<OpenedCardItem[]>([]);
```

**3. Adaptar `handleOpenFreePacks`:**
Buscar:
```typescript
const results = newCards.map((card: CardData) => {
  const r = usePlayerStore.getState().addCard(card);
  // ...
  return { card, isDuplicate: r.convertedToWildcard };
});
setRevealedSet(new Set(results.map((r, idx) => (r.card.rarity !== 'PLATINUM' ? idx : -1)).filter(idx => idx !== -1)));
setOpenedCards(results);
```
Reemplazar con:
```typescript
const results: OpenedCardItem[] = newCards.map((card: CardData) => {
  const r = usePlayerStore.getState().addCard(card);
  logDiscovery(card, playerName);
  // Auto-revelar todo excepto PLATINUM y MYTHIC
  const autoReveal = card.rarity !== 'PLATINUM' && card.rarity !== 'MYTHIC';
  return { card, isDuplicate: r.convertedToWildcard, revealed: autoReveal };
});
setOpenedCards(results);
```

**4. Reemplazar el bloque del modal completo** (el `AnimatePresence` grande) con:
```typescript
<PackOpenModal
  cards={openedCards}
  isOpen={isOpening}
  onClose={() => { setIsOpening(false); setOpenedCards([]); }}
  title={`${openedCards.length} Cartas Gratis`}
  onRevealCard={(i) => {
    setOpenedCards(prev => prev.map((c, idx) => idx === i ? { ...c, revealed: true } : c));
  }}
  onRevealAll={async () => {
    for (let i = 0; i < openedCards.length; i++) {
      setOpenedCards(prev => prev.map((c, idx) => idx === i ? { ...c, revealed: true } : c));
      await new Promise(r => setTimeout(r, 100));
    }
  }}
/>
```

---

## FEATURE 6: Pestaña de perfil cuando el usuario está logueado

### Solución: Añadir estado `activeProfileTab` en `app/profile/page.tsx`

Al inicio del componente, agregar:
```typescript
const [activeProfileTab, setActiveProfileTab] = useState<'cuenta' | 'stats' | 'historial'>('cuenta');
```

Reemplazar el contenido de la sección de perfil logueado. Buscar el bloque que empieza con `{!user ? (` y dentro del bloque del usuario autenticado (`else`), antes del botón de cerrar sesión, agregar el sistema de tabs:

```typescript
{user && (
  <div className="flex flex-col gap-6 w-full">
    {/* Tab bar del perfil */}
    <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl">
      {(['cuenta', 'stats', 'historial'] as const).map(tab => (
        <button
          key={tab}
          onClick={() => setActiveProfileTab(tab)}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeProfileTab === tab
              ? 'bg-white text-black shadow-lg'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {tab === 'cuenta' ? '👤 Cuenta' : tab === 'stats' ? '📊 Stats' : '🏆 Historial'}
        </button>
      ))}
    </div>

    {/* Tab: Cuenta */}
    {activeProfileTab === 'cuenta' && (
      <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300">
        {/* Avatar e info */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="w-16 h-16 bg-[#242424] rounded-full flex items-center justify-center border-2 border-white/20 text-2xl font-black text-white overflow-hidden relative">
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{(user.user_metadata?.username || user.email || '?')[0].toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="font-black text-white text-lg">{user.user_metadata?.username || discoveryUsername || user.email?.split('@')[0]}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                role === 'ADMIN'   ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                role === 'PAYING' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                    'bg-white/5 text-gray-500 border border-white/10'
              }`}>
                {role}
              </span>
              {isPaying && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  Sin Anuncios
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Regalías y wildcards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1">Regalías</p>
            <p className="text-2xl font-black text-amber-300">{regalias.toLocaleString()} ✦</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Cartas</p>
            <p className="text-2xl font-black text-blue-300">{mounted ? Object.keys(usePlayerStore.getState().inventory || {}).length : '—'}</p>
          </div>
        </div>

        {/* Botón cerrar sesión */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            toast.success('Sesión cerrada.');
          }}
          className="w-full py-3 rounded-full font-bold flex items-center justify-center gap-2 bg-[#242424] text-white hover:bg-[#333] transition-colors border border-white/10"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </div>
    )}

    {/* Tab: Stats */}
    {activeProfileTab === 'stats' && (
      <div className="flex flex-col gap-4 animate-in fade-in duration-300">
        <StatsPanel userId={user.id} />
      </div>
    )}

    {/* Tab: Historial */}
    {activeProfileTab === 'historial' && (
      <div className="flex flex-col gap-4 animate-in fade-in duration-300">
        <MatchHistory userId={user.id} />
      </div>
    )}
  </div>
)}
```

**Importar `StatsPanel`** al inicio de `app/profile/page.tsx`:
```typescript
import { StatsPanel } from '@/components/StatsPanel';
```

---

## FEATURE 7: Miniaturas de ejemplo en la tienda (pre-apertura)

Las tarjetas de sobres ya muestran el Pack visual. Vamos a agregar una fila de "cartas ejemplo" debajo de cada sobre.

### Modificar las tarjetas de sobres en `app/store/page.tsx`

Dentro del bloque de renderizado de cada pack (el `map` de `PACK_TYPES`), buscar la sección del botón de compra y ANTES de los botones, agregar:

```typescript
{/* Cartas ejemplo del género */}
<div className="relative z-10">
  <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-2">
    Ejemplo de cartas
  </p>
  <div className="flex gap-1.5 overflow-hidden">
    {[...Array(3)].map((_, i) => {
      // Generamos cartas de ejemplo determinísticas para este tipo de sobre
      const rarities = ['BRONZE', 'SILVER', pack.id === 'legends' ? 'PLATINUM' : pack.id === 'hiphop' ? 'GOLD' : 'SILVER'];
      const rarity = rarities[i];
      const rarityColors: Record<string, string> = {
        BRONZE:   'border-[#cd7f32]/40 bg-[#cd7f32]/10',
        SILVER:   'border-[#c0c0c0]/40 bg-[#c0c0c0]/10',
        GOLD:     'border-[#ffd700]/50 bg-[#ffd700]/10',
        PLATINUM: 'border-cyan-400/60 bg-cyan-400/10',
      };
      return (
        <div
          key={i}
          className={`flex-1 aspect-[2.5/3.5] rounded-lg border-2 ${rarityColors[rarity] || rarityColors.BRONZE} flex flex-col items-center justify-center relative overflow-hidden`}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
          <div className="w-4 h-4 rounded-full bg-white/10 mb-1" />
          <div className="w-8 h-1 bg-white/10 rounded mb-0.5" />
          <div className="w-6 h-1 bg-white/5 rounded" />
          <div className={`absolute bottom-1 left-0 right-0 text-center text-[6px] font-black uppercase tracking-wider ${
            rarity === 'PLATINUM' ? 'text-cyan-400/60' :
            rarity === 'GOLD'     ? 'text-yellow-400/60' :
            rarity === 'SILVER'   ? 'text-gray-300/60' :
                                    'text-orange-600/60'
          }`}>
            {rarity}
          </div>
        </div>
      );
    })}
  </div>
</div>
```

---

## RESUMEN FINAL

### Archivos a CREAR (nuevos):
| Archivo | Propósito |
|---|---|
| `hooks/useAuth.ts` | Hook de autenticación con roles |
| `lib/admin/mythicService.ts` | CRUD de canciones míticas |
| `components/store/PackOpenModal.tsx` | Modal unificado de apertura |

### Archivos a MODIFICAR:
| Archivo | Cambio |
|---|---|
| `app/profile/page.tsx` | Login arreglado + tabs de usuario logueado + panel míticas |
| `app/store/page.tsx` | Usar PackOpenModal + miniaturas ejemplo |
| `app/page.tsx` | Usar PackOpenModal |
| `lib/engine/generator.ts` | Aceptar mythicTrackIds |
| `store/usePlayerStore.ts` | Agregar `obtainedAt` al inventario |
| `app/studio/page.tsx` | Ordenar por `obtainedAt` descendente |

### SQL a ejecutar en Supabase:
**Sí, ejecutar el SQL del inicio de este documento.** Una sola vez.
Agrega las tablas `mythic_songs`, `friend_requests`, `favorites`, `discovered_songs`, `game_matches`, `player_stats` y las columnas faltantes en `users`.

### Marcar al admin manualmente:
Después de registrarte con tu cuenta de admin, ejecutar en SQL Editor:
```sql
UPDATE public.users
SET is_admin = true, role = 'ADMIN'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'TU_USERNAME@musictcg.app'
);
```
(Reemplaza `TU_USERNAME` con el nombre de usuario que uses para el admin.)
