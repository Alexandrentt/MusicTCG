# 🎸 GUÍA MAESTRA DEFINITIVA - MusicTCG (V. 2.9.0)

Este documento es la **Única Fuente de Verdad (SSOT)** de MusicTCG. Consolida toda la arquitectura, lógica, diseño y evolución técnica del proyecto. Reemplaza a todos los documentos anteriores.

---

## 🚀 RESUMEN DE CAMBIOS RECIENTES

#### [v2.9.0] - Supabase Real, Game Loop, Letras y Diamantes

**Letras sincronizadas restauradas:**
- El módulo de letras ahora muestra la letra **siempre que `lrclib.net` la devuelva** (sincronizada o plana).
- Solo se oculta si no hay ningún resultado. Sin bloqueo por propiedad de carta.
- Las letras planas también se muestran correctamente en el panel derecho al inspeccionar.

**Diamantes al estilo Magic Arena:**
- El contador de copias (diamante) ahora aparece **solo si tienes MÁS DE 1 copia** de una carta.
- Los diamantes flotan **ENCIMA y fuera de la carta** (ya no dentro del `overflow-hidden`).
- Card.tsx envuelve ahora el `motion.div` en un `div` externo `relative inline-block`, separando el contador del clip.
- Estilo actualizado: gradiente naranja brillante, `shadow-[0_0_10px_rgba(249,115,22,0.9)]`, 4 diamantes rotatados 45°.

**Inicio de sesión arreglado:**
- Email "fantasma" determinístico: `{username}@musictcg.app` (evita bloqueos de Gmail y Outlook).
- Validación de contraseña mínima (6 caracteres) antes de llamar a Supabase.
- Mensajes de error específicos por código de error de Supabase.
- `setDiscoveryUsername` se llama al registrar para que el nombre quede sincronizado.

**Motor de búsqueda de iTunes arreglado:**
- `generateCard` ahora recibe los parámetros correctos del formato iTunes (`trackName`, `artistName`, `collectionName`, `primaryGenreName`, `artworkUrl100`).
- Se sanitizan los espacios con `+` para la URL de búsqueda (iTunes los requiere así vs `%20`).
- `data.results || []` previene crash si la API devuelve undefined.

**Supabase DB — Implementación real:**
- Creado `supabase_schema.sql` con **todas las tablas, triggers, RLS policies e índices** listos para ejecutar en el panel de Supabase.
  - `profiles` (auto-crea al registrar vía trigger)
  - `player_inventory` (con función `upsert_card`)
  - `player_decks`
  - `game_matches`
  - `player_stats`
  - `global_discoveries`
  - `friendships`
- Creado `lib/database/supabaseSync.ts` con servicio real (ya no placeholders):
  - `fetchInventory`, `addCardToInventory`, `removeCardFromInventory`
  - `fetchDecks`, `saveDeck`, `deleteDeck`
  - `fetchStats`, `upsertStats`, `recordMatchResult`
  - `claimFreePackTimestamp`, `canClaimFreePack`

**Game loop + integración con Supabase:**
- Al terminar una partida, `recordMatchResult()` persiste el resultado en `game_matches` y actualiza `player_stats` en Supabase de forma asíncrona (sin bloquear la UI).
- `matchStartTime` ref captura el timestamp de inicio de la partida.

**Botón Continuar:**
- El footer del modal de apertura de sobres (home y store) ahora tiene `sticky bottom-0 z-[500] pb-24` para que nunca quede oculto por la TabBar móvil.

**Curva de Energía:**
- Se convirtió de componente interno a función de renderizado (`renderEnergyCurve()`) para que Framer Motion la anime correctamente al agregar/quitar cartas sin destruir el estado.
- El panel izquierdo del deck builder es `sticky top-28` para que siempre sea visible sin hacer scroll.



---

## 🚀 RESUMEN DE CAMBIOS RECIENTES

