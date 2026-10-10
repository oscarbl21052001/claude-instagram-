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
- Estructura (versión anterior con etiquetas: RECORDÁ → "NO SE TRATA DE MIRAR SOLO EL" palabra a palabra) → **VALOR** (entra en 2,1 s; se tacha con una línea mostaza en
  3,0 s) → etiqueta "ES SOBRE SABER" → **CÓMO + CUÁNDO = INGRESAR** (tarjeta final mostaza). Tarjetas oscuras con borde dorado, en el
  tercio superior (y 230–600); letra de 27 px en etiquetas y 48–54 px en palabras (a petición de la persona: "no invasiva").
- **Transición del corte** (aprobada por la persona **sin brillo dorado**): zoom acelerado hacia el coche (x1,365) con desenfoque
  creciente en los ~0,27 s previos y salida desde ese mismo zoom, que se asienta en ~0,4 s. Se simula el desenfoque de zoom con
  4 copias apiladas del vídeo (solo en esos fotogramas). Trampa: el desenfoque usa la copia 1440x2560 (`public/entrada/ideas_1440.mp4`)
  para que el zoom no ablande la imagen. Cámara: empuje lento dentro de cada plano y "punch-in" del 4 % en valor/cómo/cuándo.
- **Sonidos sintéticos** (sin archivos de terceros): `python tools/sfx/sfx_ideas.py public/audio/sfx_ideas.wav` (clics, whoosh,
  golpe grave y acorde suave), a un pico de ~-16 dBFS frente a una voz de -27 dB de media. Verificado que la voz no cambia de nivel.
- Este clip es estéreo, así que Remotion **no** baja el audio 3 dB (solo pasa con audio mono).

## Clip "CAMBIO": cambiar el texto de la calle en un video ya montado (`tools/cambio/`, `renders/cambio_ubicacion.mp4`)
`CAMBIO.mp4` (4,04 s, 1080x1920, 24 fps, sin audio): terraza → giro rápido → dron con la calle amarilla y el texto "300 METROS DEL MAR".
La persona pidió cambiar **solo** el texto por "UBICACIÓN ESTRATÉGICA" con la misma letra, color y patrón de aparición. El clip de dron no sale de
ninguno de los renders del repo (no coincide con `calle_rail.mp4`), así que **no se pudo re-renderizar con Remotion**: se editan los fotogramas.
1. `ffmpeg -i CAMBIO.mp4 out/full/%03d.png` (097 fotogramas). Texto = píxeles casi blancos dentro de la calle amarilla (`common.py: masks`).
2. `ajustar96.py`: homografía textura→fotograma en el último fotograma (esquinas de cada línea + plantilla Bebas Neue 420 px). `seguir.py`: ECC entre
   fotogramas contiguos sobre el entorno de la calle (cc ≥ 0,97) propaga la homografía hacia atrás (79–97).
3. `componer.py`: borra el texto viejo con `cv2.inpaint` (Telea), dibuja el nuevo (crema `#FFF8E7`, opacidad 0,96, sombra suave) recortado a la calle y al
   **frente del barrido medido en el texto original** (`FRENTE`, px de textura: 79→451, 80→680, 81→1108, 82→1509, 83→1650, ≥84 completo). Solo se tocan
   los fotogramas 79–97; los demás se copian (re-codificados a crf 12). El texto pintado no lleva desenfoque de movimiento aunque el fondo sí.
- Texto nuevo: líneas "UBICACIÓN" / "ESTRATÉGICA" a la misma fuente y tamaño; "ESTRATÉGICA" es ~5 % más larga que la línea más larga original. Sin kerning (PIL).
- Requiere `fonttools brotli` para convertir `public/fonts/BebasNeue-Regular.woff2` a `/tmp/bebas.ttf`, y OpenCV (venv `tripo`).

