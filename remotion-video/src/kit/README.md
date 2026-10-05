# Kit de diseño para video vertical

Componentes de Remotion con un estilo oscuro tipo "cinema" (fondo con luces ambientales, tarjetas de
cristal, resortes suaves). Los valores de diseño salen de las tablas del repo
[ui-ux-pro-max-skill](https://github.com/oscarbl21052001/ui-ux-pro-max-skill) (licencia MIT, Next Level Builder):
estilo "Modern Dark (Cinema Mobile)", paletas "AI/Chatbot Platform", "Short Video Editor" y "Podcast",
y emparejamientos tipográficos (Bebas Neue, Space Grotesk, Inter). Ver `tokens.ts`.

| Pieza | Para qué |
|---|---|
| `Background` | Fondo con degradado, luces que oscilan, viñeta y grano |
| `GlassCard` | Tarjeta de cristal que entra con resorte (escala, desplazamiento, desenfoque) |
| `Tag` | Etiqueta tipo píldora |
| `Headline` | Titular por líneas con máscara de revelado |
| `TypeWriter` | Barra de búsqueda con texto que se escribe |
| `WordCaptions` | Subtítulos por grupos con palabra activa y palabras clave resaltadas |
| `Icon` | Iconos de línea (gráfico, diana, capas, chispa, check, lupa) |

La composición `KitDemo` los muestra con texto de ejemplo. `safe` en `tokens.ts` marca las zonas seguras
aproximadas de un Reel (arriba y abajo tapa la interfaz de Instagram).
