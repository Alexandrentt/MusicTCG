# DOCUMENTACIÓN - MUSICTCG

## Información del Proyecto
- **Nombre:** MusicTCG
- **Descripción:** Juego de cartas coleccionables basado en música real, utilizando la API de iTunes para descubrir canciones y el motor de cartas para generar habilidades dinámicas.
- **Tecnologías:** Next.js 15, React 19, Supabase, Tailwind CSS, Lucide React, Framer Motion.

---

## Historial de Versiones

### v1.3.1 (Corrección de Bug de Consola SSR)
- **Corrección Backend:** Arreglado un error de formato UUID que colapsaba la consola del servidor con `Error fetching match history: {}` cuando la sesión del usuario recaía en el fallback `local-guest`. Se añadieron guardias protectoras en `getPlayerMatchHistory` y `getPlayerStats` (`lib/database/supabaseGameHistory.ts`) para prevenir peticiones malformadas a PostgREST.

### v1.3.0 (Optimización UX/SEO y Resolución de Build)
- **Mejora de Rendimiento (LCP):** Se reemplazaron todas las etiquetas `<img>` estandarizadas por el componente `<Image>` optimizado de `next/image` en rutas críticas visuales (`Card.tsx`, `MusicCard.tsx`, `MiniPlayer.tsx`, `PlaylistCard.tsx`, `SetlistView.tsx`, `DiscoveriesTab.tsx`). Esto permite cargar en WebP/AVIF y prioriza la caché interna de Next.js.
- **Accesibilidad (A11y):** Añadidas etiquetas `aria-label` en los botones funcionales basados en íconos de `MiniPlayer.tsx` y `DiscoveriesTab.tsx` para permitir lectura en asistentes de voz y cumplir buenas prácticas.
- **Resolución Build:** Se ha verificado vía `npm run build` que Next.js ahora compila `Exit code: 0` satisfactoriamente sin fallos por tags img no optimizados, dejando únicamente advertencias ESLint.
- **Consolidación de documentación:** Se unifico todo el volumen de planes de sistema, hojas de ruta y checklists de auditorías (`ANALISIS_SEGURIDAD.md`, `PLAN_IMPLEMENTACION.md`, etc) en el documento maestro `DOCUMENTACION.md` dentro de la carpeta central de la app, moviendo lo viejo a /Docs_Archivados tal y como requerían las reglas globales del proyecto.

### v1.0.0 (Base)
- Implementación inicial del motor de cartas (`Card.tsx`).
- Sistema de búsqueda en "La Disquera" (`LaDisqueraSearch.tsx`).
- Integración básica con Supabase para inventarios y mazos.
- Modo batalla básico contra bot.

### v1.1.0 (Refinamiendo de UI y Mecánicas)
- **Cambio:** Eliminación de redundancias en la UI de cartas (diamantes en las esquinas eliminados).
- **Cambio:** Ajuste visual de los diamantes centrales para indicar copias de la carta.
- **Mejora:** Implementación del sistema de rareza `MYTHIC`.
- **Mejora:** Panel de administración exclusivo para asignar cartas `MYTHIC` (solo para `dretty156@gmail.com`).
- **Mejora:** Refactorización del modo batalla para permitir configuración previa al encuentro.
- **Corrección:** Arreglado el problema de búsqueda que no permitía inspeccionar cartas inmediatamente.
- **Corrección:** Arreglado el error de consola por `src` vacío en `img` (MiniCard).
- **Corrección:** Importación correcta de `ChevronRight` en todas las vistas.
- **Corrección:** Ajuste del botón "Continuar" para evitar solapamientos en móviles.

### v1.1.1 (Revisión de Búsqueda y Habilidades)
- **Corrección Lógica:** Actualizado el generador de IDs en `lib/cardGenerator.ts` para crear una "canción canónica". Ahora las canciones con el mismo nombre y artista, pero diferentes variantes menores (ej. Remix, Edit, AM/PM), se agrupan bajo un único ID genérico para evitar versiones duplicadas en el inventario.
- **Mejora:** Ampliadas las piscinas de habilidades (`try` effects en `lib/abilityEngine.ts` y listados en `Keyword`) para disminuir drasticamente la aparición del keyword "SUSTAIN" y hacer que las combinaciones sean muchísimo más variadas, usando mecánicas como Trample, Mind Control, Stealth, etc.
- **Mejora UI:** Eliminadas las etiquetas de '% SYNC' y 'PARTIAL' de los resultados de búsqueda ya que no aportaban valor.
- **Corrección UI:** Las cartas de tipo 'EVENTO', al no combatir de modo tradicional, ahora ocultan sus estadísticas base de Daño/Defensa en la interfaz gráfica para evitar confusión.

### v1.2.0 (Sistema de Autenticación Admin con Contraseña)
- **Nuevo:** Creado `/app/admin/page.tsx` como puerta de acceso al panel de administración.
  - Requiere que el usuario esté logueado con un email autorizado (`dretty156@gmail.com`).
  - Requiere ingresar la **contraseña maestra** (`REMIX_MYTHIC_MASTER`) para obtener acceso.
  - La sesión admin se guarda en `sessionStorage` con expiración de 2 horas.
  - Si el email no está en la lista `AUTHORIZED_ADMINS`, se muestra "Acceso Denegado" sin mostrar campo de contraseña.
- **Cambio:** Reescrito `/app/admin/mythic/page.tsx` para que use `isAdminAuthenticated()` (importada desde `../page`) en lugar del antiguo `usePlayerStore().user.email`, que no funcionaba y se quedaba en "Verificando credenciales...".
- **Mejora UX:** Navegación con botón "Volver al Panel" desde la página Mythic.
- **Corrección:** Simplificada la navegación PvP en `app/friends/page.tsx` eliminando el import dinámico innecesario de `next/navigation`.

### v1.2.1 (Corrección de Errores de Compilación y Tipado)
- **Corrección Lógica:** Arreglado el error de tipado en `lib/abilityEngine.ts` agregando la propiedad `abilityType` faltante a las habilidades dinámicas y estáticas (`GeneratedAbility`), la cual requería de clasificación `PASSIVE`, `ACTIVATED` o `TRIGGERED`. Esto se realizó para cumplir con la nueva interfaz de generador de habilidades.
- **Corrección Lógica:** Removida la declaración duplicada de `Effect.ENERGY_STEAL` en los pesos iniciales asignados a rarezas como `GOLD` o `PLATINUM` en `lib/engine/combinationMatrix.ts`.
- **Corrección UI:** Arreglado error de compilación por la regla ESLint `react-hooks/set-state-in-effect` en los componentes `TabBar.tsx` y `BattleTutorialOverlay.tsx`, ignorando explícitamente la regla de ESLint sobre los setters dentro de los hooks `useEffect()`, dado que son requeridos para manejar la hidratación en UI en NextJS.
- **Mejora:** Ejecutado y validado de principio a fin el comando `npm run build` sin errores, garantizando una compilación libre de errores y alertas críticas.

---

### Componentes Principales

#### `Card.tsx`
- **Función:** Renderizado dinámico de la carta.
- **Relación:** Usa los datos de `generator.ts` para determinar habilidades y estadísticas basadas en el género y duración de la canción.
- **Justificación:** Es el núcleo visual del juego. Se requiere que sea premium con efectos de brillo y bordes detallados.

#### `MiniCard.tsx`
- **Función:** Versión reducida de la carta para el tablero y el estudio.
- **Cambio:** Se eliminaron los diamantes de las esquinas por ser redundantes con el indicador central de copias.
- **Relación:** Se usa en `StudioPage` y `Battlefield`.

#### `Battlefield (app/play/page.tsx)`
- **Función:** Gestiona el bucle de juego (Game Loop).
- **Lógica:** Implementa ataques directos, intercepciones y uso de energía.
- **Justificación:** Centraliza la experiencia de juego. Se añadió un estado de preparación para que el jugador elija su mazo antes de empezar.

### Sistema de Base de Datos (Supabase)

#### Tabla `profiles`
- Guarda el perfil del usuario y el rol de administrador (`is_admin`).
- El administrador maestro es `dretty156@gmail.com`.

#### Tabla `favorites`
- Permite a los usuarios guardar canciones favoritas desde la búsqueda.
- Se implementó una vista dedicada en `/favorites`.

#### Tabla `mythic_songs`
- Almacena las canciones que han sido elevadas a rareza `MYTHIC`.
- Estas cartas tienen una probabilidad extremadamente baja de aparecer en sobres si no son asignadas por un admin.

---

## Justificación de Decisiones

1. **Eliminación de Diamantes en Esquinas:** Los usuarios reportaron que saturaban la carta. El diamante central ya cumple la función de mostrar el nivel o cantidad de copias, simplificando la lectura visual.
2. **Restricción de Admin Maestro:** Por seguridad, solo la cuenta del autor original tiene permisos para subir cartas a `MYTHIC`, asegurando el valor de la economía del juego.
3. **Modo Batalla Refactorizado:** Antes el juego empezaba automáticamente. Ahora el flujo permite al usuario revisar sus cartas y energía antes de lanzar el primer ataque, mejorando la estrategia.
4. **Módulo de Letras:** Se integra cuando es posible para aumentar la inmersión musical durante la visualización a pantalla completa.

---

## Pendientes / RoadMap
- Implementar modo Multiplayer real (PVP Online).
- Refinar el balance de los efectos de las cartas por género.
- Añadir sistema de Gremios o Clubes de Fans.


<!-- Contenido extraído de README.md -->
# 🎵 MusicTCG: The Ultimate Rhythm & Card Game 🎵

¡Bienvenido a la revolución de los juegos de cartas coleccionables impulsado por la música real!

## 🚀 Novedades de la Versión

### ✨ Rareza MÍTICA (Mythic)
Hemos introducido el nivel de poder definitivo: las cartas **MÍTICAS**. Con una probabilidad de aparición del 0.1%, estas cartas irradian un aura cósmica púrpura y poseen estadísticas legendarias que cambiarán el curso de cualquier batalla.

### 🛍️ Expansión de la Tienda de Sobres
¡Nuevos géneros para coleccionar! Especialízate en tus ritmos favoritos:
- **Sobres Latino**: Ritmos calientes con plata garantizada.
- **Soul & Blues**: Sentimiento puro para tu mazo.
- **Indie & Alternativo**: Descubre las joyas ocultas de la escena.
- **Leyendas**: El olimpo de la música con Platino o Mítico garantizado.

### 🃏 Experiencia de Apertura Inmersiva
El momento de abrir un sobre es ahora más mágico que nunca. Las cartas aparecen en un **layout de abanico** animado, permitiéndote inspeccionar cada joya antes de añadirla a tu colección.

### 🏆 Recompensas de Victoria
¡Toda gran batalla merece un premio! Ahora recibirás **cofres de victoria** aleatorios al ganar partidas contra otros jugadores o bots. Estos cofres contienen sobres de diversos géneros para que nunca dejes de expandir tu imperio musical.

## 🛠️ Cómo Empezar

**Prerrequisitos:** Node.js

1.  **Instala las dependencias:**
    `npm install`
2.  **Configura tus claves:**
    Crea un `.env.local` con `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3.  **Inicia el escenario:**
    `npm run dev`

---
*Hecho con pasión por Antigravity y la comunidad de melómanos.*


<!-- Contenido extraído de INDICE_DOCUMENTACION.md -->
# 📚 ÍNDICE COMPLETO DE DOCUMENTACIÓN - MusicTCG

## 🎯 **Resumen del Proyecto**

MusicTCG es un juego de cartas coleccionables basado en música que combina mecánicas de TCG tradicionales con elementos únicos de música y streaming.

---

## 📋 **Estructura de Documentación**

### **🏠 Documentación Principal**
- **[README.md](./README.md)** - Descripción general del proyecto y setup
- **[DOCUMENTACION.md](./DOCUMENTACION.md)** - Documentación base del proyecto
- **[GUIA_MAESTRA_PROYECTO.md](./GUIA_MAESTRA_PROYECTO.md)** - Guía completa del proyecto

---

## 🚀 **Sistema de Habilidades Procedurales (Nuevo)**

### **📈 Fases de Implementación**
- **[FASE_1_DISEÑO.md](./FASE_1_DISEÑO.md)** - Diseño del sistema procedural
- **[FASE_2_INTEGRACION.md](./FASE_2_INTEGRACION.md)** - Integración y testing
- **[MECANICAS_EXPANDIDAS.md](./MECANICAS_EXPANDIDAS.md)** - Mecánicas expandidas detalladas

### **🔧 Componentes Técnicos**
- **Validador** - `lib/engine/abilityValidator.ts`
- **Matriz** - `lib/engine/combinationMatrix.ts` 
- **Motor** - `lib/engine/proceduralAbilityEngine.ts`
- **Testing** - `lib/engine/proceduralTesting.ts`
- **Migración** - `lib/engine/databaseMigration.ts`

---

## ⚔️ **Sistema de Combate**

### **🎮 Mecánicas de Juego**
- **[COMBAT_SYSTEM_REWRITE.md](./COMBAT_SYSTEM_REWRITE.md)** - Reescritura completa del sistema de combate
- **[FEATURES_IMPLEMENTATION.md](./FEATURES_IMPLEMENTATION.md)** - Features implementadas

---

## 📊 **Roadmap y Planificación**

### **🗺️ Desarrollo**
- **[CHECKLIST_Y_ROADMAP.md](./CHECKLIST_Y_ROADMAP.md)** - Checklist completo y roadmap
- **[DOCUMENTACION_PROYECTO.md](./DOCUMENTACION_PROYECTO.md)** - Documentación del proyecto
- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Documentación técnica

---

## 🎯 **Guías Rápidas**

### **⚡ Setup y Desarrollo**
```bash
# Instalación
npm install

# Desarrollo
npm run dev

# Testing del motor procedural
npm run test:procedural

# Build
npm run build
```

### **🔍 Testing de Habilidades**
```bash
# Test completo del motor procedural
npm run test:procedural

# Test rápido
npm run test:procedural:quick

# Test de habilidades (alias)
npm run test:abilities
```

---

## 🏗️ **Arquitectura del Sistema**

### **📁 Estructura de Archivos Clave**
```
lib/engine/
├── generator.ts              # Generador de cartas (ahora async)
├── abilityEngine.ts          # Motor de habilidades clásico
├── abilityValidator.ts       # Validador de habilidades procedurales
├── combinationMatrix.ts      # Matriz de combinaciones (44K+ combos)
├── proceduralAbilityEngine.ts # Motor procedural optimizado
├── proceduralTesting.ts      # Suite de testing completa
├── testProcedural.ts         # Script de ejecución de tests
└── databaseMigration.ts      # Sistema de migración de DB

types/
├── types.ts                  # Tipos actualizados con AbilityType/Category
└── abilities.ts              # Tipos base de habilidades

Documentacion_avances/
├── GUIA_MAESTRA_PROYECTO.md  # Guía maestra
├── MECANICAS_EXPANDIDAS.md   # Mecánicas expandidas
├── FASE_2_INTEGRACION.md     # Integración completada
└── COMBAT_SYSTEM_REWRITE.md  # Sistema de combate
```

---

## 🎵 **Sistema de Cartas**

### **🃏 Generación de Cartas**
- **Sistema Dual:** Clásico + Procedural
- **5 Rarezas:** Bronze, Silver, Gold, Platinum, Mythic
- **Formatos:** Single, Album, EP, Live, Acoustic, Remix, Feature, Compilation
- **Géneros:** Pop, Rock, Hip-Hop, Electronic, Jazz, Classical, Country, R&B

### **🎯 Habilidades por Rareza**
- **Bronze:** 1 habilidad procedural
- **Silver:** 1-2 habilidades procedurales
- **Gold:** 2 habilidades procedurales  
- **Platinum:** 3 habilidades procedurales
- **Mythic:** Diseño manual (sin procedural)

---

## 🔄 **Migración de Base de Datos**

### **📋 Estrategias de Actualización**
- **`all`** - Actualizar todas las cartas (excepto Mythic)
- **`by_rarity`** - Actualizar por rarezas específicas
- **`by_format`** - Actualizar por formatos específicos
- **`incremental`** - Actualizar gradualmente (recomendado)
- **`manual`** - Control manual con filtros

### **🛡️ Seguridad**
- **Backup automático** antes de migrar
- **Validación** de cada carta actualizada
- **Rollback** disponible si algo falla
- **Logging** detallado del proceso

---

## 📊 **Métricas y Performance**

### **⚡ Motor Procedural**
- **44,640 combinaciones** teóricas
- **Cache LRU** de 10,000 entradas
- **Tiempo promedio:** < 5ms por generación
- **Hit rate:** > 80% después de primeras generaciones

### **🎮 Gameplay**
- **100,000+ combinaciones** únicas posibles
- **3 niveles de riesgo:** LOW/MEDIUM/HIGH
- **30+ reglas de seguridad** contra combos rotos
- **Sistema de balance** por rareza

---

## 🚨 **Notas Importantes**

### **✅ Lo que SÍ se implementó:**
- Motor procedural completo con validación
- Integración sin romper sistema existente
- Sistema de testing automático
- Estrategia de migración segura
- Documentación completa

### **❌ Lo que NO se rompió:**
- Sistema clásico de habilidades sigue funcionando
- Cartas Mythic siguen siendo diseño manual
- Base de datos existente se preserva
- No se pierden datos de usuarios

### **🔄 Cambios Clave:**
- `generateCard()` ahora es `async`
- Nuevas habilidades para BRONZE → PLATINUM
- Sistema de cache optimizado
- Validación en 3 niveles

---

## 🎯 **Próximos Pasos**

### **Fase 3: Testing y Ajustes**
1. **Testing en producción** con datos reales
2. **Ajuste de pesos** basado en feedback
3. **Extensión de efectos** especializados
4. **Sistema de hotfix** para actualizaciones

### **Fase 4: Expansión**
1. **Más efectos** especializados
2. **Condiciones complejas**
3. **Sinergias avanzadas**
4. **Analytics** de uso

---

## 📞 **Soporte y Contacto**

### **🔧 Issues y Soporte**
- **Testing:** Usar `npm run test:procedural`
- **Logs:** Revisar consola para debugging
- **Migración:** Seguir guía en `databaseMigration.ts`

### **📚 Recursos**
- **Código fuente:** Ver archivos en `lib/engine/`
- **Tipos:** Ver `types/types.ts`
- **Documentación:** Ver archivos `.md` en esta carpeta

---

**🎵 MusicTCG - Sistema de Habilidades Procedurales v2.0**  
**🚀 Ready for Production - Fase 2 Completada**


<!-- Contenido extraído de MIGRACION_BASE_DATOS.md -->
# 🗄️ MIGRACIÓN DE BASE DE DATOS - MusicTCG

## 🎯 **Respuesta Corta: NO, no necesitas reiniciar la base de datos**

### **✅ Sistema de Actualización Automática Implementado**

---

## 🔄 **¿Cómo Funciona la Actualización?**

### **1. 📋 Estrategia de Migración Inteligente**

El sistema de migración actualiza cartas existentes **SIN perder datos**:

```typescript
// Estrategias disponibles
const estrategias = {
  'incremental': 'Solo cartas sin habilidades procedurales (recomendado)',
  'all': 'Todas las cartas excepto Mythic',
  'by_rarity': 'Solo ciertas rarezas',
  'by_format': 'Solo ciertos formatos',
  'manual': 'Control manual con filtros'
};
```

### **2. 🛡️ Proceso Seguro**

```
1. 📦 Backup automático antes de migrar
2. 🔍 Verificar estado actual de la base de datos
3. 📦 Procesar en lotes pequeños (50 cartas por lote)
4. ✅ Validar cada carta antes de actualizar
5. 📊 Logging detallado del proceso
6. 🔄 Rollback disponible si algo falla
```

---

## 🚀 **Cómo Ejecutar la Migración**

### **📋 Opción 1: Migración Incremental (Recomendada)**

```typescript
import { cardMigrator } from './lib/engine/databaseMigration';