#### [v2.8.0] - Autenticación Nativa, UI Responsive y Rediseño de Flujos
- **Autenticación Simplificada (Supabase):** Se eliminó el login con Google para forzar una experiencia más directa y segura mediante Email/Contraseña.
- **Rediseño del Home (Nueva Partida):** Interfaz modernizada para arrancar rápidamente contra un bot o un amigo, eligiendo la dificultad directamente. El menú se adapta mejor a dispositivos móviles.
- **Sobres de Inicio Extremos:** Algoritmo de molienda múltiple (`Promise.all`) que inyecta resultados de superhits (Hot 100, Clásicos) junto con joyas ocultas (lofi indie, random tracks) para sobres gratuitos verdaderamente aleatorios y equilibrados.
- **Curva de Estrategia MTG:** El Editor de Mazos ahora muestra un gráfico de barras elegante e interactivo (estilo Magic the Gathering) para visualizar el costo de energía (0 a 8+).
- **Indicadores Premium (Diamantes):** Los diamantes que muestran la cantidad poseída de una carta han sido rediseñados usando gradientes, `drop-shadow` y opacidades variables para distinguir mejor lo que tienes.
- **Resolución de Bugs:**
  - Letras ocultadas si los servidores devuelven errores o "not found".
  - Corrección de la API de iTunes para que respete el filtrado explícito (ej: `&attribute=artistTerm`).
  - Navegación por autor: al hacer click en el artista, busca la obra de la misma categoría de artista.
  - Corrección a la ventana emergente modal que te dejaba atascado en sobres gratuitos al añadir botón `CONTINUAR`.

#### [v2.7.0] - Studio Search & Inspection
- **Fix Game Loop & Bot AI:** Implementado sistema de **Auto-Phase** para las fases `START` y `DRAW`. El bot ahora responde fluidamente sin atascos en el flujo de turnos.
- **Sistema de Soundtracks (OST):** Nueva clase de carta "SOUNDTRACK". Se detectan automáticamente desde la metadata (Apple Music/iTunes). Son siempre de rareza **PLATINUM** y cuentan con metadata extendida (`mediaType`, `composers`, `releaseYear`, `vinyls`).
- **Sistema de Favoritos:** Implementada persistencia en **Firestore** (`users/{uid}/favorites`). Los usuarios pueden marcar cartas desde el buscador.
- **UI de Favoritos:** Integrado el `FavoriteButton` animado en el buscador "La Disquera".

---

## ⚙️ ARQUITECTURA TÉCNICA

### 🔍 1. Sistema de Búsqueda "La Disquera 3.0"
- **Priorización de Inventario:** Usa `useMemo` para filtrar el inventario del usuario y `useEffect` para llamar a la API de iTunes. Los resultados se combinan y ordenan para mostrar lo que ya tienes primero.
- **Deduplicación:** La lógica en `app/studio/page.tsx` identifica si un resultado de la API ya existe en el inventario para marcarlo como "Poseído" y evitar duplicados visuales confusos.

### 🎤 2. Sincronización de Letras (LRC Engine)
- **API Externa:** Consumo de `lrclib.net` para obtener letras con marcas de tiempo.
- **Estado de Reproducción:** El componente `ReactPlayer` (importado dinámicamente para evitar errores de SSR/Hydration) actualiza un estado `currentLyricIndex` basado en `onProgress`, provocando el scroll automático al elemento activo.

### 📊 3. Visualización de Deck (Energy Curve)
- **Cálculo:** Se itera sobre las cartas del mazo actual para agruparlas por coste (0-8+).
- **UI Dinámica:** Barras animadas con hover que muestran la cantidad exacta de cartas por cada nivel de energía.

### 🧪 4. Registro de Variables y Componentes Clave
- `globalSearchQuery`: Estado central para la búsqueda unificada.
- `inventoryList`: `useMemo` que optimiza el acceso al inventario para filtrado rápido.
- `EnergyCurve`: Componente interno para visualización de mazo.
- `ReactPlayer`: Integrado como `any` para resolver conflictos de tipos con props de YouTube en Next.js.

---

## 🗺️ ROADMAP PRÓXIMO
1. **Colección de Favoritos:** Página dedicada para ver todas las cartas marcadas.
2. **Efectos Visuales:** Shaders para cartas Platinum y Soundtracks.
3. **Draft Mode:** Sistema de creación de mazos aleatorios por tiempo limitado.

---
---
*Última actualización: v2.8.0 - 2026*

© 2026 MusicTCG Development Team.

