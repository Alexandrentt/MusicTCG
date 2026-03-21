# 📜 Documentación Oficial de Desarrollo - MusicTCG

Este documento registra paso a paso la evolución técnica, arquitectónica y creativa del proyecto **MusicTCG**. Aquí se justifica cada cambio, variable y función fundamental dentro del sistema.

---

## 📅 Historial de Versiones

### v1.0.0 (Base)
*   **Proyecto Inicial**: Estructura Next.js con soporte para cartas musicales.
*   **Integración Supabase**: Gestión de inventarios y usuarios mediante Supabase.
*   **Motor de Generación**: Primera versión del generador de cartas basado en la API de iTunes y YouTube.

---

### v1.1.0 (Mejoras en la Tienda y Mítica)
*   **Nuevas Rarezas**: Se introdujo la rareza **MYTHIC** (Mítica).
    *   *Por qué:* Para añadir un nivel de coleccionismo extremo y equilibrar la economía de comodines al final de la progresión del jugador.
    *   *Implementación:* 0.1% de probabilidad de herencia de master mítica en `generator.ts`. Nueva propiedad `isMythic` en `MasterCardTemplate`.
*   **Expansión de Géneros en la Tienda**:
    *   *Por qué:* Para permitir que los jugadores personalicen sus mazos basándose en gustos musicales específicos (Latino, Indie, Soul/Blues).
    *   *Implementación:* Se añadió un sistema de términos de búsqueda en `PACK_TYPES` que filtra las cartas obtenibles en cada sobre.
*   **Rediseño de Apertura de Sobres**:
    *   *Por qué:* Crear una experiencia tipo "WOW" comparable a Hearthstone o Magic Arena.
    *   *Implementación:* Uso de `framer-motion` para un layout de abanico dinámico y efectos de aura púrpura para cartas míticas. Se aseguró la visibilidad del botón "Continuar" con un z-index elevado (z-50).
*   **Botín de Victoria (Victory Rewards)**:
    *   *Por qué:* Incentivar el juego competitivo y el bucle de juego básico.
    *   *Implementación:* En `app/play/page.tsx`, se detecta la victoria y se llama a `addChest(generateRandomChest())`.

---

## 🛠️ Relación de Componentes y Funciones Relevantes

### 🗃️ `store/usePlayerStore.ts`
El cerebro del estado global. Gestiona el inventario, los mazos y ahora los **comodines míticos**.
*   `addCard/addCards`: Controlan la lógica de conversión a comodín. Cuando se obtienen más de 4 copias, se transforman en progreso de comodín de la misma rareza.

### 🃏 `components/cards/Card.tsx`
El componente visual más importante.
*   `rarityStyles`: Define el aura visual basándose en la rareza. Para lo **Mítico**, se añadió un resplandor púrpura vibrante (`shadow-[0_0_40px_rgba(168,85,247,0.8)]`).
*   `renderDotCounter`: Muestra diamantes (estilo Magic Arena) para indicar copias repetidas, apareciendo sobre la carta cuando se posee más de una.

### ⚙️ `lib/engine/generator.ts`
Transforma metadatos musicales en estadísticas de juego.
*   `masterRarity`: Se calcula una vez por composición musical. Si una canción es mítica, todas sus variantes (REMIX, LIVE) heredan esta base de rareza, asegurando la consistencia artística.
*   `stats calculation`: Basado en el género y coste. El Rock tiende al ATK alto, el Pop a la DEF, y el Jazz a un equilibrio medio.

---

## 📝 Justificación Técnica General
Cada decisión de diseño busca un equilibrio entre la fidelidad al mundo de la música y la competitividad de un TCG moderno. La introducción de lo **Mítico** aporta el factor "coleccionismo de alto nivel", mientras que los **sobres por género** resuelven la frustración de obtener cartas de estilos musicales que el jugador no desea para su estrategia.