// Solo cartas sin habilidades procedurales
const resultado = await cardMigrator.migrateCards('incremental');

console.log('Resultado:', {
  totalCards: resultado.totalCards,
  updatedCards: resultado.updatedCards,
  errors: resultado.errors,
  migrationTime: resultado.migrationTime
});
```

### **📋 Opción 2: Migración por Rareza**

```typescript
// Actualizar solo cartas Bronze y Silver
const resultado = await cardMigrator.migrateCards('by_rarity', {
  rarity: ['BRONZE', 'SILVER'],
  batchSize: 25
});
```

### **📋 Opción 3: Migración Completa**

```typescript
// Todas las cartas excepto Mythic
const resultado = await cardMigrator.migrateCards('all', {
  batchSize: 50
});
```

---

## 🔍 **Verificar Estado de la Base de Datos**

### **📊 Check de Migración**

```typescript
const estado = await cardMigrator.checkMigrationStatus();

console.log('Estado:', {
  needsMigration: estado.needsMigration,
  cardsWithoutProcedural: estado.cardsWithoutProcedural,
  totalCards: estado.totalCards,
  lastMigration: estado.lastMigration
});
```

### **📈 Resultados Esperados**

```
{
  needsMigration: true/false,
  cardsWithoutProcedural: 1234,     // Cartas que necesitan actualización
  totalCards: 5000,                 // Total de cartas (excluyendo Mythic)
  lastMigration: {                  // Última migración realizada
    version: '2.0',
    created_at: '2026-03-21T...'
  }
}
```

---

## 🛡️ **Seguridad y Protección**

### **✅ Lo que se PRESERVA:**
- **ID de la carta** - No cambia
- **Datos del usuario** - Se mantienen intactos
- **Colecciones** - No se afectan
- **Historial** - Se conserva
- **Stats básicos** - ATK/DEF/costo se mantienen

### **🔄 Lo que se ACTUALIZA:**
- **Abilities** - Nuevas habilidades procedurales
- **Keywords** - Palabras clave actualizadas
- **Migration version** - Versión de migración
- **Updated at** - Timestamp de actualización

### **🚨 Lo que NO se toca:**
- **Cartas Mythic** - Diseño manual, sin cambios
- **Datos de usuarios** - Completamente seguros
- **Transacciones** - Historial preservado
- **Configuración** - No se modifica

---

## 📊 **Flujo de Migración Detallado**

### **🔄 Paso a Paso:**

```
1. 📋 SELECCIÓN
   └── Seleccionar cartas según estrategia
   └── Excluir Mythic (diseño manual)

2. 🔄 REGENERACIÓN
   └── Llamar a generateCard() con datos existentes
   └── Generar nuevas habilidades procedurales
   └── Validar cada habilidad generada

3. 💾 ACTUALIZACIÓN
   └── Update en base de datos
   └── Preservar campos importantes
   └── Añadir migration_version

4. ✅ VALIDACIÓN
   └── Verificar actualización exitosa
   └── Logging de resultados
   └── Continuar con siguiente lote
```

### **📦 Proceso por Lotes:**

```typescript
// Ejemplo: 5000 cartas en lotes de 50
const totalCartas = 5000;
const batchSize = 50;
const totalLotes = Math.ceil(totalCartas / batchSize); // 100 lotes

// Cada lote toma ~1-2 segundos
// Tiempo total estimado: 2-4 minutos
```

---

## 🚨 **Rollback y Recuperación**

### **🔄 Rollback de Emergencia**

```typescript
// Si algo sale mal, se puede revertir
const rollbackExitoso = await cardMigrator.rollbackMigration('2.0');

if (rollbackExitoso) {
  console.log('✅ Rollback completado - Base de datos restaurada');
} else {
  console.log('❌ Rollback falló - Contactar soporte');
}
```

### **📋 Logs de Migración**

```typescript
// La migración crea logs automáticos
await this.supabase.from('migration_logs').insert({
  version: '2.0',
  total_cards: resultado.totalCards,
  updated_cards: resultado.updatedCards,
  errors_count: resultado.errors.length,
  warnings_count: resultado.warnings.length,
  migration_time: resultado.migrationTime,
  success: resultado.success,
  created_at: new Date().toISOString()
});
```

---

## 🎯 **Escenarios de Uso**

### **📈 Escenario 1: Primera Vez**

```bash
# Verificar estado
npm run migration:check

# Migración incremental segura
npm run migration:incremental
```

### **📊 Escenario 2: Actualización Parcial**

```bash
# Solo actualizar cartas Bronze
npm run migration:rarity BRONZE

# Verificar resultados
npm run migration:status
```

### **🔄 Escenario 3: Testing**

```bash
# Migración de prueba (solo 10 cartas)
npm run migration:test

# Revertir si es necesario
npm run migration:rollback
```

---

## 📊 **Métricas y Monitoreo**

### **📈 KPIs de Migración:**

```typescript
const metrics = {
  totalCartas: 5000,
  cartasActualizadas: 4950,
  tiempoTotal: 180000, // 3 minutos en ms
  errores: 0,
  warnings: 5,
  exito: 100 // 100% éxito
};
```

### **📊 Logs en Tiempo Real:**

```
🔄 Iniciando migración de base de datos de cartas...
📊 Encontradas 1234 cartas para actualizar
📦 Procesando lote 1/25 (50 cartas)...
✅ Lote 1 completado: 50/50 cartas actualizadas
📦 Procesando lote 2/25 (50 cartas)...
...
✅ Migración completada: 1234/1234 cartas actualizadas
```

---

## 🎯 **Recomendaciones**

### **✅ Buenas Prácticas:**

1. **🕐 Horario de baja actividad** - Migrar cuando hay pocos usuarios
2. **📦 Lotes pequeños** - No más de 50 cartas por lote
3. **💾 Backup previo** - Siempre tener backup reciente
4. **🔍 Verificación post-migración** - Correr tests después
5. **📊 Monitoreo** - Observar performance después de migración

### **🚨 Precauciones:**

1. **🔄 No interrumpir** - Dejar completar el proceso
2. **📊 Espacio suficiente** - Verificar espacio en DB
3. **🔐 Permisos** - Tener permisos de escritura
4. **📋 Logging** - Mantener logs para auditoría

---

## 🎮 **Impacto en Usuarios**

### **🎯 ¿Qué verán los usuarios?**

**✅ Después de la migración:**
- **Mismas cartas** con habilidades nuevas y más variadas
- **Misma rareza** y stats básicos
- **Experiencia mejorada** con más combos estratégicos
- **Sin pérdida de progreso** ni colecciones

**🔄 Cambios notables:**
- **Bronze:** Ahora tienen 1 habilidad procedural única
- **Silver:** 1-2 habilidades más interesantes
- **Gold:** 2 habilidades con sinergias
- **Platinum:** 3 habilidades complejas
- **Mythic:** Sin cambios (diseño manual)

---

## 📞 **Soporte y Troubleshooting**

### **🔧 Issues Comunes:**

```typescript
// 1. Error de conexión
if (error.includes('connection')) {
  console.log('Verificar conexión a Supabase');
}

// 2. Permisos insuficientes
if (error.includes('permission')) {
  console.log('Verificar permisos de la tabla cards');
}

// 3. Timeout
if (error.includes('timeout')) {
  console.log('Reducir tamaño de lote o aumentar timeout');
}
```

### **📋 Comandos Útiles:**

```bash
# Verificar estado actual
npm run migration:status

# Ejecutar migración segura
npm run migration:safe

# Ver logs de migración
npm run migration:logs

# Rollback de emergencia
npm run migration:rollback
```

---

## 🎯 **Conclusión**

### **✅ Resumen:**
- **NO necesitas reiniciar la base de datos**
- **Sistema de migración automático y seguro**
- **Se preservan todos los datos existentes**
- **Proceso por lotes para evitar sobrecarga**
- **Rollback disponible si algo falla**

### **🚀 Listo para producción:**
El sistema de migración está diseñado para ser **seguro, eficiente y transparente**. Las cartas existentes se actualizarán automáticamente con nuevas habilidades procedurales **sin perder ningún dato**.

**🎵 MusicTCG - Sistema de Migración v2.0**  
**🛡️ Safe, Automatic, and Non-Destructive**


<!-- Contenido extraído de README_MIGRACION.md -->
# 🚀 GUÍA RÁPIDA DE MIGRACIÓN

## 🎯 **PREGUNTA: ¿Necesito reiniciar la base de datos?**

### **❌ NO - El sistema actualiza automáticamente sin perder datos**

---

## ⚡ **Comandos Rápidos**

```bash
# 1. Verificar estado actual
npm run migration:check

# 2. Migración segura (recomendado)
npm run migration:safe

# 3. Ver resultados
npm run migration:status

# 4. Si algo falla (emergency only)
npm run migration:rollback
```

---

## 📋 **¿Qué hace la migración?**

### **✅ SE ACTUALIZA:**
- Habilidades de las cartas (nuevas habilidades procedurales)
- Keywords de las cartas
- Versión de migración

### **🛡️ SE PRESERVA:**
- IDs de cartas
- Datos de usuarios
- Colecciones
- Historial
- Stats básicos (ATK/DEF/costo)

### **❌ NO SE TOCA:**
- Cartas Mythic (diseño manual)
- Datos de usuarios
- Transacciones

---

## 🎯 **Resultados Esperados**

```
ANTES:
- Bronze: 0-1 habilidades clásicas
- Silver: 1 habilidad clásica  
- Gold: 1-2 habilidades clásicas
- Platinum: 2 habilidades clásicas
- Mythic: Diseño manual

DESPUÉS:
- Bronze: 1 habilidad procedural única
- Silver: 1-2 habilidades procedurales
- Gold: 2 habilidades procedurales
- Platinum: 3 habilidades procedurales  
- Mythic: Diseño manual (sin cambios)
```

---

## 📊 **Tiempo Estimado**

```
📦 1000 cartas: ~30 segundos
📦 5000 cartas: ~2-3 minutos  
📦 10000 cartas: ~5-7 minutos
```

---

## 🚨 **Si Algo Falla**

```bash
# Ver errores
npm run migration:logs

# Rollback a versión anterior
npm run migration:rollback

# Contactar soporte con logs
```

---

## ✅ **Verificación Post-Migración**

```bash
# Test del motor procedural
npm run test:procedural

# Verificar estado final
npm run migration:status

# Revisar logs de éxito
npm run migration:logs
```

---

**🎵 Listo para usar en minutos, no en horas!**


<!-- Contenido extraído de COMBAT_SYSTEM_REWRITE.md -->
# MusicTCG — Combat System Rewrite
## Prompt de Implementación para IA

Este documento contiene todo el código necesario para arreglar el sistema de combate de MusicTCG.
Léelo completo antes de implementar. El orden de implementación importa.

---

## RESUMEN DE PROBLEMAS ENCONTRADOS

### 1. Dos sistemas de estado paralelos que no se sincronizan
`useGameEngine.ts` usa `BoardCard` (con `currentAtk`, `currentDef`, `isTapped`, etc.)
`effectEngine.ts` usa `BoardEntity` (un tipo diferente de `gameState.ts`)
Cuando `playCard` llama a `triggerAbilities → resolveStack → applyEffect`, modifica un objeto `fullState` local que NUNCA escribe de vuelta al estado de React. Los efectos se calculan y se descartan.

### 2. Keywords definidos pero desconectados
`EngineAbilities` en `effectEngine.ts` tiene la lógica de `distortion`, `sustain`, `taunt`, etc., pero `resolveStack` opera sobre `GameState` (el tipo viejo de `types/types.ts`), no sobre el estado real de `PlayerState` de `useGameEngine.ts`. Resultado: cero efectos en combate.

### 3. Race conditions en el bot
`processNextBotAction` usa `setTimeout` encadenado. Si el jugador hace una acción mientras el bot está "pensando", los refs pueden estar stale y el bot actúa sobre estado desactualizado.

### 4. El auto-pass del turno puede dispararse múltiples veces
El `useEffect` que detecta "no puedes hacer nada → endTurn" tiene dependencias que cambian durante el setTimeout, causando múltiples llamadas a `endTurn()`.

### 5. Requisito de 40 cartas
La UI en `app/play/page.tsx` bloquea con `isValid = cardCount === 40`. El `startMatch` rellena con fillers pero el check visual impide comenzar con menos.

### 6. `resolvePendingAttack` lee un ref potencialmente stale
`pendingAttackRef.current` puede haberse actualizado entre que se declara el ataque y se resuelve, especialmente durante la fase REPLICA con timers.

### 7. El `endTurn` no limpia correctamente el estado
Las cartas en `board` no tienen su `stageFright` reseteado correctamente al inicio del turno siguiente. `hasAttacked` tampoco se resetea.

---

## IMPLEMENTACIÓN

### PASO 1: Reemplazar `hooks/useGameEngine.ts` COMPLETO

```typescript
// hooks/useGameEngine.ts
// REEMPLAZAR EL ARCHIVO COMPLETO CON ESTE CONTENIDO

import { useState, useCallback, useEffect, useRef } from 'react';
import { CardData } from '@/lib/engine/generator';
import { Keyword } from '@/types/types';

// ─── Contador global de instancias ───────────────────────────────────────────
let _instanceCounter = 0;

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface BoardCard extends CardData {
  instanceId: string;
  isTapped: boolean;
  stageFright: boolean;    // No puede atacar el turno que entra (salvo FRENZY)
  hasAttacked: boolean;    // Para STEALTH: visible solo tras atacar
  currentAtk: number;
  currentDef: number;
  maxDef: number;          // Para SUSTAIN: recupera al inicio del turno
  isSilenced: boolean;     // Las habilidades no se activan
  statuses: string[];
  bonusAtk: number;
  bonusDef: number;
}

export type PlayerKey = 'player' | 'bot';
export type GameOverResult = 'player' | 'bot' | 'draw' | null;

export interface PlayerState {
  health: number;
  hype: number;
  energy: number;
  maxEnergy: number;
  canPromote: boolean;
  hasMulliganed: boolean;
  deck: CardData[];
  hand: BoardCard[];
  board: BoardCard[];
  backstage: BoardCard[];
  graveyard: CardData[];
}

export interface PendingAttack {
  attackerOwner: PlayerKey;
  attackerIdx: number;
  defenderIdx: number | null;  // null = ataque directo
}

// ─── Fase del turno ───────────────────────────────────────────────────────────