## Clip "AMENITIES": texto nuevo, tarjetas y nitidez (`Amenities`, `src/Amenities/`, `tools/amenities/`, `renders/amenities_premium.mp4`)
`AMENITIES.mov` (1,47 s, HEVC 1440x2544, 30 fps, audio estéreo AAC): terraza → 3 recuadros apilados (piscina exterior, piscina interior, ducha con jardín)
con el texto fino "2 PISCINAS" ya grabado en el vídeo. Pedido: texto "AMENITIES PREMIUM" (Bebas Neue crema `#FFF8E7`, igual que el texto de la calle)
en el mismo sitio, recuadros convertidos en tarjetas oscuras con borde dorado, imagen más nítida, mismo formato (1440x2544) y misma duración.
- La persona escribió "AMENITIS": se corrigió a "AMENITIES" (lo confirmó). El material de origen es blando (parece 540p ampliado): se mejora la nitidez,
  pero no se inventa detalle.
- `tools/amenities/quitar_texto.py`: borra "2 PISCINAS" (máscara = top-hat de trazos claros por fotograma + intersección estable, `cv2.inpaint` + suavizado).
  Quedan restos muy suaves bajo el texto nuevo. Luego `ffmpeg … -vf "hqdn3d=2:2:5:5,unsharp=lx=5:ly=5:la=1.0:cx=5:cy=5:ca=0.4,unsharp=lx=11:ly=11:la=0.7"`
  → `public/entrada/amenities_clean.mp4` (límite de `unsharp`: lx/2+ly/2 ≤ 25). Nitidez (var. Laplaciano) 25 → ~200.
- Composición: fondo = terraza congelada en el fotograma 7, desenfocada y oscurecida al entrar las tarjetas; 3 tarjetas (x 60, 1320x760, separación 40) que
  recortan la zona de cada recuadro original (recuadros reales: x≈50–1392; bordes inferiores con degradado, por eso `cy` se subió unos px) y mantienen congelado el
  primer fotograma completo mientras entran (fotogramas 7/9/11). Sombra oscura abajo en la tarjeta 3 para leer el texto.
- Audio original copiado (`public/audio/amenities.m4a`); verificado desfase 0 ms, correlación 1,0 y mismo nivel (−19,7 dB): estéreo, Remotion no lo baja.

## Clip "CONSTRUCTORA": limpiar una grabación de pantalla de una historia y poner texto nuevo (`Constructora`, `src/Constructora/`, `tools/constructora/`, `renders/constructora_renombre.mp4`)
`CONSTRUCTORA.mov` (1,63 s, HEVC 1440x2530, 30 fps, audio **en silencio**, -91 dB): grabación de pantalla de una historia de Instagram ajena (cuenta "J.E vargas"),
con un corte a los 1,03 s (fotograma 31→32: oficina → hombre junto a la ventana). Pedido: quitar marcas de agua y el verde de los lados, quitar **todo** texto/logo
original ("Atualizações!", logos, interfaz) y poner "CONSTRUCTORAS DE RENOMBRE" (dos líneas, estilo de "AMENITIES PREMIUM", abajo).
- Lo que había encima: borde discontinuo de la grabación y franjas diagonales amarillas en los lados, interfaz de la historia (progreso, avatar, nombre, iconos, barra "Responder…",
  "Detener grab…"), logo dorado grande arriba con contorno hexagonal tenue, "Atualizações!", logo inferior y, **dentro de la escena 1, el letrero real de la pared**
  ("J.E VARGAS EMPREENDIMENTOS" en dorado y verde sobre el cristal). **Ese letrero NO se borra** (la persona lo aclaró: es parte del video, no una marca de agua);
  `MANTENER_LETRERO = True` en `limpiar.py`. Se borra todo lo demás (interfaz, logos superpuestos, "Atualizações!").
