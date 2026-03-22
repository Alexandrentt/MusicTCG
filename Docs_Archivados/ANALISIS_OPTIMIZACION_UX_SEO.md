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
