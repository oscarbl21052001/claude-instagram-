# Notas de trabajo: edición de video con Remotion

Idioma de trabajo con la persona usuaria: español. No crear PR salvo que lo pida.
Nunca guardar ni repetir tokens de GitHub en archivos o mensajes.

## Preferencias de la persona usuaria
- Acabado **profesional**: nada infantil ni recargado. Movimiento sobrio, resortes suaves, pocos efectos.
- Estilo de referencia (grabación que aportó): fondo oscuro violeta, título grande detrás del sujeto con
  etiquetas naranjas, subtítulos por palabras con la palabra clave resaltada y tarjetas con iconos que
  aparecen. Se usa **solo el estilo**, nunca su contenido.
- El primer video de prueba (selfie sobre propiedades en el extranjero) **no se reutiliza en ningún sitio**:
  ni contenido, ni subtítulos, ni estilos de aquella composición (playa dibujada, Matrix, subtítulos amarillos),
  que ya se retiró del repo. Para videos nuevos se empieza de cero con `src/kit/`.
- Fondos hechos con código se notan: si hace falta un fondo realista, proponer una imagen o clip real/IA
  y pedir permiso antes de generar nada (Higgsfield consume créditos).
- Antes de entregar, mirar varios fotogramas por escena y decir qué no convence.

## Flujo para un video nuevo
1. La persona sube el video a la rama `mi-video` (carpeta `remotion-video/public/`) y avisa del nombre.
   Máx. 100 MB por archivo en GitHub; mejor 1080p/30 fps. Un adjunto de chat debe pesar < 25 MB.
2. `git fetch origin mi-video` y traer el archivo. `ffprobe` para duración, resolución, rotación y audio.
3. Copia de trabajo 1080x1920 a 30 fps en H.264 (los móviles graban HEVC 4K): 
   `ffmpeg -i entrada.mov -vf "scale=1080:1920,fps=30" -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k video_1080.mp4`.
   Recorte del sujeto: extraer fotogramas JPG (`f_NNNN.jpg`, NNNN = nº de fotograma) y ejecutar
   `python tools/recorte/recorte.py <fotogramas> public/recorte <seguimiento.json>` (MODNet en CPU, ~0,6 s por
   fotograma; deja RGBA .webp y la posición de la cabeza). `public/recorte/` está en .gitignore (74 MB por 873
   fotogramas): hay que regenerarlo en cada máquina. Dependencias: onnxruntime pillow numpy scipy huggingface_hub.
4. Transcribir con `faster-whisper` (modelo `small`, `language="es"`, `word_timestamps=True`).
   El audio no se "oye": solo se lee la transcripción, que puede fallar con nombres propios.
5. Componer en Remotion con los componentes de `src/kit/`. Orden de capas con sujeto recortado:
   fondo → elementos/tarjetas → texto detrás → sujeto recortado encima.
6. Verificar con `npx remotion still` en varios fotogramas y renderizar con
   `npx remotion render <Id> out/<nombre>.mp4 --browser-executable=<headless_shell> --codec=h264`.
   El navegador que sirve es el `headless_shell` de `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/`
   (el binario `chromium` normal falla). `out/` está en .gitignore: enviar el mp4 con SendUserFile.
7. Subir a la rama de trabajo `claude/remotion-new-project-8jcj8e`. La persona hace `git stash` y
   `git checkout` en su Mac; sus archivos locales sin guardar pueden dar conflicto.

## Requisitos del entorno en la nube
- Red "Personalizado" con estos dominios añadidos (más la lista de gestores de paquetes):
  `huggingface.co`, `cdn-lfs.huggingface.co`, `cas-bridge.xethub.hf.co`, `cas-server.xethub.hf.co`,
  `transfer.xethub.hf.co`, `us.aws.cdn.hf.co` (y `*.cdn.hf.co`). Sin ellos no se descargan los modelos.
- Python: `pip install faster-whisper onnxruntime pillow numpy huggingface_hub`. `ffmpeg` ya está instalado.
- Fuentes del kit (OFL) ya están en `public/fonts/`.