export enum TurnPhase {
  START  = 'START',
  DRAW   = 'DRAW',
  MAIN   = 'MAIN',
  REPLICA = 'REPLICA',
  END    = 'END',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Verifica si una carta tiene un keyword activo (no silenciada).
 * Busca en abilities Y en el array keywords del CardData.
 */
export function hasKw(card: BoardCard | CardData, keyword: Keyword | string): boolean {
  if ((card as BoardCard).isSilenced) return false;
  const inAbilities = card.abilities?.some(a => a.keyword === keyword) ?? false;
  const inKeywords  = card.keywords?.includes(keyword as Keyword) ?? false;
  return inAbilities || inKeywords;
}

function makeBoardCard(card: CardData): BoardCard {
  return {
    ...card,
    instanceId: `${card.id}_${++_instanceCounter}`,
    isTapped: false,
    stageFright: !hasKw(card, Keyword.FRENZY) && !hasKw(card, Keyword.HASTE),
    hasAttacked: false,
    currentAtk: card.atk,
    currentDef: card.def,
    maxDef: card.def,
    isSilenced: false,
    statuses: [],
    bonusAtk: 0,
    bonusDef: 0,
  };
}

const makeInitialPlayer = (): PlayerState => ({
  health: 30,
  hype: 0,
  energy: 1,
  maxEnergy: 1,
  canPromote: true,
  hasMulliganed: false,
  deck: [],
  hand: [],
  board: [],
  backstage: [],
  graveyard: [],
});

// ─── Sistema de efectos de keywords ──────────────────────────────────────────
// Todas las habilidades se resuelven aquí, directamente sobre PlayerState.
// Esto reemplaza el effectEngine.ts que operaba sobre tipos incompatibles.

interface KeywordEffectContext {
  sourceCard: BoardCard;
  sourceOwner: PlayerKey;
  player: PlayerState;
  bot: PlayerState;
  trigger: 'ON_PLAY' | 'ON_DEATH' | 'ON_ATTACK' | 'PASSIVE_START_TURN' | 'ON_ACTIVATE';
}

interface KeywordEffectResult {
  player: PlayerState;
  bot: PlayerState;
  log?: string;
}

/**
 * Motor de efectos principal.
 * Aplica todos los efectos de keywords de una carta según el trigger.
 * Opera directamente sobre copias de PlayerState y devuelve el nuevo estado.
 */
function applyKeywordEffects(ctx: KeywordEffectContext): KeywordEffectResult {
  let { sourceCard, sourceOwner, player, bot, trigger } = ctx;

  // Si está silenciada, no hace nada
  if (sourceCard.isSilenced) return { player, bot };

  const ownState  = sourceOwner === 'player' ? player : bot;
  const oppState  = sourceOwner === 'player' ? bot    : player;
  let newOwn  = { ...ownState };
  let newOpp  = { ...oppState };

  for (const ability of sourceCard.abilities ?? []) {
    if (!ability.keyword) continue;
    const kw = ability.keyword as Keyword | string;

    // ── DISTORSIÓN (TRAMPLE): daño sobrante pasa al oponente ──
    // Se maneja en resolveAttackPure directamente, no aquí.

    // ── HYPE ENGINE: +1 Hype al inicio del turno ──
    if (kw === Keyword.SUSTAIN || kw === 'hypeEngine') {
      if (trigger === 'PASSIVE_START_TURN') {
        if (kw === 'hypeEngine') {
          newOwn = { ...newOwn, hype: newOwn.hype + 1 };
        }
        if (kw === Keyword.SUSTAIN) {
          // Recupera DEF al inicio del turno
          newOwn = {
            ...newOwn,
            board: newOwn.board.map(c =>
              c.instanceId === sourceCard.instanceId
                ? { ...c, currentDef: c.maxDef }
                : c
            ),
          };
        }
      }
    }

    // ── DISS TRACK: al entrar, -1/-1 a una carta rival aleatoria ──
    if (kw === 'dissTrack' || kw === Keyword.DISS_TRACK) {
      if (trigger === 'ON_PLAY' && newOpp.board.length > 0) {
        const targetIdx = Math.floor(Math.random() * newOpp.board.length);
        newOpp = {
          ...newOpp,
          board: newOpp.board.map((c, i) => {
            if (i !== targetIdx) return c;
            const newAtk = Math.max(1, c.currentAtk - 1);
            const newDef = c.currentDef - 1;
            if (newDef <= 0) {
              // La carta muere
              return { ...c, currentAtk: newAtk, currentDef: 0 };
            }
            return { ...c, currentAtk: newAtk, currentDef: newDef };
          }).filter(c => c.currentDef > 0),
        };
      }
    }

    // ── DISTORTION / HYPE ON PLAY ──
    if (kw === Keyword.DISTORTION || kw === 'distortion') {
      // Se maneja en resolveAttackPure. No hace nada en ON_PLAY.
    }

    // ── BASS BOOST: +2 ATK / -1 DEF al entrar ──
    if (kw === Keyword.BASS_BOOST || kw === 'bass_boost') {
      if (trigger === 'ON_PLAY') {
        newOwn = {
          ...newOwn,
          board: newOwn.board.map(c =>
            c.instanceId === sourceCard.instanceId
              ? { ...c, currentAtk: c.currentAtk + 2, currentDef: Math.max(1, c.currentDef - 1) }
              : c
          ),
        };
      }
    }

    // ── FALSETTO: -1 ATK / +2 DEF al entrar ──
    if (kw === Keyword.FALSETTO || kw === 'falsetto') {
      if (trigger === 'ON_PLAY') {
        newOwn = {
          ...newOwn,
          board: newOwn.board.map(c =>
            c.instanceId === sourceCard.instanceId
              ? { ...c, currentAtk: Math.max(1, c.currentAtk - 1), currentDef: c.currentDef + 2, maxDef: c.maxDef + 2 }
              : c
          ),
        };
      }
    }

    // ── CRESCENDO / FRENZY: gana +1 ATK cada vez que ataca ──
    if (kw === Keyword.CRESCENDO || kw === 'frenzy') {
      if (trigger === 'ON_ATTACK') {
        newOwn = {
          ...newOwn,
          board: newOwn.board.map(c =>
            c.instanceId === sourceCard.instanceId
              ? { ...c, currentAtk: c.currentAtk + 1 }
              : c
          ),
        };
      }
    }

    // ── SOUNDTRACK: +1 DEF a todas las criaturas aliadas del mismo género ──
    if (kw === Keyword.SOUNDTRACK || kw === 'soundtrack') {
      if (trigger === 'ON_PLAY') {
        newOwn = {
          ...newOwn,
          board: newOwn.board.map(c => {
            if (c.instanceId === sourceCard.instanceId) return c;
            if (c.genre === sourceCard.genre) {
              return { ...c, currentDef: c.currentDef + 1, maxDef: c.maxDef + 1 };
            }
            return c;
          }),
        };
      }
    }

    // ── DROP: al entrar puede atacar inmediatamente (ya cubierto por !stageFright) ──
    // stageFright = false cuando tiene FRENZY o DROP en makeBoardCard
    if (kw === Keyword.DROP || kw === 'drop') {
      if (trigger === 'ON_PLAY') {
        newOwn = {
          ...newOwn,
          board: newOwn.board.map(c =>
            c.instanceId === sourceCard.instanceId
              ? { ...c, stageFright: false }
              : c
          ),
        };
      }
    }

    // ── FEATURING: +2 ATK si hay otra carta del mismo artista en tablero ──
    if (kw === Keyword.FEATURING || kw === 'featuring') {
      if (trigger === 'ON_PLAY') {
        const hasSameArtist = newOwn.board.some(
          c => c.instanceId !== sourceCard.instanceId && c.artist === sourceCard.artist
        );
        if (hasSameArtist) {
          newOwn = {
            ...newOwn,
            board: newOwn.board.map(c =>
              c.instanceId === sourceCard.instanceId
                ? { ...c, currentAtk: c.currentAtk + 2 }
                : c
            ),
          };
        }
      }
    }

    // ── SAMPLE: copia +1 ATK o DEF de otra carta aliada aleatoria ──
    if (kw === Keyword.SAMPLE || kw === 'sample') {
      if (trigger === 'ON_PLAY') {
        const others = newOwn.board.filter(c => c.instanceId !== sourceCard.instanceId);
        if (others.length > 0) {
          const ref = others[Math.floor(Math.random() * others.length)];
          newOwn = {
            ...newOwn,
            board: newOwn.board.map(c =>
              c.instanceId === sourceCard.instanceId
                ? { ...c, currentAtk: c.currentAtk + 1, currentDef: c.currentDef + 1 }
                : c
            ),
          };
        }
      }
    }

    // ── OUTRO / DISS_TRACK ON DEATH: -1 ATK a carta rival aleatoria ──
    if (kw === Keyword.OUTRO || kw === 'outro') {
      if (trigger === 'ON_DEATH' && newOpp.board.length > 0) {
        const targetIdx = Math.floor(Math.random() * newOpp.board.length);
        newOpp = {
          ...newOpp,
          board: newOpp.board.map((c, i) =>
            i === targetIdx ? { ...c, currentAtk: Math.max(1, c.currentAtk - 1) } : c
          ),
        };
      }
    }

    // ── RADIO EDIT: reduce el costo en 1 (ya se aplicó en el generador, no en combate) ──

    // ── AUTOTUNE: intercambia ATK/DEF al entrar ──
    if (kw === Keyword.AUTOTUNE || kw === 'autotune') {
      if (trigger === 'ON_PLAY') {
        newOwn = {
          ...newOwn,
          board: newOwn.board.map(c => {
            if (c.instanceId !== sourceCard.instanceId) return c;
            return { ...c, currentAtk: c.currentDef, currentDef: c.currentAtk, maxDef: c.currentAtk };
          }),
        };
      }
    }
  }

  // Limpiar cartas muertas (currentDef <= 0) con efectos ON_DEATH
  // Esto se llama externamente tras cada mutación de board.

  if (sourceOwner === 'player') {
    return { player: newOwn, bot: newOpp };
  }
  return { player: newOpp, bot: newOwn };
}

/**
 * Procesa muertes: llama ON_DEATH y elimina cartas con DEF <= 0.
 * Devuelve el estado limpio.
 */
function processDeaths(player: PlayerState, bot: PlayerState): { player: PlayerState; bot: PlayerState } {
  // Muertes del jugador
  const playerDead = player.board.filter(c => c.currentDef <= 0);
  let newPlayer = player;
  let newBot = bot;

  for (const dead of playerDead) {
    const result = applyKeywordEffects({
      sourceCard: dead,
      sourceOwner: 'player',
      player: newPlayer,
      bot: newBot,
      trigger: 'ON_DEATH',
    });
    newPlayer = result.player;
    newBot    = result.bot;
  }

  // Muertes del bot
  const botDead = newBot.board.filter(c => c.currentDef <= 0);
  for (const dead of botDead) {
    const result = applyKeywordEffects({
      sourceCard: dead,
      sourceOwner: 'bot',
      player: newPlayer,
      bot: newBot,
      trigger: 'ON_DEATH',
    });
    newPlayer = result.player;
    newBot    = result.bot;
  }

  return {
    player: {
      ...newPlayer,
      board:     newPlayer.board.filter(c => c.currentDef > 0),
      graveyard: [...newPlayer.graveyard, ...playerDead],
    },
    bot: {
      ...newBot,
      board:     newBot.board.filter(c => c.currentDef > 0),
      graveyard: [...newBot.graveyard, ...botDead],
    },
  };
}

// ─── Resolución de ataques (pura, sin React) ─────────────────────────────────

/**
 * Resuelve un ataque completo y devuelve [playerState, botState] actualizados.
 * Maneja: Choque, Emboscada, Ataque Directo, Distorsión, Taunt, Stealth, VIP.
 */
function resolveAttackPure(
  pState: PlayerState,
  bState: PlayerState,
  attackerOwner: PlayerKey,
  attackerIdx: number,
  defenderIdx: number | null,
): [PlayerState, PlayerState] {
  const atkState = attackerOwner === 'player' ? pState : bState;
  const defState = attackerOwner === 'player' ? bState : pState;

  const attacker = atkState.board[attackerIdx];
  if (!attacker || attacker.isTapped || attacker.stageFright) {
    return [pState, bState];
  }

  // ── Verificar Taunt: si hay cartas con taunt, hay que atacarlas primero ──
  const activeTaunters = defState.board.filter(c => hasKw(c, 'taunt') || hasKw(c, Keyword.PROVOKE));

  // VIP ignora taunt de no-VIP
  const mustAttackTaunters = hasKw(attacker, Keyword.FLYING) || hasKw(attacker, 'vip')
    ? activeTaunters.filter(c => hasKw(c, Keyword.FLYING) || hasKw(c, 'vip'))
    : activeTaunters;

  if (mustAttackTaunters.length > 0) {
    if (defenderIdx === null) return [pState, bState]; // No puede ir directo si hay taunt
    const target = defState.board[defenderIdx];
    if (!target) return [pState, bState];
    const targetHasTaunt = hasKw(target, 'taunt') || hasKw(target, Keyword.PROVOKE);
    if (!targetHasTaunt) return [pState, bState];
  }

  // ── Verificar Stealth/Acústico: invisible hasta que ataca ──
  if (defenderIdx !== null) {
    const defender = defState.board[defenderIdx];
    if (defender && (hasKw(defender, Keyword.STEALTH) || hasKw(defender, 'stealth') || hasKw(defender, 'acoustic')) && !defender.hasAttacked) {
      return [pState, bState]; // No puede ser atacada
    }
  }

  // ── VIP solo puede ser bloqueado por VIP ──
  if (defenderIdx !== null) {
    const defender = defState.board[defenderIdx];
    if (defender) {
      const attackerIsVIP   = hasKw(attacker, Keyword.FLYING) || hasKw(attacker, 'vip');
      const defenderIsVIP   = hasKw(defender, Keyword.FLYING) || hasKw(defender, 'vip');
      const hasVIPTaunters  = activeTaunters.some(c => hasKw(c, Keyword.FLYING) || hasKw(c, 'vip'));

      if (attackerIsVIP && !defenderIsVIP && hasVIPTaunters) {
        return [pState, bState];
      }
    }
  }

  let newAtk = { ...atkState };
  let newDef = { ...defState };

  // Marcar atacante como usado
  newAtk = {
    ...newAtk,
    board: newAtk.board.map((c, i) =>
      i === attackerIdx
        ? { ...c, isTapped: true, hasAttacked: true }
        : c
    ),
  };

  // Aplicar ON_ATTACK keywords (ej: CRESCENDO gana +1 ATK tras atacar)
  const updatedAttacker = newAtk.board[attackerIdx];
  const crescendoResult = applyKeywordEffects({
    sourceCard: updatedAttacker,
    sourceOwner: attackerOwner,
    player: attackerOwner === 'player' ? newAtk : newDef,
    bot:    attackerOwner === 'player' ? newDef : newAtk,
    trigger: 'ON_ATTACK',
  });
  if (attackerOwner === 'player') {
    newAtk = crescendoResult.player;
    newDef = crescendoResult.bot;
  } else {
    newAtk = crescendoResult.bot;
    newDef = crescendoResult.player;
  }

  // Re-leer el atacante con stats actualizados post-ON_ATTACK
  const finalAttacker = newAtk.board[attackerIdx];
  const atkDmg = finalAttacker ? finalAttacker.currentAtk : attacker.currentAtk;

  if (defenderIdx === null) {
    // ── ATAQUE DIRECTO ──
    newDef = { ...newDef, health: Math.max(0, newDef.health - atkDmg) };
  } else {
    const defender = newDef.board[defenderIdx];
    if (!defender) {
      // Objetivo ya no existe (murió por efecto ON_ATTACK)
      // Redirigir a daño directo
      newDef = { ...newDef, health: Math.max(0, newDef.health - atkDmg) };
    } else {
      const isAmbush   = defender.isTapped;
      const defDmg     = isAmbush ? 0 : defender.currentAtk;
      const defDestroyed = atkDmg >= defender.currentDef;
      const atkDestroyed = !isAmbush && defDmg >= finalAttacker!.currentDef;

      // ── DISTORSIÓN: daño sobrante al oponente ──
      const hasDistortion = hasKw(finalAttacker || attacker, Keyword.TRAMPLE) ||
                            hasKw(finalAttacker || attacker, 'distortion');
      const excessOnDef = hasDistortion && defDestroyed
        ? Math.max(0, atkDmg - defender.currentDef)
        : 0;

      const hasDefDistortion = hasKw(defender, Keyword.TRAMPLE) || hasKw(defender, 'distortion');
      const excessOnAtk = !isAmbush && hasDefDistortion && atkDestroyed
        ? Math.max(0, defDmg - (finalAttacker?.currentDef ?? attacker.currentDef))
        : 0;

      // Aplicar daño al defensor
      newDef = {
        ...newDef,
        health: Math.max(0, newDef.health - excessOnDef),
        board: newDef.board.map((c, i) =>
          i === defenderIdx
            ? { ...c, currentDef: c.currentDef - atkDmg }
            : c
        ),
      };

      // Aplicar daño al atacante (solo en Choque)
      if (!isAmbush) {
        newAtk = {
          ...newAtk,
          health: Math.max(0, newAtk.health - excessOnAtk),
          board: newAtk.board.map((c, i) =>
            i === attackerIdx
              ? { ...c, currentDef: c.currentDef - defDmg }
              : c
          ),
        };
      }
    }
  }

  // Procesar muertes con efectos ON_DEATH
  const playerAfterAtk = attackerOwner === 'player' ? newAtk : newDef;
  const botAfterAtk    = attackerOwner === 'player' ? newDef : newAtk;
  const afterDeaths    = processDeaths(playerAfterAtk, botAfterAtk);

  return [afterDeaths.player, afterDeaths.bot];
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useGameEngine() {
  const [player, setPlayer] = useState<PlayerState>(makeInitialPlayer);
  const [bot,    setBot]    = useState<PlayerState>(makeInitialPlayer);
  const [turn,      setTurn]      = useState<PlayerKey>('player');
  const [turnCount, setTurnCount] = useState(1);
  const [phase,     setPhase]     = useState<TurnPhase>(TurnPhase.MAIN);
  const [gameOver,  setGameOver]  = useState<GameOverResult>(null);
  const [pendingAttack, setPendingAttack] = useState<PendingAttack | null>(null);

  // Refs síncronos para acceso sin stale closure
  const playerRef      = useRef(player);
  const botRef         = useRef(bot);
  const turnRef        = useRef(turn);
  const phaseRef       = useRef(phase);
  const gameOverRef    = useRef(gameOver);
  const pendingRef     = useRef(pendingAttack);
  const endTurnLockRef = useRef(false); // Evita doble llamada a endTurn

  useEffect(() => { playerRef.current = player; },      [player]);
  useEffect(() => { botRef.current    = bot;    },      [bot]);
  useEffect(() => { turnRef.current   = turn;   },      [turn]);
  useEffect(() => { phaseRef.current  = phase;  },      [phase]);
  useEffect(() => { gameOverRef.current = gameOver; },  [gameOver]);
  useEffect(() => { pendingRef.current  = pendingAttack; }, [pendingAttack]);

  // ── Detección de victoria ──
  useEffect(() => {
    if (gameOver) return;
    if (player.health <= 0 && bot.health <= 0) { setGameOver('draw');   return; }
    if (player.health <= 0)                     { setGameOver('bot');    return; }
    if (bot.health    <= 0)                     { setGameOver('player'); return; }
    if (player.hype   >= 20)                    { setGameOver('player'); return; }
    if (bot.hype      >= 20)                    { setGameOver('bot');    return; }
  }, [player.health, player.hype, bot.health, bot.hype, gameOver]);

  // ── startGame ──
  const startGame = useCallback((playerDeck: CardData[], botDeck: CardData[]) => {
    _instanceCounter = 0;
    endTurnLockRef.current = false;

    const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

    // Mínimo de cartas: 20. Si el mazo tiene menos, se rellena con copias aleatorias.
    const padDeck = (deck: CardData[], minSize = 20): CardData[] => {
      const shuffled = shuffle(deck);
      while (shuffled.length < minSize) {
        shuffled.push(...shuffle(deck).slice(0, minSize - shuffled.length));
      }
      return shuffled;
    };

    const sp = padDeck(playerDeck);
    const sb = padDeck(botDeck);

    const initPlayer: PlayerState = {
      ...makeInitialPlayer(),
      deck: sp.slice(5),
      hand: sp.slice(0, 5).map(makeBoardCard),
    };
    const initBot: PlayerState = {
      ...makeInitialPlayer(),
      deck: sb.slice(5),
      hand: sb.slice(0, 5).map(makeBoardCard),
    };

    setPlayer(initPlayer);
    setBot(initBot);
    setTurn('player');
    setTurnCount(1);
    setPhase(TurnPhase.MAIN);
    setGameOver(null);
    setPendingAttack(null);
  }, []);

  // ── drawCard ──
  const drawCard = useCallback((target: PlayerKey) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    let milled = false;

    setSt(prev => {
      if (prev.deck.length === 0) {
        milled = true;
        return prev;
      }
      const [drawn, ...rest] = prev.deck;
      return { ...prev, deck: rest, hand: [...prev.hand, makeBoardCard(drawn)] };
    });

    // Mill = pierde la partida
    if (milled) {
      setTimeout(() => setGameOver(target === 'player' ? 'bot' : 'player'), 50);
    }
  }, []);

  // ── playCard ──
  const playCard = useCallback((target: PlayerKey, cardIndex: number) => {
    const setSt  = target === 'player' ? setPlayer : setBot;
    const getOpp = target === 'player' ? () => botRef.current : () => playerRef.current;
    const setOpp = target === 'player' ? setBot    : setPlayer;

    let playedCard: BoardCard | null = null;

    setSt(prev => {
      const card = prev.hand[cardIndex];
      if (!card) return prev;
      if (prev.board.length >= 5 && card.type !== 'EVENT') return prev; // Límite de tablero
      if (prev.energy < card.cost) return prev;

      playedCard = card;
      const newHand    = prev.hand.filter((_, i) => i !== cardIndex);
      const newEnergy  = prev.energy - card.cost;

      if (card.type === 'EVENT') {
        return { ...prev, energy: newEnergy, hand: newHand, backstage: [...prev.backstage, card] };
      }
      return { ...prev, energy: newEnergy, hand: newHand, board: [...prev.board, card] };
    });

    // Aplicar efectos ON_PLAY después del siguiente tick (el estado ya está escrito)
    if (playedCard) {
      const cardSnapshot = playedCard;
      setTimeout(() => {
        const currentOwn = target === 'player' ? playerRef.current : botRef.current;
        const currentOpp = getOpp();

        const result = applyKeywordEffects({
          sourceCard: cardSnapshot,
          sourceOwner: target,
          player: target === 'player' ? currentOwn : currentOpp,
          bot:    target === 'player' ? currentOpp : currentOwn,
          trigger: 'ON_PLAY',
        });

        setPlayer(result.player);
        setBot(result.bot);
      }, 20);
    }
  }, []);

  // ── promoteCard: sacrificar carta de mano para +1 energía máxima ──
  const promoteCard = useCallback((target: PlayerKey, cardIndex: number) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    setSt(prev => {
      if (!prev.canPromote || prev.maxEnergy >= 10) return prev;
      const card = prev.hand[cardIndex];
      if (!card) return prev;
      return {
        ...prev,
        maxEnergy: prev.maxEnergy + 1,
        energy:    prev.energy + 1,
        canPromote: false,
        hand:      prev.hand.filter((_, i) => i !== cardIndex),
        graveyard: [...prev.graveyard, card],
      };
    });
  }, []);

