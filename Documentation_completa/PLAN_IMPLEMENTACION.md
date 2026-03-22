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
