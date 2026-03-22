# DOCUMENTACIÓN - MUSICTCG

## Información del Proyecto
- **Nombre:** MusicTCG
- **Descripción:** Juego de cartas coleccionables basado en música real, utilizando la API de iTunes para descubrir canciones y el motor de cartas para generar habilidades dinámicas.
- **Tecnologías:** Next.js 15, React 19, Supabase, Tailwind CSS, Lucide React, Framer Motion.

---

## Historial de Versiones

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