- `tools/constructora/limpiar.py`: recorte `(80,150)-(1360,2400)` (quita borde, franjas, parte alta/baja de la interfaz) reescalado a 1440x2530 (zoom ×1,125); máscaras por color,
  top-hat y cajas; relleno con **LaMa** (`big-lama.pt` de `fashn-ai/LaMa` en Hugging Face, TorchScript, CPU, a media resolución: ~3 s por fotograma). Probados y descartados:
  `cv2.inpaint` (Telea) sobre el letrero deja manchas (el borrado del letrero se quedó como opción apagada); a resolución completa LaMa tardaba ~100 s por fotograma. La máscara se calcula por fotograma; el parpadeo del relleno es
  del mismo orden que el del original (dif. consecutiva 1,9 vs 1,8).
- `tools/constructora/color.py`: el verde era una capa que sube hacia arriba, abajo y los lados (tinte medido +17/+14 arriba/abajo, +6 izq., +3 der. sobre el centro); se resta con un mapa
  exponencial, se desatura el verde-cian de baja saturación (se respeta la vegetación, que es viva) y se da algo de exposición/contraste. Luego `hqdn3d` + `unsharp` (como en AMENITIES) →
  `public/entrada/constructora_clean.mp4`.
- Composición: vídeo con zoom 1,025 (quita los puntitos de las esquinas), velo oscuro suave abajo y el texto (Bebas Neue 112 px, crema `#FFF8E7`, sombra suave) que entra a 0,27 s.
- Límites: puede quedar algún resto muy tenue del contorno hexagonal del logo superior, y todo lo rellenado (logos, interfaz) es inventado por el modelo.
  Es contenido de un tercero: avisar de permisos de marca/personas antes de publicar.

## Clip "UNIDADES": texto 3D protagonista que sale por detrás de la mujer (`Unidades`, `src/Unidades/`, `renders/unidades_vendidas.mp4`)
`UNIDADES.mov` (2,67 s, HEVC 1440x2560, 30 fps, audio estéreo, plano fijo de un edificio con la presentadora abajo, sin texto ni interfaz). Transcripción (`faster-whisper` medium):
"Llevamos más de 15 unidades comercializadas." (0–2,64 s; "más" 0,42 · "15" 0,78–1,0 · "unidades" 1,0–1,66 · "comercializadas" 1,66–2,64).
Pedido: en ese momento aparece "**+15 UNIDADES VENDIDAS**" (texto elegido por la persona; "+MÁS DE" era redundante), en dos líneas ("+15" grande / "UNIDADES VENDIDAS"),
mostaza con volumen, entrando desde abajo con desenfoque **por detrás de ella** hasta la zona alta. Sin añadir segundos: se adelantó la entrada (empieza a 0,1 s, legible desde ~0,7 s).
- Recorte de la mujer: `python tools/recorte/recorte.py out/un_f public/recorte_unidades x.json` con fotogramas `f_NNNN.jpg` desde 0 (MODNet, ~80 s para 80 fotogramas a 1440x2560;
  `public/recorte_unidades/` está en .gitignore). Capas: vídeo → velo oscuro superior → texto 3D → recorte encima. `public/entrada/unidades_1440.mp4` = copia H.264 con audio.
- Texto: Bebas Neue 430 px ("+15") y 160 px; pila de 30 capas con `translateZ` (96 px de grosor), cara con degradado `#FFDD85→#F2BE45→#E2A826→#B98512`, laterales hacia `#4A3006`,
  sombra grande detrás, brillo que barre la cara una vez, balanceo suave. Entrada: curva `bezier(0.3,0.05,0.2,1)` en 30 fotogramas, desenfoque 30→0 px, giro de 62° que se endereza. Bloque final centrado en y=640.
  Con una curva más agresiva (expo-out) el texto subía demasiado deprisa y no se notaba que salía de detrás de ella.
- Audio original (estéreo): desfase 0 ms, correlación 0,9998, mismo nivel (−26,3 dB). Trampa no ocurrida aquí: Remotion solo baja 3 dB el audio **mono**.

