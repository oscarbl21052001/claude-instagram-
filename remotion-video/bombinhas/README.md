# Bombinhas (vídeo vertical 9:16)

Edit de la visita a Bombinhas: hook de plano, pantalla dividida (plano 1/3, vídeo 2/3), tarjetas numeradas y cierre.

- Composición: `Bombinhas` (1080x1920, 30 fps, 828 fotogramas = 27,6 s). Sin audio.
- Los clips NO están en el repo. Hay que dejar en `public/` copias H.264 de 1080p estabilizadas con estos nombres: `IMG_0361.mp4`, `IMG_0362t.mp4`, `IMG_0364.mp4`, `IMG_0365.mp4`, `IMG_0368.mp4`, `IMG_0374.mp4` (ver `CLIPS` en `src/theme.ts`).
- `src/Mascot.tsx` es una prueba de muñeco animado que ya no se usa en la composición final.
- Render: `npm install && npx remotion render src/index.ts Bombinhas out/bombinhas.mp4 --codec h264 --crf 17`
