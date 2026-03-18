# 📋 INSTRUCCIONES DE INTEGRACIÓN - Motor de Fases del Turno

## 🎯 RESUMEN RÁPIDO

He creado **2 NUEVOS ARCHIVOS** que se integran con los sistemas anteriores:

```
✅ NUEVO: gameStateEngine.ts
✅ NUEVO: turnPhaseManager.ts
⚠️  MODIFICAR: combatSystem.ts (pequeña actualización)
```

---

## 📂 ESTRUCTURA DE CARPETAS (Después de integrar)

```
src/
├── lib/
│   ├── abilityEngine.ts          (YA EXISTE - No tocar)
│   ├── cardGenerator.ts          (YA EXISTE - No tocar)
│   ├── combatSystem.ts           (YA EXISTE - MODIFICAR)
│   ├── economySystem.ts          (YA EXISTE - No tocar)
│   ├── gameStateEngine.ts        (NUEVO ← Crear aquí)
│   ├── turnPhaseManager.ts       (NUEVO ← Crear aquí)
│
├── types/
│   └── types.ts                  (YA EXISTE - No tocar)
│
├── components/
│   └── CardComponents.tsx        (YA EXISTE - No tocar)
│
└── styles/
    └── cards.css                 (YA EXISTE - No tocar)
```

---

## 📥 PASO 1: DESCARGAR LOS 2 NUEVOS ARCHIVOS

Localiza en `/mnt/user-data/outputs/`:
- `gameStateEngine.ts` → Descargar
- `turnPhaseManager.ts` → Descargar

---

## 📤 PASO 2: COPIAR ARCHIVOS A TU PROYECTO

```bash
# Navega a tu carpeta del proyecto
cd tu-proyecto-musicttcg

# Copiar los nuevos archivos a src/lib/
cp gameStateEngine.ts src/lib/
cp turnPhaseManager.ts src/lib/
```

---

## 🔧 PASO 3: ACTUALIZAR combatSystem.ts

**IMPORTANTE: NO BORRES el contenido existente de `combatSystem.ts`**

Solo AÑADE estas dos líneas al inicio del archivo (después de los imports existentes):

```typescript
// En src/lib/combatSystem.ts
// AGREGAR estos imports al inicio:

import { GameStateEngine, DetailedPhase } from './gameStateEngine';
import { TurnPhaseManager } from './turnPhaseManager';

// RESTO DEL CÓDIGO SIGUE IGUAL
// ... todo lo demás que estaba antes ...
```

**Eso es todo.** No necesitas cambiar nada más en `combatSystem.ts`.

---

## ✅ PASO 4: ACTUALIZAR types.ts

En `src/types/types.ts`, añade esto al final (después de los otros exports):

```typescript
// En src/types/types.ts
// AGREGAR al final del archivo:

export { DetailedPhase, ValidAction, PhaseState, ActionValidation } from '@/lib/gameStateEngine';
export type { PhaseExecutionResult } from '@/lib/turnPhaseManager';
```

---

## 🧪 PASO 5: CREAR PÁGINA DE PRUEBA

Crea un archivo nuevo: `app/test/turn-phases/page.tsx`

