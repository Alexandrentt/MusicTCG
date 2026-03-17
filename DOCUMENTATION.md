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
- **Sistema de Piedad (Pity System):** Para mitigar la varianza en la apertura de sobres, se ha implementado un contador de piedad:
  - **Garantía Oro:** Si el jugador no obtiene una carta ORO en 10 sobres, el sistema fuerza una en el siguiente.
  - **Garantía Platino:** Si el jugador no obtiene una carta PLATINO en 40 sobres, el sistema fuerza una en el siguiente.
  - Los contadores se reinician individualmente al obtener una carta de la rareza correspondiente.

## 6. Interfaces y Lógica (UI/UX)
El diseño sigue una estética "Spotify-Dark" (`#121212` y `#000000`) para que la navegación sea intuitiva y la atención se centre en el arte de los álbumes.

- **La Disquera (`/search`):** Buscador global conectado a Apple Music. Permite previsualizar cualquier carta del mundo. Incluye la funcionalidad de **Crafteo**, donde los usuarios pueden gastar comodines para añadir la carta buscada a su colección.
- **La Tienda (`/store`):** Donde los jugadores gastan Regalías para abrir sobres. 
  - **Lógica de Sobres:** Al comprar un sobre, se realiza una búsqueda aleatoria en la API de iTunes basada en términos predefinidos (ej. géneros, décadas). Las canciones obtenidas se pasan por el Motor Procedural para generar las cartas.
  - **Animaciones:** Utiliza `framer-motion` para crear una experiencia de "unboxing" revelando las cartas una por una con animaciones de escalado y rotación. Si se obtiene una 5ª copia, se muestra una notificación visual de conversión a comodín.
  - **Visualización de Probabilidades:** Se muestran indicadores visuales del progreso del sistema de piedad para mejorar la transparencia con el usuario.
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

## 8. Base de Datos y Autenticación (Firebase)
El proyecto está configurado para utilizar **Firebase** como backend (Firestore) y sistema de autenticación (Firebase Auth).
- **Inicialización:** Los clientes de Firebase se instancian en `lib/firebase.ts` utilizando las credenciales inyectadas en `firebase-applet-config.json`. Se utiliza el patrón Singleton `!getApps().length ? initializeApp(...) : getApp()` para evitar reinicializaciones en el entorno de desarrollo de Next.js.
- **Reglas de Seguridad (Firestore Rules):** Definidas en `firestore.rules`. Implementan un modelo de seguridad basado en la propiedad del documento (`isOwner(userId)`), asegurando que los usuarios solo puedan leer y escribir en los documentos bajo las rutas `/users/{userId}`, `/inventories/{userId}` y `/decks/{userId}` que coincidan con su `request.auth.uid`.
- **Esquema de Datos:** Documentado en `firebase-blueprint.json` utilizando JSON Schema (draft-07). Define las entidades `UserProfile`, `UserInventory` y `UserDecks` para mantener una separación estricta entre los metadatos del jugador, su colección de cartas y sus mazos construidos, optimizando así las lecturas en Firestore.
- **Sincronización de Estado (FirebaseSync):** Ubicación: `/components/FirebaseSync.tsx`. Un componente de alto nivel que gestiona la persistencia bidireccional entre Zustand y Firestore. Implementa un filtrado estricto de funciones y datos no serializables antes de la escritura para evitar errores de `setDoc`.
- **Descubrimientos Globales:** Ubicación: `/lib/discovery.ts`. Cada vez que un jugador genera una carta por primera vez (vía sobres o búsqueda), se registra en una colección global de Firestore. Esto permite mostrar un feed de "Descubrimientos Recientes" y estadísticas globales de la comunidad.
- **Sistema de Atribución (Usernames):** Los jugadores pueden definir un `discoveryUsername` único. Este nombre se asocia a sus descubrimientos globales, permitiendo que otros jugadores vean quién fue el primero en "contratar" a un artista específico.

## 9. Robustez y Estabilidad Técnica
Para asegurar una experiencia de usuario fluida y libre de errores técnicos comunes en aplicaciones Next.js/Firebase:

1. **Patrón de Hidratación Segura:** Se utiliza un estado `mounted` en los componentes cliente que dependen de datos persistidos (Zustand + LocalStorage). Esto evita errores de "Hydration Mismatch" al asegurar que el contenido que depende del estado del cliente solo se renderice después de que el componente se haya montado en el navegador.
2. **Manejo de Errores de Imagen:** El componente `Card.tsx` implementa un manejador `onError` que sustituye automáticamente las portadas de álbumes rotas (ej. errores 404 de iTunes) por un icono de fallback estilizado, manteniendo la integridad visual de la interfaz.
3. **Optimización de Imágenes:** Configuración estricta en `next.config.ts` para permitir hostnames específicos (`mzstatic.com`, `picsum.photos`, `google.com`) y uso del componente `next/image` con `referrerPolicy="no-referrer"` para evitar bloqueos de CORS en recursos externos.
4. **Sanitización de Datos en Firestore:** Implementación de lógica de filtrado en el puente de sincronización para asegurar que solo objetos planos y serializables lleguen a la base de datos, eliminando métodos de clase o funciones que Zustand podría inyectar en el estado.

---
*Nota: Este documento se mantendrá actualizado a medida que se implementen nuevas fases del GDD (como el motor de combate multijugador completo en `/play`).*