## Edit "CAPRI" (EDIT_COMPLETO.mov): fondo difuminado, tarjetas detrás de ella y esquemas (`CapriEdit`, `src/Capri/`, `tools/capri/`, `renders/capri_edit.mp4`)
`EDIT_COMPLETO.mov` (24,9 s, 1080x1920, HEVC 50 fps, audio estéreo; la persona lo subió comprimido con `avconvert` porque el original pesaba 114 MB > 100 MB de GitHub). Tres cortes duros: **6,28 s** (fotograma 314),
**12,70 s** (635) y **21,00 s** (1050; cambia de sala). Transcripción (`faster-whisper` medium; "Residenz" = **Capri Residence**, confirmado): "Hoy este emprendimiento es uno de los mejores para poder ingresar con un monto mínimo
y un gran financiamiento (ingresar 9,5 · monto mínimo 10,32–11,16 · gran financiamiento 11,68–12,68). Capri Residence (12,94) es uno de los emprendimientos más completos (14,5) con unidades de dos dormitorios (16,28),
amenities premium (18,12) y una ubicación extraordinaria (19,36–20,94). Si querés más info… contactame."
- Pedido: desde 6,28 s fondo difuminado con los colores del propio fondo (corte tapado), 7–8 s dos tarjetas vacías detrás de ella (referencia), esquema ~9–12,5 s, corte de 12,70 s mínimo, 13–21 s esquema arriba a la izquierda,
  18–19 s tarjeta grande vacía a la derecha, 21 s transición y fondo real. **Estilo de tarjetas: fondo blanco con marco dorado** (decisión de la persona). El contenido de las tarjetas grandes llegará después.
- Recorte de ella: `recorte.py` **por escena** (el suavizado temporal no debe cruzar los cortes): `out/e_s1` (290–313), `e_s2` (314–634), `e_s3` (635–1049) → `public/recorte_edit/` (gitignore; ~13 min para 760 fotogramas). Fotogramas
  extraídos con `-start_number 0` (nombre = índice a 50 fps). La mesa y la taza se difuminan con el fondo: el recorte de ella se funde con un degradado hacia 1680 px (escena 2) / 1610 px (escena 3).
- Fondo: `python tools/capri/plate.py 400 800 public/edit_plate/plate.jpg` (silueta rellena + desenfoque fuerte de un fotograma de cada escena, promediados + mezcla con un degradado azul profundo). Un solo fondo para las dos escenas.
- Capas: vídeo (se desenfoca y se cubre con el fondo entre 5,88 y 6,28 s) → fondo → tarjetas de detrás → recorte de ella → esquemas delanteros. Cortes 1 y 3: zoom ×1,34 y desenfoque (como VideoIdeas, sin brillo).
- **Corte de 12,70 s**: medido en el recorte (ancho de cabeza 203→177 px, coronilla 1022→1011, centro 516→522): mitad del ajuste de escala/posición justo antes y mitad justo después (16 fotogramas). Trampa: el ancho de hombros
  daba 595→443 (0,745) porque cambia la pose de los brazos; el de la cabeza (0,87) es el fiable. Se reduce mucho pero no es invisible: cambia su pose.
- Esquema 1 (9,3–12,42 s): "PARA INGRESAR" · "CON UN / MONTO MÍNIMO" · "+" · "Y UN / GRAN FINANCIAMIENTO". Esquema 2 (12,94–20,7 s, x 70, y 250–950): CAPRI RESIDENCE · UNO DE LOS MÁS COMPLETOS · UNIDADES DE 2 DORMITORIOS · AMENITIES PREMIUM ·
  UBICACIÓN EXTRAORDINARIA, con hilo dorado que se dibuja y la tarjeta activa resaltada. Solo palabras de ella; sin cifras inventadas. Tarjeta grande vacía a la derecha desde 18,4 s.
- Render: ~13 min para 1244 fotogramas a 50 fps (`--gl=swangle`). Audio estéreo del original verificado: desfase 0 ms, correlación 0,9999, nivel −26,4 dB.