```typescript
'use client';

import { GameState, TurnPhase } from '@/types';
import { GameStateEngine, DetailedPhase } from '@/lib/gameStateEngine';
import { TurnPhaseManager } from '@/lib/turnPhaseManager';
import { initializeGameState } from '@/lib/combatSystem';
import { useState } from 'react';

export default function TurnPhaseTest() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const handleStartGame = () => {
    // Crear una partida de prueba
    const mockDecks = [
      // Aquí irían cartas reales, pero para prueba usamos array vacío
    ];

initializeGameState(
 *   'player_A',
 *   'player_B',
 *   playerA_Deck,  ← Aquí van tus cartas
 *   playerB_Deck   ← Aquí van las cartas del rival
 * )
 * 
 * Si playerB_Deck está vacío o no está inicializado,
 * podrías no tener cartas para jugar.
 * 
 * VERIFICAR: En app/play/page.tsx, donde inicializas el juego,
 * asegúrate de que AMBOS mazos tienen cartas:
 */
 
useEffect(() => {
  // Crear 2 mazos de prueba
  const deck = generateTestDeck(); // ← Debe retornar cartas válidas
 
  // Inicializar el juego
  const gameState = initializeGameState(
    'player_A',
    'player_B',
    deck,      // Tu mazo
    deck       // Mazo del rival (mismo mazo para pruebas)
  );
 
  console.log('GameState inicializado:', gameState);
  console.log('Cartas en tu mano:', gameState.players.player_A.zones.handCount);
  console.log('Cartas en mano del rival:', gameState.players.player_B.zones.handCount);
 
  setGameState(gameState);
}, []);
  };

  const handleNextPhase = () => {
    if (!gameState) return;

    // Obtener fase actual y pasar a la siguiente
    const nextState = GameStateEngine.transitionToNextPhase(gameState);

    // Ejecutar la lógica de la nueva fase
    const result = TurnPhaseManager.executeTurnPhase(
      nextState,
      DetailedPhase.START_BEGINNING_EFFECTS
    );

    setGameState(result.gameState);
    setLogs([...logs, ...result.phaseLogs]);
  };

  return (
    <div className="w-full min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold text-amber-500 mb-6">Test: Motor de Fases</h1>

      <div className="flex gap-4 mb-8">
        <button
          onClick={handleStartGame}
          className="px-6 py-2 bg-green-500 text-black font-bold rounded hover:bg-green-400"
        >
          Iniciar Partida
        </button>

        <button
          onClick={handleNextPhase}
          disabled={!gameState}
          className="px-6 py-2 bg-blue-500 text-black font-bold rounded hover:bg-blue-400 disabled:bg-gray-600"
        >
          Siguiente Fase
        </button>
      </div>

      {gameState && (
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-900 p-4 rounded">
            <h2 className="text-lg font-bold mb-2">Estado del Juego</h2>
            <p>Turno: {gameState.turn}</p>
            <p>Jugador Activo: {gameState.activePlayer}</p>
            <p>Reputación A: {gameState.players.player_A.reputation}</p>
            <p>Reputación B: {gameState.players.player_B.reputation}</p>
          </div>

          <div className="bg-gray-900 p-4 rounded">
            <h2 className="text-lg font-bold mb-2">Acciones Permitidas</h2>
            <ul>
              {GameStateEngine.getAllowedActions(gameState).map((action) => (
                <li key={action} className="text-amber-400">
                  • {action}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Log de eventos */}
      <div className="bg-gray-900 p-4 rounded">
        <h2 className="text-lg font-bold mb-2">Log de Eventos</h2>
        <div className="text-sm font-mono max-h-96 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="text-gray-400">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 🧠 CÓMO FUNCIONAN LOS SISTEMAS

### gameStateEngine.ts - La Máquina de Estados
```
┌─────────────────────────────────────┐
│  GameStateEngine (VALIDACIÓN)       │
├─────────────────────────────────────┤
│                                     │
│ • validateAction()                  │
│   └─ ¿Es válida esta acción?       │
│   └─ Retorna: sí/no + acciones OK  │
│                                     │
│ • transitionToNextPhase()           │
│   └─ Pasar a siguiente fase         │
│   └─ Inicio → Robo → Principal...   │
│                                     │
│ • getAllowedActions()               │
│   └─ Qué puede hacer el jugador     │
│   └─ Retorna: [PLAY_CARD, ...]     │
│                                     │
└─────────────────────────────────────┘
```

### turnPhaseManager.ts - La Ejecución
```
┌─────────────────────────────────────┐
│  TurnPhaseManager (EJECUCIÓN)       │
├─────────────────────────────────────┤
│                                     │
│ • executeTurnPhase()                │
│   └─ Ejecutar lógica de fase        │
│   └─ Retorna: resultado + logs      │
│                                     │
│ • playCard()                        │
│   └─ Jugar una carta                │
│   └─ Gastar energía                 │
│                                     │
│ • declareAttacker()                 │
│   └─ Marcar como atacante           │
│   └─ Validar estado                 │
│                                     │
│ • cleanupEndOfTurn()                │
│   └─ Destruir cartas (DEF ≤ 0)     │
│   └─ Limpiar bonificadores          │
│                                     │
└─────────────────────────────────────┘
```

### Cómo interactúan
```
Usuario: "Pasar a siguiente fase"
    ↓
gameStateEngine.validateAction()
    ├─ ¿Es válido pasar?
    └─ Retorna: sí, acciones permitidas
    ↓
gameStateEngine.transitionToNextPhase()
    └─ Cambiar a siguiente fase
    ↓
turnPhaseManager.executeTurnPhase()
    ├─ Ejecutar lógica específica
    └─ Retorna: resultado + logs
    ↓
Frontend: Mostrar nuevo estado
```

---

## 🔄 FLUJO COMPLETO DE UN TURNO

```
TURNO 1 - PLAYER A

1️⃣  START_BEGINNING_EFFECTS
   └─ executeTurnPhase() → Resolver auras
   └─ validateAction(PASS_PHASE) → Válido
   └─ transitionToNextPhase()

2️⃣  START_UNTAP
   └─ executeTurnPhase() → Endrezar cartas
   └─ transitionToNextPhase()

3️⃣  START_ENERGY_GENERATION
   └─ executeTurnPhase() → Generar energía
   └─ activePlayer.energyMax = 1
   └─ transitionToNextPhase()

