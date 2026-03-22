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