## Kit de diseño (`src/kit/`)
Estilo oscuro "cinema". Valores de `tokens.ts` tomados del repo ui-ux-pro-max-skill.
`Background` · `GlassCard` · `Tag` · `Headline` · `TypeWriter` · `WordCaptions` · `Icon` · `useEnter` (resorte
damping 20 / stiffness 90) · `expoOut` (curva 0.16,1,0.3,1) · `useKitFonts` · `safe` (zonas seguras
aproximadas de Reels, no verificadas con fuente oficial). Demo: composición `KitDemo`.
Escala: los px de diseño web (base 390) se multiplican por `UI_SCALE` ≈ 2,77 para 1080 px de ancho.

## Repo de datos de diseño: oscarbl21052001/ui-ux-pro-max-skill (MIT, fork de nextlevelbuilder)
- Es una skill de diseño de interfaces web/app. **No tiene nada de video ni de Remotion**: sirve como
  fuente de datos de estilo. El movimiento se escribe en Remotion.
- Añadirlo a la sesión: `add_repo` (access `read`), luego
  `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/oscarbl21052001/ui-ux-pro-max-skill /home/user/oscarbl21052001/ui-ux-pro-max-skill`.
- Datos en `src/ui-ux-pro-max/data/` (leer con `csv`, **no ejecutar sus scripts** sin revisarlos):
  `styles.csv` (85 estilos con efectos y animación, variables), `colors.csv` (161 paletas por tipo de producto),
  `typography.csv` (74 emparejamientos), `google-fonts.csv`, `icons.csv`, `charts.csv`, `ux-guidelines.csv`,
  `ui-reasoning.csv`.
- Otros estilos con potencial para video: Glassmorphism, Bento Grids, Aurora UI, Kinetic Typography,
  Liquid Glass, Kinetic Brutalism.
- Antes de ejecutar código de repos de terceros, revisarlo. Las skills corren con permisos amplios.

## Unidades 3D: plano → unidad flotante y recorrido
Proceso completo, entradas que pedir, comprobaciones y trampas: **`.claude/skills/unidad-flotante/SKILL.md`**
(leerlo antes de empezar cualquier video de este tipo). Código en `tools/unidad/` (Blender sin interfaz con `bpy`),
composiciones `UnidadFlotante` (`src/Unidad/`, recibe una configuración por unidad) y `TourApto` (`src/Tour/`).
- La unidad de referencia es `tipo101` (`tools/unidad/specs/tipo101.py`). Una unidad nueva = una especificación nueva.
- Renders de ejemplo guardados en `renders/`. EEVEE no funciona sin GPU: Cycles en CPU.
- Los planos de catálogo son imágenes, no vectores: el modelo es aproximado. Pedir DWG/DXF/PDF vectorial si existe.
- Avisar siempre de los derechos del plano y del catálogo si el video es para clientes o redes.

## Edición "esquema + PIP" (composición `EsquemaPip`, `src/Edit/`)
Video hablado (Reel 1080x1920) → esquema animado en la mitad superior y la persona recortada en un PIP en la mitad
inferior, con paso suave entre pantalla completa y PIP. Paleta de la persona usuaria: `#C7AE6A #000000 #d5c28f
#b99a45 #1a1a1a #e3d6b4` (constantes `P` en `EsquemaPip.tsx`; el kit violeta no se usa aquí).
- Datos por video: `src/Edit/words.ts` (palabras con tiempos de Whisper, corregidas por la persona),
  `STEPS` (texto y segundo en que aparece cada tarjeta, `**negrita**` = palabra clave dorada) y tiempos
  `T_IN/T_IN_END/T_OUT/T_OUT_END/SCHEMA_EXIT`. `src/Edit/head.ts` lo genera `tools/recorte/recorte.py`.
- El PIP sigue la cabeza con una "cámara virtual" suavizada. Capas del PIP: degradado → video (se desvanece) →
  recorte encima, así la persona no parpadea al cambiar el fondo.
