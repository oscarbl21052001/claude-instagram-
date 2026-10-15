# Inspiración: `oscarbl21052001/awesome-opus5-5-videos`

Repositorio público de la persona usuaria (fork de `yihui-dev/awesome-opus5-5-videos`, licencia MIT, © 2026 yihui-dev).
Colección de vídeos virales hechos con Claude Opus 5.5, cada uno con el prompt que compartió su creador. **Se usa solo como inspiración de técnicas y patrones de movimiento: nunca se copian composiciones ni textos de otros creadores.**

## Qué hay (medido el 15-10-2026, commit `92aee2f` del 13-10-2026)
- `prompts/<slug>.md`: 703 fichas (autor, categoría, tecnología, enlace al post original y el prompt completo). 207 están marcadas como prompt parcial.
- `data/videos.json`: los mismos 703 registros (`slug, author, author_url, post_url, category, tech_tags, prompt, prompt_partial, poster_url, skillry_url, added, has_remake`).
- `README.md`: galería con 100 vídeos destacados (58 motion, 16 explainers, 14 3D, 12 interactivos), cada uno con miniatura animada.
- Categorías en `videos.json`: motion 369, 3d 117, explainer 116, interactive 101. Técnicas: canvas 267, svg 183, threejs 131, shader 92, gsap 86, css 57, audio 39, particles 17. Prompts que mencionan Remotion: 96. Sobre inmobiliaria: 0; infografías: 1 → sirven las técnicas, no los temas.
- **Las imágenes y los vídeos NO están en el repo**: son enlaces a `media.skillry.dev`. Las miniaturas del README tienen la forma `https://media.skillry.dev/opus-5-5/<slug>/preview.webp` (webp animado de 400x226, unos 35 fotogramas).

## Cómo volver a leerlo en una sesión nueva
1. `add_repo` (owner `oscarbl21052001`, repo `awesome-opus5-5-videos`, access read): al ser público se clona anónimo con `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/oscarbl21052001/awesome-opus5-5-videos /home/user/oscarbl21052001/awesome-opus5-5-videos`.
2. Para ver las miniaturas hay que permitir el dominio `media.skillry.dev` en la política de red del entorno (ajuste del entorno de la sesión, no de GitHub); sin eso da 403. La persona lo permitió el 15-10-2026; puede no seguir activo.
3. Extraer fotogramas con Pillow (`im.seek(k)`) y montar hojas de contactos de 3 fotogramas por vídeo (inicio, mitad, final) para verlos.

## Patrones vistos (solo 30 de las 100 miniaturas destacadas, en 3 fotogramas cada una; no se han visto los vídeos completos)
Referencias (slug → qué muestra) con las que se puede estudiar el patrón leyendo `prompts/<slug>.md`:
- **Tarjetas/paneles de interfaz que entran y se transforman** (fondo claro, sombra suave): `ajith-io-208546`, `gouthamjay8-910269`, `rammanq-034553`, `ratheejaisal-154698`.
- **Titulares grandes por bloques** con palabra clave en otro color o cursiva y subtítulo pequeño: `0xfemyn-137833` ("One key."), `alex-prompter-997524` ("Meet AI Superpowers."), `ratheejaisal-154698`.
- **Cifras que cuentan** con línea de medida o rejilla (fondo oscuro): `heyiammallik-293397`, `nolkeeg-635633`, `0xfemyn-137833` (4.952).
- **Esquema que se construye** (bloques conectados Plan → Build → Verify → Ship): `prasad-pilla-496049`.
- **Mapa con línea que se dibuja** (ruta): `groundcontrol-230877`.
- **Texto cinético** (palabras que se apilan, se contornean, se desenfocan): `prasenx-693512`, `pankajkumar-dev-718609`. Más llamativo: contenerlo para el tono discreto de la persona usuaria.
- **Maquetas de móvil con apps dentro**: `redpersongpt-284430`, `froessell-562325`. Posible uso: enseñar renders o planos.
- **Escena isométrica con texto en portugués**: `felipemoller-936736`.
- Prompts de esos 100 que mencionan Remotion (nombres de archivo que coinciden; no leídos): `0xlangeai-597929`, `0xrapzz-433554`, `aijipusi75693-284735`, `aiwarts-428866`, `aiwarts-815008`.

## Límites y cómo adaptarlo a los Edits de la persona usuaria
- La mayoría de piezas están en 16:9 y con estética tecnológica (neón, planetas, juegos, anime): no encajan tal cual con inmobiliaria ni con la paleta negro/dorado/mostaza `#E2A826`. Se adaptan a 1080x1920, zona segura de Reels y tono profesional discreto (ver `CLAUDE.md`).
- Flujo acordado: proponer 5–8 ideas concretas adaptadas, esperar elección y contenido/textos de la persona usuaria, enseñar un fotograma antes de renderizar. Ideas ya ofrecidas: esquema que se construye con hilo dorado; titular por bloques con palabra clave en mostaza; cifras que cuentan; mapa/ruta que se dibuja; marco de móvil/tablet con renders.
- No hay generación de imágenes/vídeo con créditos (Higgsfield descartado); solo imágenes que aporte la persona usuaria.
