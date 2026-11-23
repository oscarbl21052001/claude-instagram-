import { Easing } from "remotion";

export const theme = {
  colors: {
    bg: "#1A120B",
    hero: "#E8A33D", // única pieza dorada por fotograma
    text: "#F4E9DA",
    textDim: "rgba(244,233,218,0.72)",
    glass: "rgba(26,18,11,0.55)",
    glow: "rgba(232,163,61,0.4)",
  },
  fonts: { display: "Josefin Sans, Inter, sans-serif", serif: "Cinzel, serif" },
  blueprint: { bg: "#0D2137", grid: "#2A5F8F", line: "#F4E9DA" },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    bouncy: { damping: 11, stiffness: 170, mass: 0.7 },
  },
} as const;

export const HOOK_FRAMES = 100; // duración del diseño animado de apertura
export const VIDEO_START = 88; // la primera toma entra mientras el plano se disuelve

// Plano de montaje: [archivo, inicio en s, duración en s]
export const CLIPS: [string, number, number][] = [
  ["IMG_0361.mp4", 4.4, 2.4], // 0 jacuzzi (tras el hook)
  ["IMG_0365.mp4", 5.4, 2.4], // 1 área social
  ["IMG_0364.mp4", 16.0, 2.4], // 2 clientes mirando
  ["IMG_0368.mp4", 5.0, 2.5], // 3 billar: el golpe
  ["IMG_0362t.mp4", 0.0, 2.4], // 4 piscina (estabilizada)
  ["IMG_0374.mp4", 1.0, 2.4], // 5 apartamento piloto: cocina
  ["IMG_0374.mp4", 33.4, 2.4], // 6 clientes en el apartamento
  ["IMG_0364.mp4", 23.6, 2.4], // 7 pared de TV
  ["IMG_0364.mp4", 8.0, 5.37], // 8 cierre con clientes
];
