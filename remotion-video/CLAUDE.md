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
3. Copia de trabajo 1080x1920 a 30 fps en H.264 (los móviles graban HEVC 4K con rotación):
   Recorte del sujeto por fotograma con MODNet (`Xenova/modnet`, `onnx/model.onnx`, entrada 480x864,
   suavizado temporal, exportar RGBA .webp a 1080x1920). El script que lo hacía se retiró del repo pero está
   en el historial: `git show 744b5dc:remotion-video/tools/make_subject.py`.
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

## Recorrido 3D de un apartamento (Blender sin interfaz + Remotion)
Composición `TourApto` (`src/Tour/`), video de fondo `public/tour/walk.mp4`, scripts en `tools/apto/`
(contienen rutas absolutas de la sesión: ajustar antes de reutilizarlos).
- **Blender sin interfaz:** `pip install bpy==4.5.14` (Python 3.11). **EEVEE no funciona sin GPU**: usar Cycles en CPU
  (~30 s por fotograma a 576x1024, 16 muestras + denoise OpenImageDenoise, 4 núcleos).
- **Del plano al modelo:** los planos del catálogo son imágenes, no vectores. Se detectaron los muros negros
  (líneas largas y finas) y se revisaron a mano; escala calibrada con las superficies indicadas (~56,5 px/m).
  Comprobar siempre con una vista cenital superpuesta al plano. Si hay DWG/DXF/PDF vectorial, usarlo.
- **Recorrido:** 12 fps renderizados + intermedios reales donde la cámara gira rápido (>3°/fotograma); en el resto,
  mezcla de dos vecinos. `ffmpeg minterpolate` deforma la imagen en los giros: no usarlo. Revisar fotogramas negros
  con `signalstats` (YAVG<25).
- **Errores de ruta ya cometidos:** cámara dentro de un mueble alto (todo negro) y pegada a un poste del marco de
  vidrio (cuña negra). Mantener la cámara a >0,7 m de postes/muebles altos y fuera de volúmenes.
- Los renders de Cycles salen sobreexpuestos con luz cálida: usar AgX y revisar exposición.
- Textos del video en español; el catálogo origen está en portugués. Incluir aviso "recreación 3D ilustrativa".