4️⃣  DRAW_DRAW_CARD
   └─ executeTurnPhase() → Robar 1 carta
   └─ activePlayer.zones.handCount++
   └─ transitionToNextPhase()

5️⃣  MAIN_PLAY_CARDS (Jugador toma decisiones)
   └─ validateAction(PLAY_CARD, "card_123") → Válido
   └─ playCard() → Gastar energía, invocar
   └─ validateAction(DECLARE_ATTACKER, "card_456") → Válido
   └─ declareAttacker() → Marcar para atacar
   └─ validateAction(PASS_PHASE) → Válido
   └─ transitionToNextPhase()

6️⃣  COMBAT_RESOLVE_ATTACKS
   └─ executeTurnPhase() → Resolver combate
   └─ CombatResolver.declareAttack()
   └─ transitionToNextPhase()

7️⃣  COMBAT_PROCESS_REACTIONS
   └─ Si hay pendingReaction, mostrar opción
   └─ processReaction() → Defender o pasar
   └─ transitionToNextPhase()

8️⃣  END_CLEANUP
   └─ executeTurnPhase() → Destruir cartas, limpiar bonificadores
   └─ transitionToNextPhase()

9️⃣  END_PASS_TURN
   └─ Cambiar activePlayer
   └─ Incrementar turn
   └─ Volver a START_BEGINNING_EFFECTS (para PLAYER B)
```

---

## ❓ PREGUNTAS COMUNES

### P: ¿Qué pasa con combatSystem.ts?
**R:** Sigue existiendo y funcionando. gameStateEngine.ts y turnPhaseManager.ts lo USAN pero no lo reemplazan. Solo necesitas importar los nuevos sistemas.

### P: ¿Debo reemplazar algo en types.ts?
**R:** NO. Solo AÑADE los exports al final. No borres nada existente.

### P: ¿Dónde se valida si puedo jugar una carta?
**R:** En `gameStateEngine.validateAction()` → `validatePlayCard()`

### P: ¿Dónde se ejecuta la lógica de destruir cartas?
**R:** En `turnPhaseManager.cleanupEndOfTurn()`

### P: ¿Cómo se comunica con el frontend?
**R:** 
- gameStateEngine retorna `ActionValidation` (qué acciones son válidas)
- turnPhaseManager retorna `PhaseExecutionResult` (qué sucedió)
- El frontend usa ambos para mostrar UI y logs

### P: ¿Qué es DetailedPhase vs TurnPhase?
**R:**
- `TurnPhase` (en types.ts): Alto nivel (OPENING, MAIN, CLOSING)
- `DetailedPhase` (en gameStateEngine.ts): Desglosado (START_BEGINNING_EFFECTS, START_UNTAP, etc.)

---

## 🧪 TESTING RÁPIDO

Después de copiar los archivos, ejecuta:

```bash
npm run dev
# Abre http://localhost:3000/test/turn-phases
```

Deberías ver:
- Botón "Iniciar Partida" → Crea un juego
- Botón "Siguiente Fase" → Avanza la fase y muestra logs
- Estado del juego actualizado
- Acciones permitidas en tiempo real

---

## 📊 TABLA DE INTEGRACIÓN

| Archivo | Ubicación | Acción | Estado |
|---------|-----------|--------|--------|
| gameStateEngine.ts | src/lib/ | **CREAR NUEVO** | ✅ |
| turnPhaseManager.ts | src/lib/ | **CREAR NUEVO** | ✅ |
| combatSystem.ts | src/lib/ | Añadir imports | ✅ |
| types.ts | src/types/ | Añadir exports | ✅ |
| abilityEngine.ts | src/lib/ | Nada | ✅ |
| cardGenerator.ts | src/lib/ | Nada | ✅ |
| economySystem.ts | src/lib/ | Nada | ✅ |
| CardComponents.tsx | src/components/ | Nada | ✅ |
| styles_cards.css | src/styles/ | Nada | ✅ |

---

## 🎯 SIGUIENTES PASOS

Una vez integrado:

1. **Semana 1:** Verificar que todo compila sin errores
2. **Semana 2:** Implementar acciones del jugador (playCard, declareAttacker)
3. **Semana 3:** Integrar con UI (mostrar fases, botones de acciones)
4. **Semana 4:** WebSocket para multijugador
5. **Semana 5:** Testing exhaustivo del balance

---

## ⚠️ CHECKLIST FINAL

```
☐ Descargué gameStateEngine.ts
☐ Descargué turnPhaseManager.ts
☐ Copié ambos a src/lib/
☐ Añadí imports a combatSystem.ts
☐ Añadí exports a types.ts
☐ npm run dev compila sin errores
☐ Página /test/turn-phases funciona
☐ Puedo ver fases avanzar en log
☐ Acciones permitidas se actualizan
☐ Estoy listo para siguiente sistema
```

---

¿Listo para integrar? 🚀
