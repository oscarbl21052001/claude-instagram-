# Notas para Claude en este repositorio

Este repo es el taller de vídeos de Oscar (Remotion, `remotion-video/`). Oscar habla español y quiere respuestas cortas y sencillas.

## Repositorios de referencia para edición de vídeo

Todos son públicos y están en la cuenta `oscarbl21052001`. Para leerlos: `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/oscarbl21052001/<repo> /tmp/repos/<repo>` (si la sesión no los tiene, usa `add_repo` con `access: "read"`).

**Cuando Oscar pida ideas para vídeos o edits, lee antes TODOS los repos de esta lista** (primero los principales) y basa las ideas en lo que encuentres, indicando de cuál sale cada una.

### Principales
| Repo | Qué contiene | Cómo usarlo |
|---|---|---|
| `claude-remotion-skill` | Skill de motion graphics con Remotion: 10 reglas de movimiento (springs, entradas con 2–3 propiedades, escalonado, salidas rápidas, grano y viñeta, verificar fotogramas), 17 componentes copiables (contadores, transiciones, revelado de palabras, subtítulos, Ken Burns, parallax, desenfoque de movimiento) y 4 ejemplos terminados. | Leer `remotion-motion-graphics/SKILL.md`, `references/motion-patterns.md` y `references/design-rules.md`. |
| `awesome-opus5-5-videos` | Más de 700 prompts de vídeos virales hechos con código (motion graphics, explainers, escenas 3D, juegos). | Buscar en `prompts/` y `data/videos.json` por tema o estilo. |
| `ui-ux-pro-max-skill` | Guía de diseño: estilos, paletas de color, pares de tipografías, reglas de UX. | Para elegir colores, tipografías y estilo de tarjetas, CTA y subtítulos. |

### Secundarios (leer también al pedir ideas)
| Repo | Qué contiene | Nota |
|---|---|---|
| `VisionDepth3D` | Suite para convertir vídeo 2D a 3D con profundidad por IA (VR/estéreo). | Idea: versiones 3D o con profundidad. Programa de escritorio, no se ejecuta aquí. |
| `tribev2` | Modelo (Meta) que predice la respuesta cerebral a vídeo, audio y texto. | Licencia CC BY-NC (no comercial). No lo he ejecutado; valorar antes de prometer nada con él. |
| `Agent-Reach` | Herramienta para dar a un agente acceso a internet y redes sociales. | Útil para investigar tendencias y referencias. README en chino, hay versión en inglés en `docs/README_en.md`. |
| `blender`, `TripoSR`, `Trellis-3D`, `Meshy-guide` | Blender y herramientas de imagen a 3D. | Ideas con elementos 3D. |

No incluidos por no tratar de vídeo: `WEB`, `WEB-1`, `humanizer`.

## Convenciones del vídeo SPOT 335
- 1080x1920 a 30 fps; la composición final es `SpotNuevoDos` (`remotion-video/src/Nuevo/`).
- Los renders se guardan en `remotion-video/renders/`.
- Chromium no decodifica HEVC 4K: usar la copia H.264 de 1080p.