### CAPRI v2 (cambios pedidos tras ver la v1)
La persona pidió: fondo difuminado **más claro y camel** (no oscuro ni tan fuerte) **con la mesa y sus elementos visibles**; tarjetas grandes que **quepan enteras en el plano y duren más**; ella **algo más grande**;
y "el recorte y el fondo lo más perfectos posible, aunque tardes más". Lo que cambió:
- **Recorte de alta calidad** (`tools/capri/recorte_hq.py` + `recorte_post.py`, ~35 min en total para 760 fotogramas): MODNet *crudo* (sin los rellenos de `recorte.py`, que cerraban huecos y dejaban parches de fondo) → trimap (suavizado ±1 fotograma sin
  cruzar cortes) → **ViTMatte small** (`hustvl/vitmatte-small-distinctions-646`, ~3 s por recuadro de ella en CPU) → suavizado temporal solo donde el alfa es estable → **estimación del color de primer plano** (`pymatting.estimate_foreground_ml`, quita el
  borde oscuro del fondo en el pelo) → corte contra la mesa con borde de 12 px → `public/recorte_hq/` (gitignore). Mucho mejor que MODNet solo en pelo y bordes. Pip: `transformers` 4.35 pide `tokenizers<0.15` (se fijó `tokenizers==0.14.1`, que
  baja `huggingface-hub` a 0,17; `faster-whisper` sigue funcionando) y `pymatting`.
- **Fondo** (`tools/capri/fondo.py`, un JPG por fotograma en `public/edit_bg/`, gitignore): fotograma real **sin ella** (desenfoque normalizado σ=18 donde los píxeles de ella no cuentan; σ=70 de reserva) → luminancia mapeada a una rampa **camel claro**
  (`STOPS`) mezclada con algo de color real (más en zonas cálidas: mesa y paredes). La mesa, la taza y el móvil son parte del fondo: ella se corta en el borde superior de la taza (escena 2: y 1758, escena 3: y 1632; escena 1: 1678).
- **Encuadre más cercano** ×1,16 (pivote abajo-centro) desde el primer corte, para que ella se vea mayor. Corte de 12,70 s: ahora solo **después** del corte, fondo y ella arrancan ampliados ×1,147 (=203/177 del ancho de cabeza) y se asientan en 0,5 s
  (no hay bordes vacíos porque la escala siempre es ≥ 1).
- **Tarjetas grandes**: las dos de 7–9 s ahora entran a 6,45 y 6,8 s y salen a 9,25 s (x 40–510 y 570–1040: enteras en el plano, ligera perspectiva); la grande de la derecha entra a 16,4 s (antes 18,4) y sale a 20,7 s (x 610–1040).
  Esquemas movidos hacia arriba para no chocar con su cabeza más grande (esquema 1 y 230–730; esquema 2 x 64, y 200–812, tarjetas de 510 px).
- Render: ~13 min (`--gl=swangle`, 1244 fotogramas a 50 fps, 40 MB). Audio igual al original (desfase 0 ms, corr. 0,9999).
- Trampa: `pkill -f <patrón>` mata la propia shell si el patrón aparece en el comando; matar por PID (`ps aux | grep … | awk '{print $2}' | xargs kill`).