  // ── declareAttack: inicia la fase REPLICA ──
  const declareAttack = useCallback((attackerIdx: number, defenderIdx: number | null) => {
    if (gameOverRef.current || phaseRef.current !== TurnPhase.MAIN) return;
    const attacker = turnRef.current === 'player'
      ? playerRef.current.board[attackerIdx]
      : botRef.current.board[attackerIdx];
    if (!attacker || attacker.isTapped || attacker.stageFright) return;

    const pa: PendingAttack = { attackerOwner: turnRef.current, attackerIdx, defenderIdx };
    setPendingAttack(pa);
    setPhase(TurnPhase.REPLICA);
  }, []);

  // ── resolvePendingAttack: lee el ref para evitar stale closure ──
  const resolvePendingAttack = useCallback(() => {
    const pa = pendingRef.current;
    if (!pa) return;

    // Leer estado actual de los refs (no del closure)
    const [np, nb] = resolveAttackPure(
      playerRef.current,
      botRef.current,
      pa.attackerOwner,
      pa.attackerIdx,
      pa.defenderIdx,
    );

    setPlayer(np);
    setBot(nb);
    setPendingAttack(null);
    setPhase(TurnPhase.MAIN);
  }, []);

  // ── skipReplica ──
  const skipReplica = useCallback(() => {
    if (phaseRef.current === TurnPhase.REPLICA) {
      resolvePendingAttack();
    }
  }, [resolvePendingAttack]);

  // ── intercept: el defensor interpone una carta (cuesta 1 energía) ──
  const intercept = useCallback((interceptorIdx: number) => {
    if (phaseRef.current !== TurnPhase.REPLICA) return;
    const pa = pendingRef.current;
    if (!pa) return;

    const defenderOwner: PlayerKey = pa.attackerOwner === 'player' ? 'bot' : 'player';
    const defState = defenderOwner === 'player' ? playerRef.current : botRef.current;

    if (defState.energy < 1) return;
    const interceptor = defState.board[interceptorIdx];
    if (!interceptor || interceptor.isTapped) return;

    // VIP solo puede interceptar ataques de VIP o a VIP
    const attacker = pa.attackerOwner === 'player'
      ? playerRef.current.board[pa.attackerIdx]
      : botRef.current.board[pa.attackerIdx];

    if (attacker && hasKw(attacker, 'vip') && !hasKw(interceptor, 'vip')) return;

    // Cobrar energía al defensor
    const setSt = defenderOwner === 'player' ? setPlayer : setBot;
    setSt(prev => ({ ...prev, energy: prev.energy - 1 }));

    // Redirigir el ataque al interceptor
    const newPA: PendingAttack = { ...pa, defenderIdx: interceptorIdx };
    setPendingAttack(newPA);

    // Resolver con delay visual
    setTimeout(() => {
      const [np, nb] = resolveAttackPure(
        playerRef.current,
        botRef.current,
        newPA.attackerOwner,
        newPA.attackerIdx,
        newPA.defenderIdx,
      );
      setPlayer(np);
      setBot(nb);
      setPendingAttack(null);
      setPhase(TurnPhase.MAIN);
    }, 600);
  }, []);

  // ── activateBackstage: jugar un evento del backstage ──
  const activateBackstage = useCallback((owner: PlayerKey, backstageIdx: number) => {
    const setSt  = owner === 'player' ? setPlayer : setBot;
    const setOpp = owner === 'player' ? setBot    : setPlayer;
    const getOpp = owner === 'player' ? () => botRef.current : () => playerRef.current;

    let activatedCard: BoardCard | null = null;
    let isReactivation = false;

    setSt(prev => {
      const card = prev.backstage[backstageIdx];
      if (!card) return prev;

      const isEvent = card.type === 'EVENT';
      const cost    = isEvent ? card.cost : 2; // Reactivar criatura al tablero cuesta 2
      if (prev.energy < cost) return prev;

      activatedCard  = card;
      isReactivation = !isEvent;

      const newBackstage = prev.backstage.filter((_, i) => i !== backstageIdx);
      const newEnergy    = prev.energy - cost;

      if (isEvent) {
        // Curación básica al activar un evento
        const heal   = card.rarity === 'GOLD' || card.rarity === 'PLATINUM' ? 4 : 2;
        const newHP  = Math.min(30, prev.health + heal);
        return {
          ...prev,
          health:    newHP,
          energy:    newEnergy,
          backstage: newBackstage,
          graveyard: [...prev.graveyard, card],
        };
      } else {
        // Reactivar criatura al tablero (tapped, con stageFright)
        if (prev.board.length >= 5) return prev;
        const reactivated: BoardCard = { ...card, isTapped: true, stageFright: true };
        return {
          ...prev,
          energy:    newEnergy,
          backstage: newBackstage,
          board:     [...prev.board, reactivated],
        };
      }
    });

    // Aplicar ON_PLAY del evento activado
    if (activatedCard && !isReactivation) {
      const cardSnapshot = activatedCard;
      setTimeout(() => {
        const currentOwn = owner === 'player' ? playerRef.current : botRef.current;
        const currentOpp = getOpp();
        const result = applyKeywordEffects({
          sourceCard: cardSnapshot,
          sourceOwner: owner,
          player: owner === 'player' ? currentOwn : currentOpp,
          bot:    owner === 'player' ? currentOpp : currentOwn,
          trigger: 'ON_PLAY',
        });
        setPlayer(result.player);
        setBot(result.bot);
      }, 20);
    }

    // Si estamos en REPLICA, resolver tras activar
    if (phaseRef.current === TurnPhase.REPLICA) {
      setTimeout(() => resolvePendingAttack(), 800);
    }
  }, [resolvePendingAttack]);

  // ── retireCard: mover carta del tablero al backstage ──
  const retireCard = useCallback((owner: PlayerKey, boardIdx: number) => {
    const setSt = owner === 'player' ? setPlayer : setBot;
    setSt(prev => {
      if (prev.energy < 1) return prev;
      const card = prev.board[boardIdx];
      if (!card) return prev;
      return {
        ...prev,
        energy:    prev.energy - 1,
        board:     prev.board.filter((_, i) => i !== boardIdx),
        backstage: [...prev.backstage, card],
      };
    });
  }, []);

  // ── endTurn ──
  const endTurn = useCallback(() => {
    if (endTurnLockRef.current) return;
    if (phaseRef.current !== TurnPhase.MAIN && phaseRef.current !== TurnPhase.END) return;
    if (gameOverRef.current) return;

    endTurnLockRef.current = true;

    const currentTurn  = turnRef.current;
    const nextTurn: PlayerKey = currentTurn === 'player' ? 'bot' : 'player';

    // 1. Limpiar el turno actual (descartar si mano > 7)
    const setCurrentSt = currentTurn === 'player' ? setPlayer : setBot;
    setCurrentSt(prev => {
      const hand = prev.hand.length > 7 ? prev.hand.slice(0, 7) : prev.hand;
      return { ...prev, hand };
    });

    // 2. Preparar el nuevo turno
    const setNextSt = nextTurn === 'player' ? setPlayer : setBot;
    setNextSt(prev => {
      const newMaxEnergy = Math.min(10, prev.maxEnergy + 1);

      // Desendrezan todas las cartas del tablero
      const untappedBoard = prev.board.map(c => ({
        ...c,
        isTapped:    false,
        stageFright: false,
        hasAttacked: false,
      }));

      return {
        ...prev,
        energy:    newMaxEnergy,
        maxEnergy: newMaxEnergy,
        canPromote: true,
        board: untappedBoard,
      };
    });

    // 3. Cambiar turno y fase
    setTurn(nextTurn);
    if (nextTurn === 'player') setTurnCount(c => c + 1);
    setPhase(TurnPhase.START);

    setTimeout(() => {
      endTurnLockRef.current = false;
    }, 100);
  }, []);

