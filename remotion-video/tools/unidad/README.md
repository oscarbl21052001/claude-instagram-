# tools/unidad: de un plano a una unidad 3D

Proceso completo y criterios en `.claude/skills/unidad-flotante/SKILL.md`. Resumen:

| Script | Para qué | Entorno |
|---|---|---|
| `lib.py` | Materiales, primitivas, muros con huecos, mobiliario, cielo y luces | bpy |
| `specs/<id>.py` | Datos de cada unidad: escala, muros, ambientes, mobiliario, luces y ruta de cámara | bpy |
| `check_plan.py` | Vista cenital superpuesta al plano para comprobar el modelo | bpy + pillow |
| `export_unit.py` | `.glb` ligero (techo aparte) y `src/Unidad/units/<id>.ts` | bpy |
| `walkthrough.py` | Fotogramas del recorrido con Cycles (CPU) | bpy |
| `assemble_walk.py` | Une fotogramas a 24 fps en un mp4 | pillow, numpy, ffmpeg |

Instalación: `pip install bpy==4.5.14 pillow numpy` (Python 3.11). Ejecutar desde `remotion-video/`.
