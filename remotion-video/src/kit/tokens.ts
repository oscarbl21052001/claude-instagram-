// Tokens de diseño para video vertical (1080x1920).
// Valores tomados de las tablas del repo ui-ux-pro-max-skill (MIT, Next Level Builder):
//   - estilo "Modern Dark (Cinema Mobile)": fondos, superficies, bordes, easing y resorte
//   - paletas "AI/Chatbot Platform" (violeta) y "Short Video Editor" (rosa), "Podcast" (naranja)
//   - emparejamientos tipográficos "Bold Statement", "Modern Dark Cinema (Inter)" y "Tech Startup"
// Los valores en píxeles de la web (base 390 px) se escalan a 1080 px de ancho.

export const UI_SCALE = 1080 / 390; // ≈ 2,77

export const colors = {
  bgDeep: "#020203",
  bgBase: "#050506",
  bgElevated: "#0a0a0c",
  surface: "rgba(255,255,255,0.05)",
  surfaceStrong: "rgba(255,255,255,0.09)",
  border: "rgba(255,255,255,0.08)",
  fg: "#EDEDEF",
  muted: "#8A8F98",
  accent: "#7C3AED", // violeta (AI/Chatbot)
  accentSoft: "#A78BFA",
  accentIndigo: "#5E6AD2", // acento del estilo Cinema
  highlight: "#F97316", // naranja (Podcast) para palabras clave y etiquetas
  pink: "#EC4899", // Short Video Editor
} as const;

export const fonts = {
  display: "Bebas Neue", // títulos condensados (Bold Statement)
  heading: "Space Grotesk", // alternativa para titulares (Tech Startup)
  body: "Inter", // texto y subtítulos (Modern Dark Cinema)
} as const;

export const radius = Math.round(16 * UI_SCALE); // 44 px
export const radiusSmall = Math.round(8 * UI_SCALE);

// Zonas seguras aproximadas para Reels (la interfaz de Instagram tapa arriba y abajo).
export const safe = { top: 250, bottom: 360, side: 64 } as const;

// Movimiento: curva y resorte del estilo Cinema.
export const motion = {
  expoOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
  spring: { damping: 20, stiffness: 90, mass: 1 },
} as const;