  // ── Avance automático de fases START → DRAW → MAIN ──
  useEffect(() => {
    if (gameOver) return;

    if (phase === TurnPhase.START) {
      // Aplicar efectos pasivos de inicio de turno (SUSTAIN, HYPE ENGINE, etc.)
      const currentTurn = turnRef.current;
      const currentState = currentTurn === 'player' ? playerRef.current : botRef.current;
      const oppState     = currentTurn === 'player' ? botRef.current    : playerRef.current;

      let newOwn = { ...currentState };
      let newOpp = { ...oppState };

      for (const card of currentState.board) {
        const result = applyKeywordEffects({
          sourceCard: card,
          sourceOwner: currentTurn,
          player: currentTurn === 'player' ? newOwn : newOpp,
          bot:    currentTurn === 'player' ? newOpp : newOwn,
          trigger: 'PASSIVE_START_TURN',
        });
        if (currentTurn === 'player') { newOwn = result.player; newOpp = result.bot; }
        else                          { newOwn = result.bot;    newOpp = result.player; }
      }

      setPlayer(currentTurn === 'player' ? newOwn : newOpp);
      setBot(currentTurn    === 'player' ? newOpp : newOwn);

      const timer = setTimeout(() => setPhase(TurnPhase.DRAW), 600);
      return () => clearTimeout(timer);
    }

    if (phase === TurnPhase.DRAW) {
      const timer = setTimeout(() => {
        drawCard(turnRef.current);
        setPhase(TurnPhase.MAIN);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [phase, gameOver, drawCard]);

  // ── Auto-pass: si el jugador no puede hacer nada, pasa automáticamente ──
  // Solo aplica al jugador humano (el bot tiene su propio loop)
  useEffect(() => {
    if (turn !== 'player' || phase !== TurnPhase.MAIN || gameOver || pendingAttack) return;

    const p = playerRef.current;
    const canPlayHand       = p.hand.some(c => c.cost <= p.energy && (p.board.length < 5 || c.type === 'EVENT'));
    const canActivateBS     = p.backstage.some(c => c.cost <= p.energy);
    const canPromote        = p.canPromote && p.maxEnergy < 10 && p.hand.length > 0;
    const canAttack         = p.board.some(c => !c.isTapped && !c.stageFright);
    const canRetire         = p.board.length > 0 && p.energy >= 1;

    if (!canPlayHand && !canActivateBS && !canPromote && !canAttack && !canRetire) {
      const timer = setTimeout(() => {
        if (turnRef.current === 'player' && phaseRef.current === TurnPhase.MAIN && !gameOverRef.current) {
          endTurn();
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [turn, phase, gameOver, pendingAttack, player.energy, player.hand.length, player.board.length, endTurn]);

  // ── doMulligan ──
  const doMulligan = useCallback((target: PlayerKey) => {
    const setSt = target === 'player' ? setPlayer : setBot;
    setSt(prev => {
      if (prev.hasMulliganed) return prev;
      const allCards = [...prev.deck, ...prev.hand].sort(() => Math.random() - 0.5);
      return {
        ...prev,
        deck: allCards.slice(5),
        hand: allCards.slice(0, 5).map(makeBoardCard),
        hasMulliganed: true,
      };
    });
  }, []);

  // Las próximas 3 cartas del mazo del jugador (para previsualización)
  const nextDraws = player.deck.slice(0, 3);

  return {
    player, bot, turn, turnCount, phase, gameOver, pendingAttack,
    startGame, playCard, promoteCard, declareAttack,
    resolvePendingAttack, skipReplica, intercept,
    activateBackstage, retireCard, endTurn, doMulligan,
    playerRef, botRef,
    nextDraws,
  };
}
```

---

### PASO 2: Reemplazar la función `hasKw` en `app/play/page.tsx`

Importar `hasKw` desde el hook en lugar de redefinirla:

```typescript
// En app/play/page.tsx, línea ~2, cambiar:
// import { useGameEngine, BoardCard, hasKw } from '@/hooks/useGameEngine';
// Ya está correcto, no hay que cambiar la importación.
// PERO hay que asegurarse de que TurnPhase se importa del hook, no de types:

import { useGameEngine, BoardCard, hasKw, TurnPhase } from '@/hooks/useGameEngine';
// Eliminar cualquier import de TurnPhase desde '@/lib/engine/gameState'
```

---

### PASO 3: Arreglar el requisito de 40 cartas en `app/play/page.tsx`

Buscar esta línea:
```typescript
const isValid = cardCount === 40; // Arena focus: exact 40
```

Reemplazar con:
```typescript
const isValid = cardCount >= 20; // Mínimo 20 cartas para jugar
```

Buscar este texto en la UI del deck selector:
```typescript
{cardCount} / 40 CARS
```
Reemplazar con:
```typescript
{cardCount} / {cardCount >= 20 ? '✓' : '20 mín'} CARS
```

Buscar:
```typescript
<span className={`text-sm font-black tracking-widest uppercase ${isValid ? 'text-green-400' : 'text-red-400'}`}>
  {cardCount} / 40 CARS
</span>
{!isValid && <span className="text-[10px] text-gray-500 uppercase font-black tracking-tighter italic">Se requieren 40 cartas</span>}
```

Reemplazar con:
```typescript
<span className={`text-sm font-black tracking-widest uppercase ${isValid ? 'text-green-400' : 'text-red-400'}`}>
  {cardCount} / 20+ CARS
</span>
{!isValid && <span className="text-[10px] text-gray-500 uppercase font-black tracking-tighter italic">Mínimo 20 cartas</span>}
```

---

### PASO 4: Arreglar el `startMatch` en `app/play/page.tsx`

Buscar el bloque donde se rellena el mazo del jugador con fillers:
```typescript
while (playerDeckArr.length < 40) {
  playerDeckArr.push(generateCard({ trackId: 'f_' + playerDeckArr.length, ... }));
}
```

**Eliminar ese bloque completo**. El `startGame` del hook ya hace el padding automáticamente con `padDeck`.

---

### PASO 5: Arreglar el import de `TurnPhase` en `app/play/page.tsx`

Buscar:
```typescript
import { TurnPhase } from '@/lib/engine/gameState';
```
Reemplazar con:
```typescript
import { TurnPhase } from '@/hooks/useGameEngine';
```

Si hay otros archivos que importen `TurnPhase` de `@/lib/engine/gameState`, también cambiarlos al hook. Específicamente revisar `hooks/useBotMatch.ts`.

---

### PASO 6: Actualizar `makeBoardCard` para reconocer más keywords de "no stageFright"

En el nuevo `useGameEngine.ts` (ya incluido arriba), `makeBoardCard` hace:
```typescript
stageFright: !hasKw(card, Keyword.FRENZY) && !hasKw(card, Keyword.HASTE),
```

También hay que incluir el keyword `Drop` que se usa en el generador:
```typescript
stageFright: !hasKw(card, Keyword.FRENZY) 
          && !hasKw(card, Keyword.HASTE) 
          && !hasKw(card, Keyword.DROP)
          && !hasKw(card, 'drop')
          && !hasKw(card, 'frenzy'),
```

Este cambio ya está incluido en el código del PASO 1 (en `makeBoardCard`). No hay que modificarlo por separado.

---

### PASO 7: Arreglar el bot AI en `app/play/page.tsx`

El bot usa `botPlayTurn` de `lib/engine/singleplayerBot.ts`. El problema es que `processNextBotAction` no verifica si el juego terminó antes de procesar cada acción. Buscar la función `processNextBotAction` y reemplazar:

```typescript
const processNextBotAction = useCallback(() => {
  if (botActionQueue.current.length === 0 || gameOver) {
    botProcessing.current = false;
    return;
  }

  const action = botActionQueue.current.shift()!;
  const delay = action.type === 'ATTACK' ? 1200 : action.type === 'END_TURN' ? 600 : 800;

  setTimeout(() => {
    // CRÍTICO: re-verificar gameOver antes de ejecutar
    if (gameOverRef.current) {
      botProcessing.current = false;
      botActionQueue.current = [];
      return;
    }

    // CRÍTICO: re-verificar que seguimos en turno del bot
    if (turnRef.current !== 'bot') {
      botProcessing.current = false;
      botActionQueue.current = [];
      return;
    }

    switch (action.type) {
      case 'PROMOTE':
        if (botRef.current.hand[action.cardIndex]) {
          promoteCard('bot', action.cardIndex);
        }
        break;
      case 'PLAY_CARD':
        if (botRef.current.hand[action.cardIndex]) {
          playCard('bot', action.cardIndex);
        }
        break;
      case 'ACTIVATE_BACKSTAGE':
        if (botRef.current.backstage[action.backstageIndex]) {
          activateBackstage('bot', action.backstageIndex);
        }
        break;
      case 'ATTACK': {
        const attacker = botRef.current.board[action.attackerIndex];
        if (attacker && !attacker.isTapped && !attacker.stageFright) {
          declareAttack(action.attackerIndex, action.targetIndex);
          // No llamar processNextBotAction aquí: la REPLICA lo hará
          return;
        }
        break;
      }
      case 'END_TURN':
        endTurn();
        botProcessing.current = false;
        return;
    }

    // Continuar con la siguiente acción en el siguiente tick
    setTimeout(() => processNextBotAction(), 50);
  }, delay);
}, [gameOver, promoteCard, playCard, activateBackstage, declareAttack, endTurn]);
```

---

### PASO 8: Arreglar la réplica del bot en `app/play/page.tsx`

El bot necesita resolver la réplica (skipReplica o intercept) después de que el jugador ataca.
Buscar el useEffect de "Bot AI for Replica" y reemplazar:

```typescript
// ── Bot AI for Replica (cuando el jugador ataca y el bot debe responder) ──
useEffect(() => {
  if (phase !== TurnPhase.REPLICA || turn !== 'player' || !pendingAttack) return;

  const timer = setTimeout(() => {
    if (gameOverRef.current) return;

    const b = botRef.current;
    const attackerCard = playerRef.current.board[pendingAttack.attackerIdx] || null;
    const isDirectAttack = pendingAttack.defenderIdx === null;

    const response = botReplicaResponse(b, attackerCard, isDirectAttack, difficulty);

    if (response.action === 'intercept' && response.interceptorIdx !== undefined) {
      // Verificar que la carta interceptora sigue existiendo
      const interceptor = b.board[response.interceptorIdx];
      if (interceptor && !interceptor.isTapped && b.energy >= 1) {
        intercept(response.interceptorIdx);
        return;
      }
    }
    
    if (response.action === 'backstage' && response.backstageIdx !== undefined) {
      const bs = b.backstage[response.backstageIdx];
      if (bs && b.energy >= bs.cost) {
        activateBackstage('bot', response.backstageIdx);
        return;
      }
    }

    // Default: dejar pasar
    skipReplica();
  }, 1500);

  return () => clearTimeout(timer);
}, [phase, turn, pendingAttack]);
```

---

### PASO 9: Arreglar la réplica del jugador (timer)

El jugador tiene 5 segundos para responder cuando el bot ataca.
Buscar el useEffect del timer de réplica y reemplazar:

```typescript
const [replicaTimeLeft, setReplicaTimeLeft] = useState(5);

useEffect(() => {
  // Solo cuando el bot ataca y es turno del jugador para responder
  if (phase !== TurnPhase.REPLICA || turn !== 'bot') return;

  setReplicaTimeLeft(5);
  const interval = setInterval(() => {
    setReplicaTimeLeft(prev => {
      if (prev <= 1) {
        clearInterval(interval);
        // Solo skipear si seguimos en réplica
        if (phaseRef.current === TurnPhase.REPLICA) {
          skipReplica();
        }
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(interval);
}, [phase, turn]); // No incluir skipReplica en deps para evitar re-creación del interval
```

---

### PASO 10: Arreglar el processNextBotAction para continuar después de REPLICA

Cuando el bot declara un ataque, el juego entra en REPLICA y el bot debe esperar.
Después de que se resuelve la réplica (volta a MAIN), el bot debe continuar su cola.

Buscar el useEffect que dispara el bot cuando phase cambia a MAIN:

```typescript
useEffect(() => {
  if (turn !== 'bot' || !matchStarted || gameOver || phase !== TurnPhase.MAIN) return;
  
  // Si el bot ya tiene acciones en cola (venía de un ATTACK), continuar
  if (botProcessing.current && botActionQueue.current.length > 0) {
    setTimeout(() => processNextBotAction(), 800);
    return;
  }

  // Si el bot no estaba procesando, es un turno nuevo
  if (botProcessing.current) return;

  const startTimer = setTimeout(() => {
    if (gameOverRef.current || turnRef.current !== 'bot') return;
    const actions = botPlayTurn(
      { botState: botRef.current, playerState: playerRef.current, turnCount },
      difficulty
    );
    botActionQueue.current = actions;
    botProcessing.current  = true;
    processNextBotAction();
  }, 1500);

  return () => clearTimeout(startTimer);
}, [turn, matchStarted, gameOver, phase, turnCount]);
```

---

### PASO 11: Limpiar la cola del bot al cambiar de turno

Cuando el turno cambia de bot a player, limpiar la cola para evitar acciones fantasma:

```typescript
// Añadir este useEffect en app/play/page.tsx
useEffect(() => {
  if (turn === 'player') {
    // Limpiar estado del bot
    botActionQueue.current = [];
    botProcessing.current  = false;
  }
}, [turn]);
```

---

### PASO 12: Eliminar imports obsoletos

En `app/play/page.tsx`, eliminar:
```typescript
import { TurnPhase } from '@/lib/engine/gameState';
```

En `hooks/useGameEngine.ts`, ya no se importa nada de `lib/engine/effectEngine` ni de `lib/engine/gameState`. El nuevo archivo es autosuficiente.

---

## RESUMEN DE ARCHIVOS A MODIFICAR

| Archivo | Acción |
|---|---|
| `hooks/useGameEngine.ts` | **REEMPLAZAR COMPLETO** (Paso 1) |
| `app/play/page.tsx` | Modificar en 8 puntos (Pasos 2-11) |
| No tocar | `lib/engine/effectEngine.ts`, `lib/engine/gameState.ts`, `types/types.ts` |

---

## VERIFICACIÓN POST-IMPLEMENTACIÓN

Después de implementar, verificar estos escenarios:

1. **Mazo de 20 cartas**: Crear un mazo con 20 cartas → debe poder iniciar partida
2. **FRENZY/DROP**: Una carta con keyword `frenzy` o `drop` → puede atacar el turno que entra
3. **TAUNT/PROVOKE**: Con una carta con `taunt` en tablero → el atacante no puede ir directo
4. **STEALTH**: Una carta con `stealth` sin haber atacado → no puede ser objetivo
5. **DISTORSIÓN**: Carta con `distortion` ataca a una de 1 DEF con 5 ATK → 4 de daño directo al oponente
6. **SUSTAIN**: Al inicio del turno, carta con `sustain` recupera toda su DEF
7. **CRESCENDO**: Carta con `crescendo` gana +1 ATK cada vez que ataca
8. **DISS TRACK**: Al entrar, reduce -1/-1 a carta rival aleatoria
9. **Sin bloqueo de turno**: El bot no se queda colgado entre REPLICA y MAIN
10. **endTurn no se llama doble**: El lock previene doble llamada

---

## NOTAS IMPORTANTES

- **NO simplificar** la lógica de réplica ni el sistema de turnos. Se mantienen todas las fases.
- El keyword `Keyword.FRENZY` está en el enum pero en el generador se usa la string `'frenzy'`. El `hasKw` del nuevo código verifica ambos.
- `applyKeywordEffects` es una función pura: nunca llama a setPlayer/setBot directamente. Solo devuelve nuevos estados.
- `processDeaths` también es pura y siempre se llama después de `resolveAttackPure`.
- El padding del mazo (`padDeck`) rellena con copias de las mismas cartas, NO con cartas generadas aleatoriamente. Esto mantiene la identidad del mazo del jugador.


<!-- Contenido extraído de DOCUMENTACION_PROYECTO.md -->
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


<!-- Contenido extraído de DOCUMENTATION.md -->
# MusicTCG - Documentación Técnica y de Diseño

Este documento sirve como la fuente de verdad (Single Source of Truth) para la arquitectura, diseño y lógica de **MusicTCG**, un juego de cartas coleccionables procedural basado en la vida real.

## 1. Visión General
MusicTCG convierte cualquier canción existente en Apple Music en una carta jugable. Utiliza un **Hash Determinista** para asegurar que la misma canción siempre genere las mismas estadísticas y habilidades, permitiendo un catálogo infinito sin necesidad de almacenar millones de cartas en una base de datos.

## 2. Stack Tecnológico
- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS (Estilo Minimalista, inspirado en Spotify)
- **Animaciones:** Framer Motion (`motion/react`)
- **Iconos:** Lucide React
- **Estado Global:** Zustand (Persistido en LocalStorage para la fase actual)
- **API de Datos:** iTunes Search API (Apple Music)

## 3. Arquitectura de Carpetas
- `/app`: Rutas de la aplicación (Home, Search, Studio, Store, Play).
- `/components/ui`: Componentes base (botones, modales).
- `/components/cards`: Renderizado visual de las cartas (`Card.tsx`).
- `/components/navigation`: Barra de navegación inferior (`TabBar.tsx`).
- `/lib/engine`: El "Cerebro" del juego. Contiene el generador procedural (`generator.ts`).
- `/store`: Gestión del estado global del jugador (Inventario, Regalías, Comodines, Mazos).

## 4. El Motor Procedural (El Hash)
Ubicación: `/lib/engine/generator.ts`

El corazón del juego. Transforma un objeto JSON de la API de Apple Music en una `CardData` jugable.
1. **Semilla (Seed):** Utiliza el `trackId` de Apple Music para alimentar un generador de números pseudoaleatorios (Mulberry32). Esto garantiza que "Bohemian Rhapsody" siempre tenga exactamente las mismas estadísticas para todos los jugadores.
2. **Coste y Rareza:** Se simula la popularidad generando un coste de Energía (1 a 8) y asignando una rareza (Bronce, Plata, Oro, Platino).
3. **Presupuesto de Stats:** Fórmula: `(Coste * 2) + 1`.
4. **Filtro de Eventos:** Si el título contiene palabras como "Live", "Remix" o "Intro", la carta se convierte en un `EVENT` (Backstage), perdiendo sus stats de combate pero ganando habilidades pasivas/activas.
5. **Sinergia de Géneros:** El `primaryGenreName` dicta la "personalidad" de la carta. El Rock tiende a tener "Distorsión" y más Ataque; el Pop tiene "Motor de Hype" y más Defensa.
6. **Impuestos y Privilegio de la Fama:** Las habilidades cuestan puntos del presupuesto base. Las cartas Oro y Platino reciben un "descuento" en este impuesto, haciéndolas más poderosas (Factor Chase).
7. **Arte Extendido (Full-Art):** Las cartas que no poseen habilidades especiales utilizan un diseño de arte extendido donde la portada del álbum ocupa todo el fondo de la carta.

## 5. Economía, Persistencia y Progresión
Ubicación: `/store/usePlayerStore.ts`

El juego utiliza un sistema de economía inspirado en MTG Arena y Hearthstone:
- **Regalías (Moneda Blanda):** Se usan para comprar sobres en la Tienda.
- **Comodines (Wildcards):** Material de crafteo (Bronce, Plata, Oro, Platino).
- **Regla del Play-set (Límite de 4):** Un jugador solo puede tener 4 copias exactas de una carta. Si obtiene una 5ª copia en un sobre, el sistema la destruye automáticamente y le otorga 1 Comodín de la misma rareza.
- **Sistema de Crafteo (Contratos):** Los jugadores pueden gastar 1 Comodín de una rareza específica para "contratar" (crear) una copia de cualquier carta de esa misma rareza desde "La Disquera".
- **Sistema de Molienda (Milling):** Implementado en `usePlayerStore.ts` a través del método `millCard(cardId: string)`. Al invocar este método, se decrementa el contador de la carta en el `inventory` y se elimina de los mazos si la cantidad restante es menor a la requerida. En lugar de otorgar Regalías, incrementa el estado `wildcardProgress[rarity]`. Cuando `wildcardProgress[rarity] >= 5`, se reinicia a 0 y se incrementa `wildcards[rarity] += 1`. Todo esto ocurre dentro de una única transacción síncrona de Zustand para evitar condiciones de carrera.

## 6. Interfaces y Lógica (UI/UX)
El diseño sigue una estética "Spotify-Dark" (`#121212` y `#000000`) para que la navegación sea intuitiva y la atención se centre en el arte de los álbumes.

- **La Disquera (`/search`):** Buscador global conectado a Apple Music. Permite previsualizar cualquier carta del mundo. Incluye la funcionalidad de **Crafteo**, donde los usuarios pueden gastar comodines para añadir la carta buscada a su colección.
- **La Tienda (`/store`):** Donde los jugadores gastan Regalías para abrir sobres. 
  - **Lógica de Sobres:** Al comprar un sobre, se realiza una búsqueda aleatoria en la API de iTunes basada en términos predefinidos (ej. géneros, décadas). Las canciones obtenidas se pasan por el Motor Procedural para generar las cartas.
  - **Animaciones:** Utiliza `framer-motion` para crear una experiencia de "unboxing" revelando las cartas una por una con animaciones de escalado y rotación. Si se obtiene una 5ª copia, se muestra una notificación visual de conversión a comodín.
- **El Estudio (`/studio`):** El gestor de colección y mazos.
  - **Colección:** Muestra el inventario local del jugador y sus comodines disponibles. Permite seleccionar cartas para ver sus detalles y **Molerlas** para obtener progreso de comodines. Incluye un botón de **Play** para escuchar una previsualización de la canción.
  - **Deckbuilder (Mazos):** Permite crear, editar y eliminar mazos. Los jugadores pueden añadir hasta 60 cartas a un mazo, respetando el límite de 4 copias por carta y la cantidad que poseen en su inventario.
- **El Escenario (`/play`):** El modo de combate (Prototipo).
  - **La Radio del Duelo:** Al iniciar un combate, se crea automáticamente una lista de reproducción mezclando las canciones del mazo seleccionado.
  - **Interactividad Dinámica:** Botones para simular eventos de combate que afectan el audio (ej. "scratch" y bajada de volumen al destruir una carta, subida de volumen y efectos visuales al ganar).
  - **Visualizador:** Un anillo animado alrededor de la portada de la canción actual que reacciona al estado de reproducción.
- **Perfil (`/profile`):** Configuración y cuenta de usuario.
  - Permite ajustar el volumen global del juego.
  - Incluye opciones para iniciar/cerrar sesión (preparado para Firebase Auth).
  - Contiene una "Zona de Peligro" para restablecer todos los datos locales.
  - **Internacionalización (i18n):** Sistema de idiomas dinámico (`lib/i18n.ts`) que detecta el idioma del navegador por defecto y permite cambiar entre Español e Inglés.

## 7. Sistema de Audio
Ubicación: `/store/useMusicPlayer.ts` y `/components/ui/MiniPlayer.tsx`

El juego integra un sistema de reproducción de audio global que persiste a través de las diferentes pantallas.
- **MiniPlayer:** Un reproductor persistente en la parte inferior de la pantalla que muestra la canción actual, controles de reproducción y volumen.
- **Preescucha:** Las cartas generadas intentan obtener una `previewUrl` de la API de iTunes, permitiendo a los jugadores escuchar un fragmento de la canción desde La Disquera o El Estudio.
- **Integración en Combate:** El sistema de audio se utiliza para "La Radio del Duelo", creando una experiencia inmersiva donde la música reacciona a los eventos del juego.

## 8. Base de Datos y Autenticación (Supabase)
El proyecto está configurado para utilizar **Supabase** como backend (PostgreSQL) y sistema de autenticación (Supabase Auth).
- **Inicialización:** Los clientes de Supabase se instancian en `lib/supabase.ts` utilizando las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Seguridad (RLS):** Supabase utiliza Row Level Security (RLS) en PostgreSQL para asegurar que los usuarios solo puedan leer y escribir sus propios datos, basándose en su ID de usuario.

## v1.4.0 - MTG Oracle System & Artwork Enrichment (Actual)
*   **Sistema de Habilidades "Magic: The Gathering":** Se ha migrado toda la lógica de visualización de habilidades al estilo de las cartas físicas de MTG.
    *   **Iconografía Oracle:** Uso de glifos específicos para tipos de habilidades (◆ Pasiva, ⟡ Disparada, ❂ Activada, ◈ Regla).
    *   **Categorización por Color:** Las palabras clave ahora tienen colores específicos según su categoría (ej. Rojo para Ofensa, Azul para Defensa, Esmeralda para Robo).
    *   **Badges de Tipo en Español:** Traducción de triggers y tipos de habilidades para mayor accesibilidad.
*   **Enriquecimiento de Artwork (Visual Variety):**
    *   **Sistema de Arte Alternativo:** Implementación de un selector de arte en el modal de inspección que permite elegir entre la portada oficial, miniaturas de YouTube o arte alternativo de Cover Art Archive.
    *   **Variantes Determinísticas:** Cada canción genera una variante visual única basándose en un hash de su ID. Incluye recortes (crops) aleatorios y filtros de color sutiles para que cartas del mismo álbum se vean distintas.
    *   **Priorización de YouTube:** Integración inteligente que busca el thumbnail del videoclip oficial para ofrecer una experiencia más audiovisual.
*   **Identidad Visual de Eventos:**
    *   **Rediseño Temático:** Las cartas de tipo EVENTO ahora cuentan con un marco sombrío, glifos místicos rotatorios y una paleta de colores púrpuras.
    *   **Limpieza de UI:** Se eliminan los indicadores de ATK/DEF para eventos, resaltando su naturaleza de "hechizo" o "ritual".
*   **Optimización de Inspección:** Modal de inspección escalado a un tamaño mucho mayor (hasta 30rem) para mejorar la legibilidad del "Oracle Text" y las letras.
*   **Corrección de Build:** Limpieza de artefactos obsoletos (`.next`) para resolver errores de hidratación y módulos no encontrados.

## v1.3.1 - Bug fixes y Estabilidad
... (mantener historial previo)
mplementen nuevas fases del GDD (como el motor de combate multijugador completo en `/play`).*


<!-- Contenido extraído de FASE_2_INTEGRACION.md -->
# 🚀 FASE 2: INTEGRACIÓN DEL MOTOR PROCEDURAL

## 📋 **Resumen de Implementación**

### **✅ 1. Integración con `generator.ts`**
- **Función `generateCard` ahora es `async`**
- **Import dinámico** del motor procedural (evita errores si no está disponible)
- **Fallback automático** a sistema clásico si falla procedural
- **SOLO para BRONZE → PLATINUM** (MYTHIC sigue siendo diseño manual)
- **Logging detallado** para debugging

```typescript
// Nueva integración en generator.ts
if (rarity !== 'MYTHIC') {
  try {
    const { proceduralAbilityEngine, convertToGeneratedAbility } = await import('./proceduralAbilityEngine');
    const proceduralResult = proceduralAbilityEngine.generate(variantId, rarity, cost, seed);
    
    if (proceduralResult.abilities.length > 0) {
      abilities.splice(0, abilities.length, ...proceduralAbilities);
    }
  } catch (error) {
    console.warn('⚠️ Procedural generation failed, using fallback:', error);
  }
}
```

### **✅ 2. Suite de Testing Completa**
- **`proceduralTesting.ts`** - 6 tests diferentes
- **`testProcedural.ts`** - Script de ejecución
- **Scripts en package.json** para fácil ejecución

#### **Tests Implementados:**
1. **Generación Básica** - Verifica que todas las rarezas generen habilidades
2. **Performance** - Mide tiempos de generación y cache
3. **Balance** - Verifica distribución de riesgos
4. **Integración** - Test con `generator.ts` completo
5. **Validación** - Casos límite y edge cases
6. **Cache** - Verifica funcionamiento del cache

### **✅ 3. Sistema de Ejecución**
```bash
# Test completo
npm run test:procedural

# Test rápido
npm run test:procedural:quick

# Alias
npm run test:abilities
```

---

## 🎯 **Resultados Esperados**

### **Performance:**
- **Tiempo promedio:** < 5ms por generación
- **Cache hit rate:** > 80% después de primeras generaciones
- **Memory usage:** < 10MB para 10,000 entradas en cache

### **Balance:**
- **Riesgo Bajo:** ~60% de habilidades
- **Riesgo Medio:** ~30% de habilidades  
- **Riesgo Alto:** ~10% de habilidades
- **Rotas:** 0 (validación previene)

### **Generación:**
- **BRONZE:** 1 habilidad (siempre)
- **SILVER:** 1-2 habilidades
- **GOLD:** 2 habilidades
- **PLATINUM:** 3 habilidades
- **MYTHIC:** Diseño manual (no procedural)

---

## 🛡️ **Seguridad y Validación**

### **Protecciones Implementadas:**
1. **No infinite loops** (ENERGY_RAMP + AURA prohibido)
2. **No combos rotos** (MIND_CONTROL + ALL prohibido)
3. **Restricciones por costo** (ENERGY_RAMP solo en cartas caras)
4. **Validación en 3 niveles** (Matemática → Lógica → Balance)
5. **Fallback automático** si algo falla

### **Sistema de Riesgo:**
- **LOW:** Habilidades seguras, predecibles
- **MEDIUM:** Habilidades potentes pero balanceadas
- **HIGH:** Habilidades muy potentes, requieren estrategia
- **BROKEN:** No debe llegar aquí (validación previene)

---

## 📊 **Métricas de Monitoreo**

### **Logs Automáticos:**
```typescript
console.log(`🎯 Procedural abilities generated for ${track.trackName}:`, {
  count: proceduralResult.abilities.length,
  riskLevel: proceduralResult.riskLevel,
  generationTime: proceduralResult.generationTime,
  cacheHit: proceduralResult.cacheHit
});
```

### **Estadísticas del Motor:**
- **Cache size:** Entradas actuales en cache
- **Cache hits/misses:** Efectividad del cache
- **Hit rate:** Porcentaje de aciertos
- **Generation times:** Tiempos promedio, mínimo, máximo

---

## 🔄 **Flujo de Generación Actualizado**

```
1. generateCard() se llama
   ↓
2. Generación clásica (formato, género, stats)
   ↓
3. Si rarity ≠ MYTHIC:
   - Importar motor procedural
   - Generar habilidades con semilla
   - Validar cada habilidad
   - Convertir a GeneratedAbility
   - Reemplazar habilidades clásicas
   ↓
4. Aplicar límites por rareza
   ↓
5. Retornar carta completa
```

---

## 🚀 **Próximos Pasos (Fase 3)**

### **Cuando Fase 2 esté completa y probada:**

1. **Extender efectos** - Añadir más habilidades especializadas
2. **Ajustar pesos** - Balance basado en feedback real
3. **Añadir condiciones** - Más condiciones complejas
4. **Sistema de hotfix** - Actualizar habilidades sin regenerar
5. **Analytics** - Estadísticas de uso en producción

---

## 🎮 **Uso en Desarrollo**

### **Para probar el motor:**
```typescript
import { proceduralAbilityEngine } from './proceduralAbilityEngine';

// Generar habilidades para testing
const result = proceduralAbilityEngine.generate(
  'test-card-id',
  'GOLD',
  3,
  'test-seed-123'
);

console.log('Generated abilities:', result.abilities);
```

### **Para generar cartas completas:**
```typescript
import { generateCard } from './generator';

const card = await generateCard(mockTrack, 'PLATINUM');
console.log('Card abilities:', card.abilities);
```

---

## 📝 **Notas Importantes**

1. **NO ROMPIÓ NADA EXISTENTE** - Sistema clásico sigue funcionando
2. **MYTHIC NO USA PROCEDURAL** - Diseño manual como se planeó
3. **PERFORMANCE OPTIMIZADA** - Cache y validación rápida
4. **SEGURO POR DEFECTO** - Validación estricta y fallbacks
5. **FÁCIL DE EXTENDER** - Sistema modular y bien documentado

---

**¡Fase 2 completada! El motor procedural está integrado y listo para producción.** 🎯🚀


<!-- Contenido extraído de FEATURES_IMPLEMENTATION.md -->


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


<!-- Contenido extraído de GUIA_MAESTRA_PROYECTO.md -->
# 🎸 GUÍA MAESTRA DEFINITIVA - MusicTCG (V. 3.1.0)

Este documento es la **Única Fuente de Verdad (SSOT)** de MusicTCG. Consolida toda la arquitectura, lógica, diseño y evolución técnica del proyecto. Reemplaza a todos los documentos anteriores.

---

## 🚀 RESUMEN DE CAMBIOS RECIENTES

#### [v3.1.0] - Studio Refinement & Mythic Support

**Refinamiento del Studio (La Disquera):**
- **Inspección Global:** Se movió el modal de detalles de carta (`selectedCard`) fuera del flujo condicional de búsqueda. Ahora puedes inspeccionar cartas directamente desde los resultados de búsqueda global sin retroceder.
- **Corrección de Hidratación:** Se reemplazó el `motion.button` anidado en `SearchCardResult.tsx` por un `motion.div`. Esto elimina el error de React sobre elementos interactivos anidados y asegura que el click para inspeccionar funcione en toda la tarjeta del buscador.
- **Sintaxis y Estructura:** Se limpió el final de `app/studio/page.tsx`, eliminando cierres de etiquetas duplicados y código huérfano que causaba errores de compilación.

**Motor de Rareza y Generación (`cardGenerator.ts`):**
- **Soporte Completo para MYTHIC:** El generador ahora detecta y asigna correctamente la rareza `MYTHIC` para canciones con más de 1,000,000,000 de vistas.
- **Corrección de Retornos:** Se añadieron sentencias `return` faltantes en funciones auxiliares como `rarityToColor`, `rarityToLabel` y `typeToLabel`, evitando valores `undefined` en la UI.
- **Tipado Estricto:** Se importaron y aplicaron correctamente los tipos `CardRarity` y `CardType` de la definición central (`types/types.ts`).

**Iconografía y Estética:**
- **Iconos Temáticos:** Se reemplazó el icono de rayo (`Zap`) por el icono de nota musical (`Music`) en el distintivo de coste de energía tanto en `Card.tsx` como en `MiniCard.tsx` para mayor coherencia con el tema musical.
- **Limpieza de MiniCard:** Se eliminaron los diamantes de las esquinas en `MiniCard.tsx` por ser redundantes con el contador central de Studio. También se eliminó el icono de rayo de fondo en cartas de evento.

---

#### [v3.0.0] - Combat System Rewrite & Unified State

**Reescritura completa de `useGameEngine.ts`:**
- **Estado Unificado:** Se eliminó la duplicidad entre `BoardCard` y `BoardEntity`. Todo el estado del tablero, mano, mazo y vida se gestiona en un único hook centralizado.
- **Motor de Efectos Puro:** `applyKeywordEffects` ahora es una función pura que opera sobre copias del estado, garantizando predictibilidad y evitando bugs de sincronización.
- **Resolución de Combate Robusta:** `resolveAttackPure` maneja interacciones complejas de keywords (`PROVOKE`, `STEALTH`, `DISTORTION`, `SUSTAIN`) en un solo paso lógico.
- **Fases de Turno Deterministas:** Implementación estricta de fases `START`, `DRAW`, `MAIN`, `REPLICA`, `END`.
- **Soporte para Mazos de 20 Cartas:** El mínimo para jugar se redujo a 20 cartas. El motor rellena automáticamente mazos incompletos para asegurar que el juego siempre inicie.

**IA del Bot Renovada:**
- **Manejo de Réplica:** El bot ahora puede interceptar ataques usando su reserva o cartas en tablero durante la fase de réplica.
- **Reanudación de Cola:** Se arregló el bug donde el bot se detenía tras declarar un ataque. Ahora reanuda sus acciones pendientes cuando el combate resuelve.
- **Validación de Estado:** Chequeos robustos de `gameOver` y `turn` evitan que el bot actúe fuera de su tiempo o tras el fin de la partida.

**Mejoras en la Experiencia de Juego (UX):**
- **Fase de Réplica del Jugador:** Timer de 5 segundos para que el jugador decida si interceptar un ataque rival.
- **Visualización de Keywords:** Badges específicos para `TAUNT` (Provocación) y efectos visuales de `Tapped` mejorados.
- **Sincronización de Letras:** Se mantiene el módulo de letras sincronizadas con `lrclib.net`.

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
*Última actualización: v3.0.0 - 2026*

© 2026 MusicTCG Development Team.



<!-- Contenido extraído de MECANICAS_EXPANDIDAS.md -->
# 🎯 MECÁNICAS EXPANDIDAS - MusicTCG

## 📋 VISIÓN GENERAL

El sistema de habilidades está diseñado para ser **infinitamente expandible**, inspirado en Magic: The Gathering pero adaptado al universo musical. Cada habilidad es una combinación de:

1. **Disparadores (Triggers)** - Cuándo se activa
2. **Efectos (Effects)** - Qué hace  
3. **Condiciones (Conditions)** - Cuándo se puede activar
4. **Sinergias (Synergies)** - Cómo interactúa con otras cartas

---

## 🏗️ ARQUITECTURA DE HABILIDADES

### **Estructura Base**
```typescript
interface CardAbility {
  id: string;                    // Identificador único
  name: string;                  // Nombre visible para jugador
  description: string;           // Descripción del efecto
  trigger: TriggerType;          // Cuándo se activa
  effects: AbilityEffect[];       // Lista de efectos
  cost?: number;                // Costo adicional de energía
}
```

### **Tipos de Efectos Disponibles**

#### 🎯 **COMBAT MODS**
- `HASTE` - Atacar inmediatamente
- `DOUBLE_STRIKE` - Atacar dos veces
- `PIERCE` - Daño traspasa defensas
- `INDESTRUCTIBLE` - No puede ser destruida
- `TAUNT` - Obliga a atacar primero esta carta
- `SHIELD` - Previene próximo daño

#### ⚡ **ENERGY MODS** 
- `ENERGY_RAMP` - +X energía este turno
- `ENERGY_BOOST` - Aumenta energía máxima
- `ENERGY_LOCK` - Bloquea sacrificios

#### 🎴 **DRAW MODS**
- `DUPLICATE` - Roba cartas adicionales
- `TUTOR` - Busca carta específica
- `SCRY_3` - Mira próximas 3 cartas
- `PREVIEW_5` - Ve próximas 5 cartas
- `DISCARD_DRAW` - Descarta para robar

#### 🎭 **BOARD CONTROL**
- `REMOVE_TARGET` - Destruye carta objetivo
- `SWAP_TARGET` - Intercambia posiciones
- `FREEZE_TARGET` - Congela carta objetivo
- `SHUFFLE_BOARD` - Reordena tablero

#### 🎵 **PLAYLIST MODS**
- `DOUBLE_BONUS` - Duplica bono de playlist
- `FORCE_SHUFFLE` - Baraja playlist actual

#### 🌟 **GLOBAL BUFFS**
- `GENRE_BUFF` - Bonus por género musical
- `ALBUM_COMBO` - Combinación de álbum
- `RARITY_BOOST` - Bonus por diversidad de rarezas

#### 🎭 **META ABILITIES**
- `INSTANT_PLAY` - Jugar en cualquier momento
- `TUTOR_NAMED` - Buscar por nombre
- `RECALL_TARGET` - Revivir del cementerio

---

## 🎲 SISTEMA DE GENERACIÓN DE HABILIDADES

### **Lógica Actual en `generator.ts`**
```typescript
// 1. Detección de formato musical
const format = detectFormat(track); // REMIX, LIVE, ACOUSTIC, etc.

// 2. Asignación basada en formato y género
if (format === 'SOUNDTRACK') {
  abilities.push({ keyword: 'Soundtrack', description: '...' });
} else if (isRock && random() > 0.5) {
  abilities.push({ keyword: 'Drop', description: '...' });
} else {
  abilities.push({ keyword: 'Sustain', description: '...' });
}
```

### **Sistema Propuesto de Combinaciones**

#### 🎯 **Generación por Composición**
```typescript
// Cada combinación única de [Formato + Género + Rareza] = Habilidad única
const abilityId = `${format}_${genre}_${rarity}_${index}`;

// Ejemplos:
// ROCK_DROP_MYTHIC_1 - Ataque inmediato para rock mítico
// POP_HEAL_GOLD_2 - Curación para pop dorado  
// ELECTRONIC_TUTOR_PLATINUM_1 - Búsqueda para electrónicos platino
```

#### 🎵 **Generación por Sinergia Musical**
```typescript
// Detectar sinergias entre cartas en juego
if (hasGenreSynergy(hand, 'Rock') && hasAlbumSynergy(hand, 'Thriller')) {
  grantBonusAbility('ROCK_ALBUM_COMBO');
}

// Bonus acumulativos por género
const genreMastery = {
  'Rock': { currentLevel: 3, unlockedAbilities: ['ROCK_TAUNT', 'ROCK_PIERCE'] },
  'Pop': { currentLevel: 2, unlockedAbilities: ['POP_HEAL', 'POP_DRAW'] },
  // ... más géneros
};
```

---

## 🎮 MECÁNICAS ESPECÍFICAS DETALLADAS

### **1. SISTEMA DE COMBO MUSICAL**
```typescript
// Combo: 3+ cartas mismo álbum = efecto especial
interface AlbumCombo {
  requiredCards: number;        // 3+ cartas mismo álbum
  effect: 'ALL_CREATURES_GAIN_HASTE'; // Todas ganan rapidez
  duration: 2;                // 2 turnos
}

// Detección automática
function checkAlbumCombo(hand: Card[], board: Card[]): boolean {
  const albumCards = [...hand, ...board].filter(c => 
    c.album === targetAlbum && c.format === 'ALBUM'
  );
  return albumCards.length >= 3;
}
```

### **2. SISTEMA DE EVOLUCIÓN RÍTMICA**
```typescript
// Cartas pueden "evolucionar" durante la partida
interface RhythmEvolution {
  baseCard: string;           // Carta original
  requiredPlays: number;       // Veces que debe jugarse
  evolvedCard: string;         // Carta evolucionada
  evolutionCondition: 'PLAY_COUNT' | 'DAMAGE_DEALT' | 'TURNS_IN_PLAY';
}

// Ejemplo: "Bohemian Rhapsody" → "Bohemian Symphony" después de 5 turnos
```

### **3. SISTEMA DE IMPROVISACIÓN MUSICAL**
```typescript
// Combinar cartas para crear efectos nuevos
interface Improvisation {
  card1: string;
  card2: string;  
  resultAbility: string;      // Nueva habilidad temporal
  cost: number;               // Energía para improvisar
}

// Ejemplo: Jazz + Blues = "Fusión Soul" (habilidad de curación masiva)
```

### **4. SISTEMA DE SETLIST DINÁMICA**
```typescript
// La playlist cambia el metajuego según cartas en juego
interface SetlistEffect {
  dominantGenre: string;       // Género con más cartas
  globalEffect: string;        // Efecto en todas las cartas
  duration: number;             // Turnos que dura
}

// Ejemplo: Dominancia Rock = Todas las criaturas ganan +1 ataque
```

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### **1. Expansión de `ABILITIES_DB`**
```typescript
// Añadir nuevas habilidades sin límite
const NEW_ABILITIES = {
  // Habilidades de combo
  'COMBO_ROCK_DUO_1': {
    id: 'COMBO_ROCK_DUO_1',
    name: 'Dúo de Rock',
    description: 'Si tienes 2 cartas Rock, gana Trample.',
    trigger: 'PASSIVE',
    condition: { type: 'MIN_CARDS_OF_GENRE', value: 2, genre: 'Rock' },
    effects: [{ type: 'COMBAT_MOD', value: 'TRAMPLE' }]
  },
  
  // Habilidades contextuales
  'CONTEXT_BATTLE_ROYAL_1': {
    id: 'CONTEXT_BATTLE_ROYAL_1',
    name: 'Batalla Real',
    description: 'Solo activa si hay 10+ cartas en juego.',
    trigger: 'ON_PLAY',
    condition: { type: 'BOARD_SIZE', value: 10 },
    effects: [{ type: 'GLOBAL_BUFF', value: 'ALL_CREATURES_PLUS_2_2' }]
  }
};
```

### **2. Sistema de Progresión de Habilidades**
```typescript
// Desbloqueo de habilidades por uso
interface AbilityProgression {
  abilityId: string;
  currentLevel: number;      // 0-5
  experience: number;          // XP ganada con esta habilidad
  masteryBonus: number;         // Bonus por dominar la habilidad
  unlockedEffects: string[];   // Efectos desbloqueados
}

// Ejemplo de progresión
const abilityProgress = {
  'ROCK_TAUNT': {
    currentLevel: 3,
    experience: 450,
    masteryBonus: 1.5,  // +50% efectividad
    unlockedEffects: ['TAUNT_AREA', 'PERMANENT_TAUNT']
  }
};
```

---

## 🎯 ESTRATEGIA DE DISEÑO

### **Principios de Balance**
1. **Costo vs Impacto** - Habilidades más caras = efectos más potentes
2. **Sinergia Musical** - Premiar combinaciones temáticas coherentes  
3. **Contra-juego** - Cada habilidad debe tener respuesta o contramedida
4. **Escalado** - Habilidades más fuertes requieren condiciones más estrictas

### **Métricas de Evaluación**
- **Diversidad** - Mínimo 5 habilidades diferentes por rareza
- **Sinergia** - Mínimo 3 combinaciones sinérgicas posibles
- **Complejidad** - Máximo 3 condiciones por habilidad
- **Originalidad** - Cada habilidad debe tener mecánica única

---

## 🚀 ROADMAP DE EXPANSIÓN

### **Fase 1: Fundamentos (Current)**
- ✅ Sistema básico de habilidades
- ✅ Generación por formato/género  
- ✅ 25+ habilidades base implementadas

### **Fase 2: Combinaciones (Next)**
- 🎯 Sistema de combos musicales
- 🎭 Evolución rítmica de cartas
- 🎵 Setlists dinámicas y contextuales
- 🌟 Meta-habilidades estratégicas

### **Fase 3: Avanzadas (Future)**
- 🏆 Habilidades condicionales complejas
- 🎪 Modos de juego alternativos
- 🎭 Sistema de progresión y maestría
- 🌌 Habilidades legendarias y transformaciones

---

## 💡 RECOMENDACIONES DE IMPLEMENTACIÓN

### **Para Desarrolladores**
1. **Modularidad** - Cada habilidad debe ser independiente
2. **Testing** - Probar cada habilidad en múltiples escenarios
3. **Documentación** - Explicar la sinergia esperada
4. **Balance** - Iterar basado en feedback de jugadores

### **Para Diseñadores de Habilidades**
1. **Claridad** - Nombres y descripciones intuitivas
2. **Temática** - Coherencia con el universo musical
3. **Escala** - Habilidades con múltiples niveles de potencia
4. **Originalidad** - Evitar copias directas de otros juegos

---

**Este documento sirve como guía maestra para la expansión infinita del sistema de habilidades, garantizando miles de combinaciones estratégicas posibles mientras mantenemos el balance y la coherencia temática del universo musical.**


<!-- Contenido extraído de CHECKLIST_Y_ROADMAP.md -->
# ✅ CHECKLIST DE IMPLEMENTACIÓN - MusicTCG

## 🎯 LOS 4 SISTEMAS TRONCALES - ESTADO FINAL

### ✅ SISTEMA 1: Motor de Habilidades Procedurales
- [x] Palabras Clave Estáticas (6 tipos)
- [x] Constructor Dinámico (Gatillo + Efecto + Objetivo)
- [x] Modificadores y Condicionantes
- [x] Alcance Global y AoE
- [x] Validación de Balance (Stat Penalty)
- [x] Etiquetado automático para búsqueda
- [x] Generación de texto humanizado
- **ESTADO:** ✅ LISTO PARA PRODUCCIÓN

### ✅ SISTEMA 2: Generador de Cartas
- [x] Integración con datos de Apple Music
- [x] Cálculo de rareza por popularidad (YouTube)
- [x] Integración con MusicBrainz
- [x] Hash determinista (misma canción = misma carta)
- [x] Detección de Eventos (Live, Remix, Acoustic)
- [x] Presupuesto e impuestos automáticos
- [x] Diferenciación procedural (pista, color, zoom)
- [x] Pipeline completo de generación
- **ESTADO:** ✅ LISTO PARA PRODUCCIÓN

### ✅ SISTEMA 3: Sistema de Combate y Turnos
- [x] Flujo de turnos (3 fases)
- [x] Estados de cartas (Tapped/Untapped)
- [x] El Choque (combate cara a cara)
- [x] La Emboscada (atacante ventaja)
- [x] Ataque Directo (a Reputación)
- [x] La Réplica (sistema híbrido)
- [x] Condiciones de victoria (3x: Knockout, Hype, Forgotten)
- [x] Empate (double KO)
- **ESTADO:** ✅ LISTO PARA PRODUCCIÓN

### ✅ SISTEMA 4: Sistema de Economía
- [x] Regalías (moneda blanda)
- [x] Comodines (material de crafteo)
- [x] Límite de Play-set (4 copias)
- [x] Protección anti-duplicados
- [x] Pity Timer (Garantías)
- [x] La Bóveda (Vault)
- [x] La Disquera (Búsqueda y crafteo)
- [x] Recompensas por partida
- [x] Misiones diarias (Giras)
- **ESTADO:** ✅ LISTO PARA PRODUCCIÓN

---

## 📦 ARCHIVOS ENTREGADOS

```
✅ abilityEngine.ts              (610 líneas)
✅ cardGenerator.ts              (420 líneas)
✅ combatSystem.ts               (520 líneas)
✅ economySystem.ts              (480 líneas)
✅ types.ts                       (450 líneas)
✅ CardComponents.tsx            (520 líneas)
✅ cards.css              (280 líneas)
✅ INTEGRATION_GUIDE.md          (Ejemplos de código)
✅ RESUMEN_COMPLETO.md          (Guía de uso)
✅ ARQUITECTURA.md              (Diagramas y flujos)
✅ CHECKLIST.md                 (Este archivo)
```

**TOTAL: ~4,000 líneas de código profesional, documentado y listo para producción**

---

## 🚀 CÓMO PROCEDER AHORA

### PASO 1: Preparar tu proyecto

```bash
# Asume que tienes un proyecto Next.js con Supabase
cd tu-proyecto-local

# Crear carpetas si no existen
mkdir -p src/lib
mkdir -p src/components
mkdir -p src/types
mkdir -p src/styles
```

### PASO 2: Copiar los archivos

```bash
# Copiar sistemas de lógica
cp /ruta/a/abilityEngine.ts src/lib/
cp /ruta/a/cardGenerator.ts src/lib/
cp /ruta/a/combatSystem.ts src/lib/
cp /ruta/a/economySystem.ts src/lib/

# Copiar tipos
cp /ruta/a/types.ts src/types/

# Copiar componentes React
cp /ruta/a/CardComponents.tsx src/components/

# Copiar estilos
cp /ruta/a/styles_cards.css src/styles/
```

### PASO 3: Revisar importaciones

En cada archivo, asegúrate de que los imports sean correctos:

```typescript
// En src/lib/cardGenerator.ts
import { AbilityGenerator, GeneratedAbility } from '@/lib/abilityEngine';
import { MasterCardTemplate } from '@/types'; // Cambiar según tu estructura

// En src/lib/combatSystem.ts
import { MasterCardTemplate } from '@/lib/cardGenerator';
import { GameState } from '@/types';

// En src/components/CardComponents.tsx
import { MasterCardTemplate } from '@/lib/cardGenerator';
import '@/styles/cards.css';
```

### PASO 4: Crear Supabase Tables

Ejecuta este SQL en Supabase:

```sql
-- Tabla de cartas maestras
CREATE TABLE master_cards (
  id TEXT PRIMARY KEY,
  apple_id TEXT,
  isrc_code TEXT,
  name TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  genre TEXT,
  rarity TEXT NOT NULL, -- BRONZE, SILVER, GOLD, PLATINUM
  cost INTEGER NOT NULL,
  atk INTEGER NOT NULL,
  def INTEGER NOT NULL,
  ability JSONB, -- GeneratedAbility
  youtube_views BIGINT,
  youtube_video_id TEXT,
  theme_color TEXT,
  mechanic_tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de inventario de jugadores
CREATE TABLE player_inventory (
  user_id TEXT PRIMARY KEY,
  regalias INTEGER DEFAULT 0,
  wildcards JSONB DEFAULT '{"bronze": 0, "silver": 0, "gold": 0, "platinum": 0}',
  inventory JSONB DEFAULT '{}', -- {card_id: count}
  pity_timer JSONB DEFAULT '{"silverGold": 0, "platinum": 0}',
  vault JSONB DEFAULT '{"progress": 0, "lastGrantedAt": null}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de estados de partidas
CREATE TABLE game_states (
  match_id TEXT PRIMARY KEY,
  player_a_id TEXT NOT NULL,
  player_b_id TEXT NOT NULL,
  state JSONB NOT NULL, -- GameState completo
  is_finished BOOLEAN DEFAULT false,
  winner TEXT,
  end_condition TEXT, -- knockout, hype_win, forgotten, draw
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de perfiles de jugadores
CREATE TABLE player_profiles (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  win_count INTEGER DEFAULT 0,
  loss_count INTEGER DEFAULT 0,
  elo_rating INTEGER DEFAULT 1500,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_master_cards_rarity ON master_cards(rarity);
CREATE INDEX idx_master_cards_genre ON master_cards(genre);
CREATE INDEX idx_game_states_players ON game_states(player_a_id, player_b_id);
CREATE INDEX idx_game_states_finished ON game_states(is_finished);
```

### PASO 5: Crear una página de prueba

```typescript
// app/test/card-generation/page.tsx
'use client';

import { CardGenerator } from '@/lib/cardGenerator';
import { CardFlip } from '@/components/CardComponents';
import { useState } from 'react';

export default function TestCardGeneration() {
  const [card, setCard] = useState(null);

  const handleGenerateCard = () => {
    const testData = {
      id: '145689012',
      name: 'Bohemian Rhapsody',
      artistName: 'Queen',
      collectionName: 'A Night at the Opera',
      primaryGenreName: 'Rock',
      trackNumber: 11,
      artworkUrl500: 'https://via.placeholder.com/500',
    };

    const generated = CardGenerator.generateCard(testData, {
      videoId: 'test',
      viewCount: 1_500_000_000,
    });

    setCard(generated);
  };

  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center gap-8">
      <button
        onClick={handleGenerateCard}
        className="px-6 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400"
      >
        Generar Carta
      </button>

      {card && (
        <div className="flex gap-8">
          <CardFlip card={card} size="large" />
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-4">{card.name}</h2>
            <p className="mb-2">Artista: {card.artist}</p>
            <p className="mb-2">Género: {card.genre}</p>
            <p className="mb-2">Rareza: {card.rarity}</p>
            <p className="mb-2">Cost: {card.cost}</p>
            <p className="mb-2">ATK: {card.atk} / DEF: {card.def}</p>
            {card.ability && (
              <p className="mt-4 text-amber-500">{card.ability.text}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## ⏳ ROADMAP DE DESARROLLO

### Semana 1: Infraestructura & Testing
- [x] Implementar los 4 sistemas ✅
- [ ] Copiar archivos al proyecto
- [ ] Crear Supabase tables
- [ ] Página de prueba funcionando
- **Deliverable:** Poder generar cartas y verlas en la pantalla

### Semana 2: Búsqueda y Generación
- [ ] Integrar Apple Music API
- [ ] Integrar YouTube API
- [ ] Crear página /search (La Disquera)
- [ ] Implementar búsqueda global
- **Deliverable:** Poder buscar canciones y ver cómo se vuelven cartas

### Semana 3: Economía y Tienda
- [ ] Implementar generador de sobres
- [ ] Crear página /store (La Tienda)
- [ ] Implementar compra de sobres
- [ ] Implementar crafteo de cartas
- [ ] Persistencia en Supabase
- **Deliverable:** Sistema de economía funcional

### Semana 4: Juego Básico
- [ ] Crear página /studio (Deckbuilder)
- [ ] Crear página /play (Tablero)
- [ ] Implementar turnos locales
- [ ] Implementar combate básico
- [ ] Testing de balance
- **Deliverable:** Poder jugar 1v1 en el navegador

### Semana 5: Multijugador
- [ ] WebSocket con Supabase
- [ ] Matchmaking básico
- [ ] Sincronización en tiempo real
- [ ] Recompensas y persistencia
- **Deliverable:** Jugar contra otros jugadores online

### Semana 6: Polish & Lanzamiento
- [ ] Animaciones finales
- [ ] UI/UX improvements
- [ ] Mobile responsive
- [ ] Testing exhaustivo
- **Deliverable:** Versión beta lista para amigos

---

## 🔧 TAREAS TÉCNICAS PENDIENTES

### API Integration
```typescript
// Crear archivo: src/lib/api/appleMusic.ts
- searchMusic(query: string)
- getTrackDetails(trackId: string)

// Crear archivo: src/lib/api/youtube.ts
- searchVideo(title: string, artist: string)
- getVideoStats(videoId: string)

// Crear archivo: src/lib/api/musicBrainz.ts
- getRecordingByISRC(isrc: string)
- getMetadata(recordingId: string)
```

### Supabase Integration
```typescript
// Crear archivo: src/lib/supabase.ts
- Inicializar cliente Supabase
- Funciones de CRUD para cada tabla
- Real-time listeners para GameState

// Crear archivo: src/lib/database.ts
- saveMasterCard(card: MasterCardTemplate)
- getPlayerInventory(userId: string)
- updateGameState(matchId: string, state: GameState)
```

### Componentes Faltantes
```typescript
// src/components/GameBoard.tsx
- Visualización del tablero
- Animaciones de combate
- Indicadores de vida/hype

// src/components/DeckBuilder.tsx
- Editor de mazos
- Validación de deck
- Analizador de curva

// src/components/Store.tsx
- Tienda de sobres
- Historial de compras
- Medidor de pity

// src/components/Search.tsx
- Buscador de La Disquera
- Vista previa de cartas
- Botón de crafteo
```

### Hooks de React
```typescript
// src/hooks/useGameState.ts
- Gestionar estado de partida
- Acciones de juego

// src/hooks/useInventory.ts
- Gestionar inventario
- Abrir sobres
- Craftear cartas

// src/hooks/useAuth.ts
- Autenticación con Supabase
- Gestión de sesión
```

---

## 🧪 TESTING

### Unit Tests (Recomendado)
```bash
npm install --save-dev jest @testing-library/react

# Crear:
# __tests__/cardGenerator.test.ts
# __tests__/abilityEngine.test.ts
# __tests__/combatSystem.test.ts
# __tests__/economySystem.test.ts
```

### Test Cases Críticos
```typescript
// CardGenerator
- Misma canción siempre genera misma carta (Hash determinista)
- Rareza se calcula correctamente por vistas
- Eventos tienen coste reducido

// AbilityEngine
- Habilidades Tier 1 tienen penalización > Tier 3
- Cartas Platino reciben descuento en recargo
- Tags mecánicos se generan correctamente

// CombatSystem
- El Choque: ambos reciben daño
- La Emboscada: solo atacante daña
- Victoria se detecta correctamente (3 condiciones)

// EconomySystem
- Límite de 4 copias se respeta
- Anti-duplicados: 5ª copia = comodín
- Pity timer avanza correctamente
```

---

## 📊 MÉTRICAS DE ÉXITO

Una vez implementado, el juego debería:

✅ Generar cartas en < 10ms
✅ Resolver combate en < 50ms
✅ Soportar billones de cartas únicas
✅ No tener cartas "rotas" (matemáticamente balanceado)
✅ Hacer que todos los géneros sean competitivos
✅ Evitar power creep (nuevas cartas no rompen el juego)

---

## 🎓 NOTAS IMPORTANTES

### Para Developers
1. **Todo es procedural**: No modifiques habilidades a mano. El Hash las genera.
2. **El balance es matemático**: Si una carta se siente rota, ajusta los tiers, no la carta.
3. **Supabase es la fuente de verdad**: El GameState en Supabase es el estado real.
4. **WebSocket es crítico**: Sin él, no hay multijugador.
5. **Testing es obligatorio**: El balance depende de que el código sea correcto.

### Para el Designer
1. **Los números son sagrados**: GDD v1.0 es la biblia.
2. **Playtesting temprano**: A los 2 meses deberías tener gente jugando.
3. **Feedback loop rápido**: Cada cambio debe testerse en < 1 hora.
4. **Comunidad es poder**: Los jugadores descubrirán combos que no esperabas.

---

## 📞 SOPORTE

Si algo no funciona:

1. **Revisa tipos**: Asegúrate de que los tipos de TypeScript son correctos
2. **Revisa imports**: Verifica que las rutas de importación sean correctas
3. **Revisa Supabase**: Las tablas deben estar creadas correctamente
4. **Prueba localmente**: Crea una página de test antes de integrar

---

## ✨ ¡LISTO!

Todo está documentado, tipado, y listo para producción. 

**El siguiente paso es tuyo: 🚀 Copia los archivos a tu repositorio y comienza a integrarlos.**

¿Necesitas ayuda con algo específico?

---

**Última actualización:** Marzo 17, 2026
**Versión:** 1.0 - Production Ready
**Autor:** MusicTCG Development Team
**Estado:** ✅ COMPLETADO


<!-- Contenido extraído de MEJORAS_RESPONSIVE.md -->
# 📱 MEJORAS RESPONSIVE PARA MÓVILES

## 🎯 **Objetivo Principal**
Mejorar la experiencia en dispositivos móviles eliminando solapamientos y optimizando el diseño para pantallas pequeñas.

---

## 🛠️ **Cambios Implementados**

### **1. 🎨 Mejoras en CSS Global (`globals.css`)**

#### **📱 Nuevas Utilidades Responsive:**
```css
/* 📱 Optimizaciones para móviles */
.mobile-safe-area {
    @apply pt-safe-top pb-safe-bottom px-safe;
}

.mobile-no-overflow {
    @apply overflow-x-hidden overflow-y-auto;
}

.mobile-touch-friendly {
    @apply min-h-12 min-w-12 touch-manipulation;
}

/* 🎯 Tarjetas responsive */
.card-mobile {
    @apply w-48 aspect-[2.5/3.5] text-sm;
}

.card-tablet {
    @apply w-56 aspect-[2.5/3.5] text-base;
}

.card-desktop {
    @apply w-64 aspect-[2.5/3.5] text-base;
}

/* 🎯 Navegación responsive */
.nav-mobile {
    @apply fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-white/20 px-4 py-2 z-50;
}

.nav-mobile-item {
    @apply flex flex-col items-center gap-1 p-2 rounded-lg transition-all;
}

.nav-mobile-text {
    @apply text-[10px] uppercase font-bold tracking-tighter;
}

/* 🎯 Viewport height fixes */
.vh-full {
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height para móviles */
}

/* 🎯 Safe areas para iPhone */
.safe-top {
    padding-top: env(safe-area-inset-top);
}

.safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
}
```

#### **📱 Media Queries Específicas:**
- **Mobile (< 640px):** Estilos específicos para móviles
- **Tablet (641px - 1024px):** Estilos para tablets
- **Desktop (> 1025px):** Estilos para escritorio
- **Landscape:** Optimizaciones para modo horizontal
- **Retina:** Mejoras para pantallas de alta densidad

---

### **2. 🏗️ Mejoras en Layout Principal (`layout.tsx`)**

#### **📱 Meta Tags Optimizadas:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#0a0a0a" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

#### **📱 Layout Responsive:**
```jsx
<body className={`${inter.className} bg-black text-white min-h-screen antialiased overflow-x-hidden mobile-safe-area`}>
  <div className="relative z-10 w-full max-w-7xl mx-auto min-h-screen pb-20 md:pb-24">
    <main className="layout-mobile md:layout-tablet lg:layout-desktop pt-2 md:pt-4 px-3 md:px-4 lg:px-6 mx-auto w-full max-w-5xl">
      {children}
    </main>
  </div>
</body>
```

---

### **3. 🧭 Mejoras en Navegación (`TabBar.tsx`)**

#### **📱 Versión Móvil Optimizada:**
```jsx
<nav className="nav-mobile">
  <ul className="flex justify-around items-center max-w-sm mx-auto mobile-only">
    <TabItem href="/" icon={<Home size={20} />} label={t(language, 'nav', 'home')} isActive={pathname === '/'} />
    {/* ... más items con iconos de 20px en móvil */}
  </ul>
  
  {/* Versión Desktop/Tablet */}
  <ul className="hidden md:flex justify-between items-center max-w-5xl mx-auto px-6 py-3 tablet-only desktop-only">
    <TabItem href="/" icon={<Home size={24} />} label={t(language, 'nav', 'home')} isActive={pathname === '/'} />
    {/* ... más items con iconos de 24px en desktop */}
  </ul>
</nav>
```

#### **🎯 Mejoras en Componentes:**
- **Iconos más pequeños en móvil** (20px vs 24px)
- **Texto más compacto** (`nav-mobile-text`)
- **Distribución mejorada** (`justify-around` en móvil vs `justify-between` en desktop)

---

### **4. 🃏 Mejoras en Componente de Cartas (`Card.tsx`)**

#### **📱 Tarjetas Responsive:**
```jsx
// Tamaño adaptativo por dispositivo
className={`relative card-hover-effect ${isBig ? 'w-80 sm:w-96' : 'card-mobile sm:card-tablet md:card-desktop'} aspect-[2.5/3.5]`}

// Hover optimizado para móvil
const delay = window.innerWidth < 768 ? 600 : 1200;
```

#### **🎯 Mejoras en Elementos:**
- **Dot Counter:** Más pequeño en móvil (`w-3 h-3` vs `w-4 h-4`)
- **Top Badges:** Espaciado optimizado (`top-2 sm:top-3`)
- **Iconos:** Escalado responsive (`w-3.5 sm:w-4 sm:h-4`)

---

### **5. 🏠 Mejoras en Página Principal (`page.tsx`)**

#### **📱 Grid Responsive:**
```jsx
<div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
  {/* En móvil: 1 columna, en desktop: 2 columnas */}
</div>
```

#### **🎯 Botones Optimizados:**
```jsx
<button className="w-full bg-cyan-500 text-black font-black py-3 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-cyan-400 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm">
  <span className="hidden sm:inline">ELEGIR DIFICULTAD Y JUGAR</span>
  <span className="sm:hidden">JUGAR</span>
</button>
```

---

## 📊 **Impacto de las Mejoras**

### **✅ Problemas Resueltos:**

1. **❌ Solapamiento de Elementos:**
   - **Antes:** Tarjetas muy grandes en móvil
   - **Ahora:** Tamaño adaptativo con breakpoints específicos

2. **❌ Navegación Incomoda:**
   - **Antes:** Iconos demasiado grandes en móvil
   - **Ahora:** Iconos más pequeños y texto compacto

3. **❌ Espaciado Inconsistente:**
   - **Antes:** Padding fijo para todos los dispositivos
   - **Ahora:** Padding responsive con safe areas

4. **❌ Texto ilegible:**
   - **Antes:** Texto demasiado grande en móvil
   - **Ahora:** Tamaño de texto adaptativo

5. **❌ Hover no óptimo:**
   - **Antes:** Demasiado lento en móvil
   - **Ahora:** Delay reducido para mejor UX

---

## 🎯 **Características Responsive Implementadas**

### **📱 Mobile First Approach:**
- **Breakpoints:** 640px (mobile), 768px (tablet), 1024px (desktop)
- **Safe Areas:** Soporte para notches y barras de estado
- **Viewport Height:** Corrección para navegadores móviles
- **Touch Optimizations:** `touch-manipulation` para mejor respuesta táctil

### **🎯 Componentes Optimizados:**
- **Layout:** Responsive con padding adaptativo
- **Navegación:** Versión móvil optimizada
- **Tarjetas:** Tamaño responsive por dispositivo
- **Botones:** Touch-friendly con tamaño adecuado

### **⚡ Performance:**
- **Reduced Motion:** Detecta preferencia del usuario
- **Lazy Loading:** Componentes cargados bajo demanda
- **Optimized Animations:** Menos intensivas en móviles

---

## 🚀 **Resultado Final**

### **📱 Experiencia Móvil Mejorada:**
- **Sin solapamientos** entre elementos
- **Navegación intuitiva** con touch-friendly
- **Contenido legible** en pantallas pequeñas
- **Performance optimizada** para dispositivos móviles
- **Diseño consistente** across dispositivos

### **🎯 Compatibilidad:**
- **iOS:** Safe areas y viewport height
- **Android:** Touch optimization y responsive design
- **Tablet:** Layout adaptativo con breakpoints específicos
- **Desktop:** Experiencia completa mantenida

---

## 🔧 **Guía de Uso**

### **📱 Clases CSS Disponibles:**
```css
.mobile-only          /* Visible solo en móvil */
.tablet-only        /* Visible solo en tablet */
.desktop-only        /* Visible solo en desktop */

.card-mobile         /* Tarjeta tamaño móvil */
.card-tablet         /* Tarjeta tamaño tablet */
.card-desktop        /* Tarjeta tamaño desktop */

.nav-mobile          /* Navegación móvil */
.btn-mobile          /* Botón móvil */
.input-mobile         /* Input móvil */
```

### **🎯 Breakpoints:**
- **Mobile:** < 640px
- **Tablet:** 641px - 1024px
- **Desktop:** > 1025px

---

**🎉 MusicTCG ahora ofrece una experiencia móvil perfecta sin solapamientos!**


<!-- Contenido extraído de ANALISIS_OPTIMIZACION_UX_SEO.md -->
# Análisis de Optimización, Usabilidad, Intuitividad, SEO y UX

Este documento recopila las oportunidades de mejora encontradas en el proyecto `MusicTCG` con el objetivo de elevar la calidad del front-end, la retención de usuarios y el posicionamiento.

## 1. Optimización del Rendimiento (Performance)
* **Reemplazo de etiquetas `<img>` nativas:** Se encontró el uso de etiquetas `<img>` convencionales en componentes críticos como `MiniPlayer.tsx`, `Card.tsx`, y listas de cartas.
  * *Solución:* Migrar todo a `next/image` (`<Image />`). Esto otorgará compresión WebP/AVIF automática, carga diferida (lazy loading) nativa, y evitará el Cumulative Layout Shift (CLS) reservando el aspect-ratio.
* **Componentes Dinámicos (Lazy Loading):** Los modales grandes (ej. `PackOpenModal`) y secciones pesadas no visibles inicialmente deberían usar `next/dynamic` para reducir el tamaño del bundle inicial.
* **Manejo de Estados de Animación:** Se utiliza `motion/react` intensivamente. Asegurarse de usar la propiedad `layout` en listas que cambian frecuentemente para una transición suave sin repintados bruscos de UI.

## 2. SEO (Search Engine Optimization)
* **Metadata Dinámica y Completa:** El archivo `app/layout.tsx` tiene una metadata muy básica.
  * *Solución:* Añadir atributos OpenGraph (`og:title`, `og:image`, `og:url`), Twitter Cards, y meta descriptions específicas por ruta (para la Home, la Tienda, el Perfil).
* **Generación de Rutas amigables e Internacionalización:** Hay referencias de soporte a idiomas (`language` en Zustand). El atributo `lang` en `<html>` y las descripciones deben cambiar dinámicamente.
* **robots.txt y sitemap.xml:** Crear un `sitemap.xml` dinámico para los descubrimientos globales de las cartas méticas y un `robots.txt` adecuado si la plataforma será descubrible por buscadores.
* **Semántica HTML5:** Asegurarse de utilizar correctamente jerarquías de etiquetas (`<h1>`, `<h2>`, `<article>`, `<nav>`) en vez de excesivos `<div>`.

## 3. Experiencia de Usuario (UX) y Usabilidad Automática
* **Feedback y Estados de Carga (Loading States):** Aunque hay uso de modales, las transiciones de rutas en Next.js App Router deberían tener pantallas de esqueleto (Skeleton loaders) a través de `loading.tsx` para evitar pantallas negras al hidratar rutas.
* **Accesibilidad (A11y):** Multitud de botones (sobre todo en vistas de cartas y menús) que sólo contienen íconos no poseen `aria-labels` definidos. Esto dificulta la navegación con lectores de pantalla.
* **Flujo de Onboarding:** El progreso del tutorial (`hasCompletedOnboarding`) sólo se almacena en caché local del cliente (Zustand). Si el usuario limpia cookies/caché o cambia de dispositivo móvil a PC, tendrá que repetir el tutorial completo, impactando la usabilidad general.

## 4. Diseño y Estética UI (Mejores Prácticas)
* **Glassmorphism Inteligente:** Las tarjetas translúcidas (`bg-white/5 border border-white/10`) son una gran elección moderna. Se debe asegurar el contraste suficiente del texto para no comprometer la legibilidad.
* **Micro-interacciones:** Expandir el uso de variables de interacciones de `motion` al interactuar con cualquier botón primario y enlaces rápidos.


<!-- Contenido extraído de ANALISIS_SEGURIDAD.md -->
# Análisis de Seguridad de Base de Datos y Vulnerabilidades de Código

Tras la revisión técnica del entorno, los esquemas de bases de datos y la arquitectura Next.js, hemos detectado vulnerabilidades críticas referentes a la protección de datos y el motor de juego.

## 1. Vulnerabilidades en Base de Datos (Supabase RLS y Cliente)

### 1.1 El uso de '@supabase/supabase-js' en Next.js App Router sin SSR Wrapper
Actualmente, el proyecto configura el cliente global en `lib/supabase.ts` usando un patrón Singleton estándar con el anon key.
* **El Problema:** Al operar en un contexto de *Next.js Server Components* o *Route Handlers* (`app/api`), el cliente de Supabase JS estándar **no** envía automáticamente las cookies de sesión del usuario. Esto provoca que cualquier consulta se realice sin contexto de autenticación o, en el peor de los casos, compartiendo estados en caché entre peticiones (Cross-Request State Pollution).
* **La Solución:** Implementar estandarizadamente el paquete oficial `@supabase/ssr` estructurando clientes separados y limpios para el Servidor, el Cliente y los Middleware.

## 2. Vulnerabilidades de la Economía del Juego y Modificabilidad Local

### 2.1 Toda la Verdad está en Zustand (Client-Side) en lugar de en la Base de Datos
Se ha descubierto que entidades críticas monetarias como las "Regalías", "Misiones", "Sobres" e "Inventarios" validan su estado y se alteran principalmente con funciones internas de `usePlayerStore()`.
* **Riesgo Crítico:** Dado que Zustand se persiste generalmente en el LocalStorage de navegador y todo el código procesa las verificaciones en el cliente (`usePlayerStore.getState().consumeFreePack(packsToOpen)` en `app/page.tsx`), un jugador malicioso, empleando DevTools sencillamente, cambiar su balance de regalías de `0` a `999999`, alterando enteramente la economía del juego. No hay backend confirmándolo validamente.

### 2.2 Apertura de Sobres (Lootbox/Packs) desde el Cliente
El flujo que efectúa `handleOpenFreePacks` reside enteramente en el `app/page.tsx` del cliente.
1. Hace fetch a `https://itunes.apple.com`.
2. Llama a `generateCard()` con el resultado obtenido en lado de cliente para construir las estadísticas y efectos de la carta.
3. Se agrega el resultado generado con `usePlayerStore.getState().addCard()`.
* **Riesgo:** Un atacante puede interceptar la petición REST de Apple Music, inyectar una pista JSON modificada para obtener a la carta los stats "Ataque: 9999", o inclusive generar cartas méticas o de un rareza Platinum ilimitadas. Del mismo modo, no gasta recursos validados sobre un servidor.
* **Solución:** La función responsable de generar cartas debe ser una **API Route** de backend o **Edge Function** protegida y firmada. El usuario cliente sólo manda un "quiero abrir 1 sobre" al servidor. El servidor es quien solicita las pistas al API musical, genera los números pseudo-aleatorios (RNG), descuenta el dinero o el sobre, guarda la nueva carta en de Supabase Inventory, y devuelve el resultado encriptado al cliente para mostrarse visualmente.

## 3. Control de Matchmaking y Prevención de Trampas
* **Validación Multi-Jugador:** Las partidas que procesan las victorias (`winner_id`) y reparten ganancias deben también estar consolidadas en el backend. Validar transiciones de turnos garantiza que ningún jugador "hackee" la base de datos inyectando una victoria artificial a través de manipulaciones en API REST.


<!-- Contenido extraído de PLAN_IMPLEMENTACION.md -->
# Roadmap Plan de Implementación Consolidado

A continuación, una hoja de ruta técnica ordenada por nivel de prioridad (del sistema más crítico al visual). Estas acciones unifican el Análisis de Seguridad con el Análisis de UX, SEO y Optimización.

## Fase 1: Arquitectura de Seguridad Base (Crítico - Prioridad Alta) 🛡️
*Se estima 1-2 días de refactorización estructural.*

1. **Instalación y Configuración de Auth SSR:**
   * Sustituir el cliente singular en `lib/supabase.ts`.
   * Implementar paquete `@supabase/ssr` creando métodos: `createClientComponentClient`, `createServerComponentClient`, `createMiddlewareClient`.
   * Configurar e implantar un middleware (`middleware.ts`) que maneje las barreras de autenticación hacia rutas protegidas y refresque la sesión.
2. **Refactorización de la Fuente de la Verdad (Economy Syncing):**
   * Trasladar el procesamiento de todo el dinero (`regalias`, `packs`, `wildcards`) y el estado progresivo (`hasCompletedOnboarding`) a una tabla oficial en Supabase, vinculando cada acción por medio de consultas API donde el servidor es la base inmutable de decisión. Zustand debe servir **únicamente como capa de UI temporal hidratada por la base de datos**.

## Fase 2: Traslado Táctico al Lado de Servidor (Prioridad Alta) 🗄️
*Protección de los principales flujos del juego.*

1. **Generación de Cartas Privada:**
   * Desarrollar `app/api/packs/open/route.ts` donde la RNG y toda lógica referente a `generateCard()` no toque el navegador.
   * La respuesta mandará el estatus `statusCode` y el array de las cartas confirmadas en base de datos.
2. **Bóveda Matchmaking (Game Loop):**
   * Migrar los endpoints `match/create-vs-bot` (y el futuro PvP) verificando las firmas de autorización con `auth.uid()`.

## Fase 3: Optimización del Rendimiento Front-End (Prioridad Media) ⚡
1. **Componentes Gráficos Base:**
   * Búsqueda integral en el proyecto para reemplazar cadenas `<img>` por el componente `next/image` y colocar explícitamente el ancho/alto en componentes.
   * Validar todas las URLs (mzstatic, googleusercontent etc.) dentro del atributo `remotePatterns` en `next.config.ts`.
2. **Animaciones Controladas:**
   * Poner propiedades preventivas para Framer Motion (`AnimatePresence` modificado para performance) y uso de `layout` evitando parpadeos de cartas.
   * Split-chunking: Asegurarse de realizar cargados asíncronos (`next/dynamic`) del "Onboarding" y modales complejos para bajar un 30% el TTI (Time-to-Interactive) inicial.

## Fase 4: Posicionamiento (SEO), Accesibilidad y UX (Prioridad Media-Baja) 🌍
1. **Meta-Datos e Indexación Dinámica:**
   * Crear la metadata maestra con OpenGraph, Canonical URLs, Twitter Cards en `app/layout.tsx`.
   * Poner un `manifest.json` y `theme-color`. 
   * Crear `sitemap.ts` programático para listar rutas dinámicas o mazos compartibles de ser el caso en el futuro.
2. **Accesibilidad y A11y UI:**
   * Modificar el `BotDifficultySelector`, el `MiniPlayer`, y los modales de apertura e incluir al menos tab-indexes lógicos y `aria-label` descriptivos a componentes de interacción no textual.
   * Mejorar los "esqueletos" de la aplicación como placeholder para las vistas que requieran latencia del backend para optimizar un mejor Core Web Vital visual.
   
---
***NOTA CUMPLIMIENTO GLOBAL DE REGLAS:*** *Una vez que el usuario comience a autorizar la ejecución en cada una de estas Fases y altere el código nativo correspondientemente, sus cambios se registrarán paso a paso en el archivo maestro de historial `DOCUMENTACION.md` unificando y limpiando los demás si es requerido por el programador.*
