# 🎸 GUÍA MAESTRA DEFINITIVA - MusicTCG (V. 2.2.5)

Este documento es la **Única Fuente de Verdad (SSOT)** de MusicTCG. Consolida toda la arquitectura, lógica, diseño y evolución técnica del proyecto. Reemplaza a todos los documentos anteriores.

---

## 🏛️ 1. VISIÓN GENERAL
MusicTCG es un juego de cartas coleccionables (TCG) procedural donde **"Tu Playlist Cobra Vida"**. Convierte cualquier canción real (vía Apple Music/iTunes API) en una carta jugable con estadísticas y habilidades únicas determinadas por un **Hash Determinista**.

- **Concepto:** No coleccionas "personajes fantásticos", coleccionas tu música favorita y la haces luchar en un "Concierto de Supervivencia".
- **Stack:** Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Zustand, Firebase (Auth + Firestore + RTDB).

---

## ⚙️ 2. EL MOTOR PROCEDURAL (EL HASH)
Ubicación: `lib/engine/generator.ts`

El corazón del juego transforma metadatos musicales en mecánicas de juego:
1. **Semilla (Seed):** `mulberry32(hashString(trackId))` → Una misma canción siempre genera la misma carta para todos los jugadores.
2. **Rareza por Popularidad:** La popularidad (vistas/posicionamiento) dicta si una carta es **BRONZE**, **SILVER**, **GOLD** o **PLATINUM**.
3. **Presupuesto de Stats:** Fórmula base: `(Coste * 2) + 1`. Las cartas raras reciben un "bono de fama" (más stats por el mismo coste).
4. **Keywords Musicales:** 20+ habilidades temáticas (Drop, Crescendo, Distorsión, Autotune, etc.) asignadas según el género y título.
5. **Diferenciación de Eventos:** Si el título contiene "Live", "Remix" o "Acoustic", se convierte en una carta de **EVENTO** (sin stats de ataque/defensa, solo habilidades pasivas/activas).

---

## 🎮 3. DINÁMICA DE JUEGO (PLAYLIST COMBAT)

### 3.1 Anatomía de la Batalla
- **Mazo = Playlist:** Un mazo es una lista de reproducción (mínimo 1 carta para testing, 40-60 para competitivo).
- **Shuffle Visible:** El jugador ve toda su "colección de setlist" pero el orden de robo es aleatorio. Las próximas 5 cartas son siempre visibles en la "Queue".
- **Fases del Turno:** 
  - `OPENING`: Enderezar cartas y generar energía (1⚡ por turno).
  - `MAIN`: Jugar cartas, activar habilidades, retirar/reactivar.
  - `COMBATE`: Resolución de ataques. El defensor puede usar energía residual para "La Réplica".
  - `CLOSING`: Limpieza de efectos y pasar turno.

### 3.2 Acciones de Especialidad
- **Promocionar (⚡):** Sacrificar una carta en mano para ganar un slot de energía máxima permanente (máx 10).
- **Retirar (1⚡):** Mover carta del tablero al Backstage para curarla o protegerla.
- **Reactivar (2⚡):** Devolver carta del Backstage al tablero (entra Tapped).

---

## 📊 4. ESTADO GLOBAL Y PERSISTENCIA
Ubicación: `store/usePlayerStore.ts`

Gestionado con **Zustand** y sincronizado con **Firebase**:
- **Inventario:** Diccionario de `cardId -> count`.
- **Regla del Play-set (Master Card):** Si obtienes una 5ª copia de una canción (mismo nombre + artista), se convierte automáticamente en un **Comodín (Wildcard)** de su misma rareza.
- **Molienda (Milling):** Destruir cartas sobrantes para obtener progreso de Comodines. 5 cartas molidas = 1 Comodín.
- **Tienda Persistente:** La pestaña activa de la tienda (`activeStoreTab`) persiste entre recargas.
- **Estado de Batalla:** `isInBattle` bloquea la navegación global para mantener la inmersión.

---

## ✨ 5. INTERFAZ Y DISEÑO (UX/UI)

### 5.1 Estética "Spotify-Dark Premium"
- Colores base: `#000000`, `#121212`, con acentos vibrantes según rareza.
- **Glassmorphism:** Uso intensivo de `backdrop-blur` en barras de navegación y modales.
- **Cartas Responsivas:** El modo "Inspección" (Big Card) muestra la carta y la **Letra (Lyrics)** lado a lado en desktop, y una sobre otra en móvil.

### 5.2 Estructura de Navegación
1. **Inicio (`/`):** Dashboard con cofres (estilo Clash Royale), misiones y noticias.
2. **La Disquera (`/search`):** Buscador de Apple Music para "contratar" (craftear) cualquier canción del mundo.
3. **El Estudio (`/studio`):** Gestión de colección y construcción de mazos.
4. **Amigos (`/friends`):** Social, Retos Directos y **Descubrimientos Globales** (quién encontró qué primero).
5. **La Tienda (`/store`):** Compra de sobres con Regalías u Oro.
6. **Perfil (`/profile`):** Ajustes, Auth y **Historial de Partidas**.

---

## 🤖 6. INTELIGENCIA ARTIFICIAL (EL ALGORITMO)
El bot utiliza un sistema de **Ajuste Dinámico de Dificultad (DDA)**:
- **Balance de Poder:** Construye un mazo procedural que iguala el nivel de rareza del jugador (±10%).
- **Heurística Avanzada:** Evalúa el "Threat Score" (puntuación de amenaza) en mesa para decidir si atacar a la vida del jugador o limpiar el tablero.
- **Personalidades:** Desde 'Novato' (aleatorio) hasta 'Experto' (optimización de maná y trades eficientes).

---

## 🛠️ 7. NOTAS TÉCNICAS RECIENTES (V. 2.2.5)

### Mejoras de Calidad de Vida (Implementadas):
- **Lyrics Integration:** Las letras se generan o recuperan y se muestran en el popup de inspección sin obstruir la carta.
- **Event Card Visuals:** Las cartas de evento ahora tienen un marco púrpura eléctrico y el panel de stats (ATK/DEF) está oculto.
- **HTTPS Enforcement:** Forzado de protocolo seguro en todas las imágenes de carátulas para evitar bloqueos de contenido mixto.
- **Flip Fix:** La contraportada de las cartas (CardBack) ahora es 100% visible durante la animación de apertura de sobres mediante estilos inline deterministas.
- **Deck Selection:** Interfaz de selección de mazo antes de la batalla mejorada, con indicadores de validez (`40/40`) y animaciones de selección.

---

## 🗺️ 8. ROADMAP PRÓXIMO
1. **Pase de Batalla:** Temporadas temáticas por géneros musicales.
2. **Torneos Relámpago:** Competiciones de 8 jugadores con eliminación directa.
3. **Skin System:** Versiones alternativas de cartas (Holográficas, Estilo Retro, Minimalistas).
4. **Efectos de Audio de Combate:** Ecualización dinámica según la vida del jugador (filtro pasa bajos al estar a poca vida).

---
*Este documento es dinámico y debe actualizarse tras cada cambio significativo en la arquitectura o lógica del proyecto.*

© 2026 MusicTCG Development Team.
