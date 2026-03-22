import os
import re

doc_dir = "Documentation_completa"
md_files = [f for f in os.listdir(doc_dir) if f.endswith(".md") and f != "DOCUMENTACION.md"]

# Read the main one first
with open(os.path.join(doc_dir, "DOCUMENTACION.md"), "r") as f:
    master_content = f.read()

# Read the rest
additional_content = []
for file in md_files:
    with open(os.path.join(doc_dir, file), "r") as f:
        content = f.read()
        additional_content.append(f"\n\n<!-- Contenido extraído de {file} -->\n{content}")

combined = master_content + "".join(additional_content)

# Regex to find duplicate headers/themes or just dump it all. For simplicity, just append and add our v1.3.0 changes.
v130_changes = """
### v1.3.0 (Optimización UX/SEO y Resolución de Build)
- **Mejora de Rendimiento (LCP):** Se reemplazaron todas las etiquetas `<img>` estandarizadas por el componente `<Image>` optimizado de `next/image` en rutas críticas visuales (`Card.tsx`, `MusicCard.tsx`, `MiniPlayer.tsx`, `PlaylistCard.tsx`, `SetlistView.tsx`, `DiscoveriesTab.tsx`). Esto permite cargar en WebP/AVIF y prioriza la caché interna de Next.js.
- **Accesibilidad (A11y):** Añadidas etiquetas `aria-label` en los botones funcionales basados en íconos de `MiniPlayer.tsx` y `DiscoveriesTab.tsx` para permitir lectura en asistentes de voz y cumplir buenas prácticas.
- **Resolución Build:** Se ha verificado vía `npm run build` que Next.js ahora compila `Exit code: 0` satisfactoriamente sin fallos por tags img no optimizados, dejando únicamente advertencias ESLint.
- **Consolidación de documentación:** Se unifico todo el volumen de planes de sistema, hojas de ruta y checklists de auditorías (`ANALISIS_SEGURIDAD.md`, `PLAN_IMPLEMENTACION.md`, etc) en el documento maestro `DOCUMENTACION.md` dentro de la carpeta central de la app, moviendo lo viejo a /Docs_Archivados tal y como requerían las reglas globales del proyecto.
"""

# Insert v1.3.0 into the Historial de Versiones
v130_inserted = combined.replace("## Historial de Versiones\n", "## Historial de Versiones\n" + v130_changes)

with open("DOCUMENTACION.md", "w") as f:
    f.write(v130_inserted)

# Move old docs
os.makedirs("Docs_Archivados", exist_ok=True)
for file in md_files + ["DOCUMENTACION.md"]:
    os.rename(os.path.join(doc_dir, file), os.path.join("Docs_Archivados", file))
os.rmdir(doc_dir)
