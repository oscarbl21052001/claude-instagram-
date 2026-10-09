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

## Reel esquemático sincronizado con audio, con 3D (`CasaPlusvalia`, `src/Casa/`)
Audio de 11,6 s (`public/audio/casa_plusvalia.m4a`, sacado de `AUDIO.mp4`; la imagen del vídeo original se descartó).
Tarjetas que se escriben → se funden en un cuerpo brillante → casa 3D → emoji con gafas, billete y flecha verde que palpita.
- Los tiempos (`T` en `CasaPlusvalia.tsx`) salen de la transcripción por palabras (`faster-whisper`, modelo `medium`; el
  `small` confundió "plusvalía" con "pluralidad") y del nivel de voz (`silencedetect`: la voz empieza en ~0,55 s y acaba en ~10,1 s).
- Todo el 3D son formas básicas de three.js (sin modelos descargados): casa con tejado extruido, emoji con esferas y
  toro, billete con textura de canvas, flecha extruida con halo y latido. Paleta negro y dorado; verde solo en flecha y billete.
- Capas: fondo → `ThreeCanvas` → tarjetas/cuerpo (2D) → destello (blend `screen`). Un `CanvasTexture` necesita `document`:
  funciona en el render de Remotion.
- Trampa: Remotion renderiza el audio mono **3 dB más bajo** (ley de panoramización). Comprobado por correlación con el
  original (desfase 0 ms). Se corrige después con
  `ffmpeg -i out.mp4 -c:v copy -af "volume=3dB,alimiter=limit=0.97:level=disabled" -c:a aac -b:a 160k final.mp4`.
- Margen lateral: los objetos 3D a menos de ~100 px del borde se ven cortados por el Reel; mirar fotogramas antes de renderizar.
- Render: ~3 min para 11,6 s con `--gl=swangle`.

## Clip "AÑADIR" con tres puntos difuminados (`TresCosas`, `src/Intriga/`)
Clip de 3,5 s ("Es simple, analizo tres cosas a la hora de invertir."): cuando dice "analizo tres cosas" aparecen en el cielo
tres tarjetas numeradas (1., 2., 3.) con el texto desenfocado (intriga). Tiempos de la transcripción por palabras:
analizo 1,14 s · tres 1,62 s · cosas 1,94 s; las tarjetas entran en 1,2 / 1,55 / 1,9 s. El texto oculto es el de las tres
tarjetas de `CasaPlusvalia` (Localización estratégica, Constructora de renombre, Amenities premium).
- Un desenfoque de 11 px sobre letra de 46 px todavía se puede leer; con 20 px y letra de 36 px queda ilegible y cabe en la tarjeta.
- El nombre original del archivo lleva la Ñ en forma descompuesta (N + tilde): en la terminal usar un comodín (`A*ADIR.mov`).
  La copia de trabajo en 1080x1920 es `public/entrada/anadir_1080.mp4`. Audio estéreo: Remotion lo conserva sin bajar nivel.

