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

### v2.0.0 (Reescritura del Sistema de Combate)
*   **Motor Centralizado (`useGameEngine.ts`)**:
    *   *Por qué:* Eliminar inconsistencias de estado, race conditions y efectos que no se aplicaban correctamente.
    *   *Implementación:* Unificación de interfaces (`BoardCard`), uso de funciones puras (`resolveAttackPure`) y una máquina de estados clara para las fases del turno (`START`, `DRAW`, `MAIN`, `REPLICA`, `END`).
*   **Fase de RÉPLICA e Intercepción**:
    *   *Por qué:* Añadir profundidad estratégica permitiendo respuestas inmediatas al ataque enemigo, similar a los "Instantes" de Magic.
    *   *Implementación:* Introducción de la fase `REPLICA` tras declarar un ataque. El oponente puede usar cartas de su Reserva (Backstage) para interceptar o activar efectos antes de la resolución del daño.
*   **IA del Bot Robusta**:
    *   *Por qué:* El bot sufría de ataques fantasma y decisiones incoherentes.
    *   *Implementación:* Integración de una cola de acciones (`botActionQueue`) con delays controlados y verificaciones estrictas de `gameOver` y turno activo antes de procesar cada acción.
*   **Validación de Mazo Flexible (20 cartas)**:
    *   *Por qué:* Facilitar el inicio de juego para nuevos usuarios y permitir estrategias de mazos más compactos y consistentes.
    *   *Implementación:* Se redujo el requisito mínimo de 40 a 20 cartas en la UI y se añadió relleno automático de cartas básicas en el motor si el mazo es insuficiente.

---

## 🛠️ Relación de Componentes y Funciones Relevantes

### 🗃️ `store/usePlayerStore.ts`
El cerebro del estado global. Gestiona el inventario, los mazos y ahora los **comodines míticos**.
*   `addCard/addCards`: Controlan la lógica de conversión a comodín. Cuando se obtienen más de 4 copias, se transforman en progreso de comodín de la misma rareza.

### 🃏 `hooks/useGameEngine.ts` (NUEVO CORAZÓN)
El motor que arbitra el duelo.
*   `applyKeywordEffects`: Centraliza la lógica de habilidades (Sustain, Distortion, Bass Boost, etc.) disparadas por eventos (`ON_PLAY`, `ON_DEATH`, `PASSIVE_START_TURN`).
*   `resolveAttackPure`: Función puramente funcional que procesa el intercambio de daño y efectos de arrollamiento (Distortion) devolviendo nuevos estados inmutables.

### 🤖 `lib/engine/singleplayerBot.ts`
Cerebro de la IA.
*   `botPlayTurn`: Evalúa el tablero y la mano para generar una secuencia lógica de acciones. Prioriza la curva de energía y la eliminación de amenazas clave.

---

## 📝 Justificación Técnica General
Cada decisión de diseño busca un equilibrio entre la fidelidad al mundo de la música y la competitividad de un TCG moderno. La introducción de lo **Mítico** aporta el factor "coleccionismo de alto nivel", mientras que los **sobres por género** resuelven la frustración de obtener cartas de estilos musicales que el jugador no desea para su estrategia. La **Reescritura de Combate v2.0** era necesaria para dotar al juego de la solidez técnica y estratégica requerida para una experiencia de usuario fluida y libre de bugs críticos.