### CAPRI v3 (arriba sin fondo, abajo fondo real, ella siempre nítida)
Cambios pedidos tras ver la v2: difuminar **solo de la mitad de la pantalla hacia arriba** (para esquema y tarjetas grandes), **mantener el fondo y los colores originales abajo**, con un **degradado de desenfoque** entre las dos zonas; arriba
"directamente no se vea el fondo" (degradado camel liso, sin panel ni logo); **ella nítida en todo momento**; transición profesional si el corte se nota más; bajar a la mujer **sin cambiar su tamaño**; composición **simétrica**.
- Fondo (`tools/capri/fondo.py`, un JPG por fotograma, ahora 290–1075): nivel 0 = fotograma real **sin ella** (hueco rellenado con el entorno desenfocado; así el zoom/desenfoque de las transiciones no deja una copia borrosa de ella bajo su recorte); franja
  `Y0=660…Y1=1230` (coordenadas del vídeo; con el encuadre ×1,16 y pivote (540,1200) cae hacia la mitad de la pantalla): desenfoque creciente hasta σ=18 + `limpio()` = **degradado camel liso** (#E2C498 arriba → #CEA676) con un poco de ruido anti-bandas;
  mezcla `smoothstep(1,35·u)`. Escena 4 (≥1050): solo "sin ella", sin franja.
- **Ella siempre nítida**: el zoom y el desenfoque de las transiciones actúan **solo en el fondo**; el recorte de ella solo sigue el zoom (sin desenfoque). Para eso hizo falta recortarla también en el arranque del plano final (fotogramas 1050–1075,
  `recorte_hq.py 1050 1075` + `recorte_post.py 1050 1075`; `mesa(k)` devuelve 10⁵ para ese plano: no hay mesa). El fondo "sin ella" se usa hasta el fotograma 1075; luego, el vídeo real.
- Cortes (todos con zoom + desenfoque solo del fondo): 6,28 s (×1,3, desenfoque 16, 6 fotogramas antes y 20 después), 12,70 s (×1,18, desenfoque 10: más suave) y 21,00 s (×1,3). Alineación de ella tras el corte (escala ≥1, sin bordes vacíos):
  corte 1: mismo tamaño pero 64 px más abajo y 14 px a la izquierda → se compensa; corte 2: ancho de cabeza 209→182 → ×1,148 desde la cabeza. Se asienta en ~0,4 s.
- Ella más abajo sin cambiar de tamaño: el encuadre ×1,16 se hace desde el punto (540,1200) en vez de abajo-centro (≈110 px más abajo, más aire arriba).
- Simetría: tarjetas del inicio iguales y espejadas (x 40–510 / 570–1040, y 150, h 930, perspectiva ±9°); esquema 2 y tarjeta grande de la derecha con el mismo ancho (480), la misma altura (y 200–940) y márgenes iguales (40 px).
- Entrega: `renders/capri_edit.mp4` (41 MB, calidad alta) y `renders/capri_edit_ligero.mp4` (16 MB, para enviar por chat: el límite es 30 MB). Audio igual al original (desfase 0 ms, corr. 0,9999, −26,4 dB).

### CAPRI v3.1: imagen en la tarjeta grande de la izquierda
La persona subió `remotion-video/public/entrada/CAPRI.jpeg` (render arquitectónico del edificio, 3327x4160, 4:5, sin texto) directamente a `main` ("Add files via upload"; lo llamó "imagen Neva" = nueva) y pidió ponerla en **una de las tarjetas
grandes del inicio**: se eligió la **izquierda** (la primera en entrar, 6,45 s). `TarjetaVacia` acepta `imagen`; copia ligera `public/entrada/capri_card.jpg` (1200x1500). Como el render es 4:5 y la tarjeta casi 1:2 se recorta a lo alto (`objectFit: cover`) y se desplaza
muy despacio de izquierda a derecha (`objectPosition` 22 %→62 %, zoom 1,02→1,08 durante los 2,8 s de la tarjeta) para que se vea todo el edificio. La tarjeta de la derecha sigue vacía a la espera de su contenido, igual que la grande de los 16,4–20,7 s.
Se hizo `git merge origin/main` en la rama de trabajo para traer la imagen. Render y copia ligera (17 MB) en `renders/`.

### CAPRI v3.2: tres fotos horizontales en la última tarjeta grande
La tarjeta de 16,4–20,7 s (ahora x 560, y 165, 480x810) lleva tres fotos 16:9 apiladas (`public/entrada/capri_int1..3.jpg`: cocina/comedor, piscina, sala con TV), sin recorte, mismo ancho y separación, entrando una tras otra (prop `imagenes` de `TarjetaVacia`). Separación de 40 px con el esquema de la izquierda.
