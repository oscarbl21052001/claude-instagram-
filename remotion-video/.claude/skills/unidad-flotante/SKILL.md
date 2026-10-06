---
name: unidad-flotante
description: Crear a partir del plano de una unidad inmobiliaria (apartamento, cobertura, casa) un video 3D donde la unidad flota y gira, se levanta el techo, se inclina hacia adelante y muestra la distribución con etiquetas por ambiente, y/o un recorrido de cámara por el interior. Úsalo cuando la persona pida "la unidad flotando", "abrir el techo y mostrar el interior", "plano a 3D", "recorrido 3D" o un video de ese estilo con otro plano.
---

# Unidad flotante: del plano al video

Resultado de referencia ya hecho: composición `UnidadFlotante` (9 s, 1080x1920) y recorrido `TourApto`
para el apartamento tipo 101 (`tools/unidad/specs/tipo101.py`). Para una unidad nueva se repite el proceso con otra
especificación. Todo se hace dentro de `remotion-video/`.

## 1. Qué pedir a la persona antes de empezar
- **Plano**: lo mejor es DWG/DXF o PDF vectorial. Si solo hay imagen (catálogo), avisar de que el resultado será
  **aproximado** (error de unos pocos %) y de que la altura de techo, el grosor de muros y las puertas son supuestos.
- **Qué unidad** (tipo/piso) y las **superficies por ambiente** del plano: sirven para calibrar la escala.
- **Referencias de decoración** (fotos del catálogo) si quiere mobiliario fiel; textos del título; formato de salida.
- **Derechos**: planos y catálogos suelen ser de la constructora. Recordarlo si el video es para clientes o redes.
- Si el plano viene en PDF: `pdftoppm -r 440 -f N -l N -png archivo.pdf pagina` y recortar la unidad con PIL.

## 2. Entorno (una vez por sesión)
- `pip install bpy==4.5.14 pillow numpy` en un venv con Python 3.11. `ffmpeg` ya está instalado.
- **EEVEE no funciona sin GPU**: Cycles en CPU (~30 s/fotograma a 576x1024, 16 muestras).
- Remotion con three.js: `--gl=swangle` y el navegador `headless_shell` de `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/`.
- Para descargar modelos o paquetes hacen falta los dominios permitidos del entorno (ver el resto de notas en `CLAUDE.md`).

## 3. Pasos
1. **Recortar el plano** de la unidad y anotar el rectángulo en píxeles.
2. **Detectar muros**: son líneas negras largas y finas. Buscar segmentos horizontales/verticales con aperturas
   morfológicas (kernel lineal ≥ 55 px, grosor 3) dentro del contorno de la unidad; fondo oscuro y camas dan falsos
   positivos. Revisar el resultado **a mano** sobre la imagen y fijar los segmentos.
3. **Calibrar la escala**: px por metro = sqrt(superficie del ambiente / píxeles² del ambiente). Contrastar con 3 ambientes.
4. **Crear `tools/unidad/specs/<id>.py`** copiando `tipo101.py`: `PLAN` (escala, origen, altura), muros con puertas
   y ventanas (`wall(...)`), suelos, mobiliario (`build_furniture`), `ROOMS` (etiquetas), `LIGHTS`, `WALK_KNOTS`, textos.
5. **Verificar contra el plano** (obligatorio):
   `python tools/unidad/check_plan.py <id> --plan plano.png --crop x0,y0,x1,y1 --out comprobacion.png`
   y mirar la imagen: los muros grises deben coincidir con los negros. Corregir y repetir.
6. **Exportar**: `python tools/unidad/export_unit.py <id>` genera `public/models/<id>.glb` (techo aparte, llamado `TECHO`)
   y `src/Unidad/units/<id>.ts`.
7. **Registrar la composición** en `src/Root.tsx`, copiando la de `UnidadFlotante` con `defaultProps={{ config: <id> }}`
   y un `id` nuevo (por ejemplo `UnidadCobertura401`).
8. **Comprobar fotogramas** (frames 20, 100, 200 y 262) con `npx remotion still <Id> out/x.png --frame=N --gl=swangle --browser-executable=<headless_shell>`.
   Revisar: modelo entero dentro del cuadro, colores, etiquetas sobre su ambiente, sin objetos sueltos.
9. **Render final**: `npx remotion render <Id> out/<id>.mp4 --gl=swangle --codec=h264 --browser-executable=<headless_shell>` (~5 min).
   Enviar el mp4 con SendUserFile y guardarlo en `renders/`.
10. **Recorrido opcional**: `walkthrough.py frames <id> --out work/<id>`, luego `mids`, después `assemble_walk.py` (ver cabecera de cada
    script) y una composición como `TourApto` (copiarla y ajustar etiquetas y tiempos).

## 4. Trampas conocidas
- La cámara del recorrido **no debe atravesar muebles altos** (fotograma negro) ni pasar a <0,7 m de postes de vidrio (cuña negra).
  Revisar fotogramas negros con `ffprobe ... signalstats` (YAVG<25).
- **No usar `minterpolate`** de ffmpeg: deforma la imagen en los giros. Renderizar intermedios reales donde la cámara gira rápido.
- glTF no exporta materiales procedurales: `export_unit.py` fija colores planos. Si se añade un material nuevo, añadirlo a `FLAT`.
- No exportar plantas con hojas de esfera rotada (salen objetos sueltos) ni techos a media altura que tapen el interior.
- Las animaciones de three.js deben depender solo de `useCurrentFrame()`; sin `useFrame`.
- El nombre de objetos de exterior que se descartan debe ser único (`oceano`, `jardin`...): un prefijo corto como `mar` borra marcos y cuadros.
- Los renders de Cycles salen sobreexpuestos con luz cálida: usar AgX y revisar exposición.

## 5. Qué decir a la persona al entregar
- Que es una **recreación aproximada** (si el plano era imagen) y que no es fotorrealista.
- Qué supuestos se hicieron (altura de techo, puertas, mobiliario) y qué falta (baños, suites no recorridas).
- Dónde queda guardado (rama y archivos) y que no hay PR salvo que lo pida.