## Clip "CONTACTAR" con texto en relieve y flecha (`Contactanos`, `src/Contactar/`)
Clip de 5,7 s con dos personas (4K, 60 fps, mono): "Bueno, bueno, ¿y cómo hacen los clientes para invertir en proyectos así?
Es simple, contactarnos." Voz de 0 a 4,84 s; "contactarnos" 4,36–4,84 s. Quién dice cada frase no se sabe por la transcripción.
- "CONTÁCTANOS" con volumen real **sin three.js**: pila de 26 capas del mismo texto con `translateZ` y color de mostaza
  (#E2A826) a oscuro, cara delantera en blanco cálido, `transform-style: preserve-3d` y un giro suave. Trampas: `filter` u
  `opacity` sobre el elemento 3D lo aplanan (poner la opacidad en un contenedor exterior; el brillo, en un div aparte).
- Flecha mostaza hacia abajo con la misma técnica (capas con `clip-path`), con latido de dos pulsos y balanceo.
- Entra en 4,2 s (texto) y 4,5 s (flecha), a la vez que se dice "contactarnos". A 188 px el texto era invasivo: la persona
  usuaria pidió "bastante más pequeño"; ahora 104 px con grosor 38 px, a y=1470, flecha a y=1625.
- Se oscurece un poco la parte baja del vídeo para que el texto se lea. Remotion baja el audio mono 3 dB: corregido con ffmpeg.
- La copia de trabajo es `public/entrada/contactar_1080.mp4` (4K/60 fps pasado a 1080x1920/30 fps).

## Esquema profesional sin dibujos (`EsquemaPlusvalia`, `src/Casa/EsquemaPlusvalia.tsx`)
Versión 2 del Reel del audio `AUDIO.mp4` (11,6 s), pedida como "cambio drástico": nada de casa, emoji ni flecha; solo tarjetas, líneas,
números y un gráfico, sobre fondo claro (blanco roto `#FBF9F4`→`#F5F1E8`). La versión 3D sigue en `CasaPlusvalia` (`renders/casa_plusvalia.mp4`).
- Estructura (sale de la frase, con el criterio de Claude, a petición de la persona usuaria): los tres pilares → contador **3/3
  alineados** → tarjeta oscura "Un producto pensado para" → Disfrutar · Rentabilizar · Grandes ganancias (con la plusvalía del inmueble).
- **Sin cifras inventadas:** el único dato numérico (3/3) sale del discurso. El gráfico de plusvalía es una línea ascendente sin
  números y lleva la nota "Gráfico ilustrativo, sin datos reales". Si hay datos reales (rentabilidad, % de plusvalía…), pedirlos.
- Tiempos (`T`): pilares 0,12/0,20/0,28 s (se escriben), alineados 2,0/2,5/3,0 s, producto 3,64, Disfrutar 5,04, Rentabilizar 6,32,
  Grandes ganancias 7,24, plusvalía 9,1 (chip y gráfico que se dibuja). Mismo audio `public/audio/casa_plusvalia.m4a`; mismo ajuste de +3 dB.
- Contenido en y=250–1520 para respetar la zona inferior de Reels (aproximada). El nombre de las tres tarjetas lo dio la persona usuaria.

## Clip "VIDEO IDEAS": estructura "no es X, es Y" con transición de zoom (`VideoIdeas`, `src/Ideas/`, `tools/sfx/`)
Clip de 6,2 s ("Y recordá, no se trata de mirar solo el valor, es sobre saber cómo y cuándo ingresar.") con **un único corte duro a
los 3,27 s** (ella junto al coche → dentro del coche) que cae en la pausa de la voz (3,05–3,70 s). Se añaden 1,2 s de fotograma
congelado al final (7,4 s en total) para que se lea el cierre.
- **Sin etiquetas ni subtítulos** (pedido de la persona: "solamente las tarjetas"): `ETIQUETAS = false` en `VideoIdeas.tsx` desactiva las etiquetas
  RECORDÁ / NO SE TRATA DE MIRAR SOLO EL / ES SOBRE SABER (el componente `Etiqueta` sigue en el código) y sus sonidos se quitaron de `sfx_ideas.py`.
- Estructura (versión anterior con etiquetas: RECORDÁ → "NO SE TRATA DE MIRAR SOLO EL" palabra a palabra) → **VALOR** (se tacha con una línea mostaza en
  3,0 s) → etiqueta "ES SOBRE SABER" → **CÓMO + CUÁNDO = INGRESAR** (tarjeta final mostaza). Tarjetas oscuras con borde dorado, en el
  tercio superior (y 230–600); letra de 27 px en etiquetas y 48–54 px en palabras (a petición de la persona: "no invasiva").
- **Transición del corte** (aprobada por la persona **sin brillo dorado**): zoom acelerado hacia el coche (x1,365) con desenfoque
  creciente en los ~0,27 s previos y salida desde ese mismo zoom, que se asienta en ~0,4 s. Se simula el desenfoque de zoom con
  4 copias apiladas del vídeo (solo en esos fotogramas). Trampa: el desenfoque usa la copia 1440x2560 (`public/entrada/ideas_1440.mp4`)
  para que el zoom no ablande la imagen. Cámara: empuje lento dentro de cada plano y "punch-in" del 4 % en valor/cómo/cuándo.
- **Sonidos sintéticos** (sin archivos de terceros): `python tools/sfx/sfx_ideas.py public/audio/sfx_ideas.wav` (clics, whoosh,
  golpe grave y acorde suave), a un pico de ~-16 dBFS frente a una voz de -27 dB de media. Verificado que la voz no cambia de nivel.
- Este clip es estéreo, así que Remotion **no** baja el audio 3 dB (solo pasa con audio mono).