- Antes de montar, enseñar a la persona el esquema propuesto y las palabras de la transcripción dudosas
  (Whisper falla con "en pozo", "cuotas", "amortizar", "apalancamiento"): no poner en pantalla texto sin confirmar.
- Render: unos 10 min en la nube para 35 s (`--gl=swangle`). Los subtítulos usan contorno negro para leerse sobre
  la camisa blanca. La zona segura de Reels es aproximada (subtítulos a y=1565).

## Calle pintada + texto pegado al suelo en video de dron (`CalleDorada`, `src/Calle/`, `tools/calle/`)
Plano de dron girando: se pinta de mostaza dorado (`#E2A826`) la calle principal y se escribe un texto tumbado en
el suelo que sigue el giro de cámara. Probado con un clip de 2 s (62 fotogramas); no sé cómo se comporta con clips largos.
1. Fotogramas 1080x1920 (`f_NNNN.jpg`, desde 0) → `tools/calle/segmentar_calle.py` (SegFormer-B5 ADE20K, clase "road",
   ~30 s por fotograma en CPU) → `road_NNNN.npy`.
2. `tools/calle/seguir.py <fotogramas> <road> todo` → `G_todo.npy` (homografías acumuladas SIFT+RANSAC; en un giro
   puro valen para cualquier plano). Para comprobar: IoU entre la máscara del fotograma 0 llevada al k y la real.
3. `tools/calle/procesar.py` → `public/calle/p_NNNN.webp` (dorado con la luz de la imagen) y `src/Calle/datos.ts`
   (matriz `matrix3d` del texto por fotograma). Solo se pinta la calle conectada con la del primer y último fotograma
   (descarta solares y aparcamientos que el modelo también llama "road"). `tools/calle/texto.py` recalcula solo el texto
   (variable `QUAD` = esquinas del tramo de calle en el fotograma 0).
4. El texto se recorta con la silueta de la calle y se revela en el sentido de lectura. Trampa: con `clipPath`, un
   texto más ancho que su textura (1800 px) se corta por el extremo; usar fuente ≤ 420 px.
Limitaciones: en el clip 1008, al final del giro la máscara pinta también el solar de obra junto a la calle; el audio de
los clips de prueba era silencio (-91 dB).

### Versión con bordes rectos (clip RAIL, composición `CalleRail`) (pedida por la persona tras ver la versión irregular)
Pintar el borde de la máscara del modelo deja los lados irregulares (invade aceras y solares). Ahora la calle es un
**polígono de lados rectos** que se define a mano sobre el fotograma de referencia (con cuadrícula para leer
coordenadas) y se lleva a cada fotograma con la homografía del giro; el modelo solo se usa para recortar obstáculos
(árboles, coches, camiones) dentro del polígono y nunca define el borde. Un lado puede tener un escalón si la calle
realmente cambia de borde (solar en el clip RAIL). Preferir polígonos algo más estrechos que la calle antes que pasarse.
1. Igual que arriba, con `tools/calle/segmentar_calle.py <fotogramas> <salida> 8` (solo 1 de cada 8 fotogramas: dan
   `road_` y `occ_`; ~30 s por fotograma) y `seguir.py` (`G_todo.npy`).
2. `tools/calle/config/rail.json`: `tramos` (polígono, fotograma de referencia, rango de fotogramas) y `quad` del texto.
   `python tools/calle/pintar_recta.py <fotogramas> <road> <G_todo.npy> <config.json> public/calle_rail src/Calle/datosRail.ts`.
3. `src/Calle/CalleDorada.tsx` (`CalleEscena`, recibe una `CalleConfig`) y `src/Calle/CalleRail.tsx` con los tiempos.
`G` solo es fiable mientras el plano no gira más de unos 70-80°: más allá las homografías divergen, por eso la calle
del inicio se limita a los fotogramas 0-72 y la del final se ancla al último fotograma (82-98).
