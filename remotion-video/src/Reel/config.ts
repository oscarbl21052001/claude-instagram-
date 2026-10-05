// Ajustes editables de la pieza. Todo está en fotogramas a 30 fps.
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION = 232; // 7,73 s del video de origen

// Fases del fondo
export const T = {
  // 0 → 60: fondo real del video
  toMatrixStart: 60, // empieza la transición a Matrix
  toMatrixEnd: 92,
  // 92 → 140: Matrix
  toBeachStart: 140, // empieza la transición a la playa
  toBeachEnd: 172,
  // 172 → fin: playa
};

// Posición vertical del centro de los subtítulos (0 = arriba, 1 = abajo)
export const CAPTION_CENTER_Y = 0.265;
export const CAPTION_MAX_FONT = 190;
export const CAPTION_EXIT_FRAMES = 12;

export type Chunk = { words: string[]; start: number; end: number };

// Palabras agrupadas según la transcripción (tiempos en segundos).
export const CHUNKS: Chunk[] = [
  { words: ["TENGO", "CLIENTES"], start: 0.0, end: 1.45 },
  { words: ["QUE HAN", "COMPRADO"], start: 1.5, end: 2.1 },
  { words: ["PROPIEDADES"], start: 2.14, end: 2.76 },
  { words: ["EN EL", "EXTRANJERO"], start: 2.8, end: 3.7 },
  { words: ["Y NI", "SIQUIERA"], start: 3.74, end: 4.5 },
  { words: ["HAN IDO A", "VISITAR"], start: 4.54, end: 5.38 },
  { words: ["EL PAÍS"], start: 5.42, end: 6.24 },
  { words: ["TE CUENTO", "CÓMO"], start: 6.28, end: 7.7 },
];
