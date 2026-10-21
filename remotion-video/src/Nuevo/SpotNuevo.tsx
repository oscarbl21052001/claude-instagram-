import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, Easing, staticFile, useCurrentFrame } from "remotion";

// Edit nuevo de SPOT 335 ("SPOT 335 VIDEO.mov", 34,13 s, 30 fps). Seis cortes con transición propia, medidos con ffmpeg (fotograma = primer fotograma de la toma nueva):
//   294 edificio → ella · 436 ella → calle · 578 calle → ella sentada · 687 ella → dron · 775 dron → ella · 865 calle → playa
// Cada transición = lado de salida (len fotogramas antes del corte, fuerza 0→1) + lado de entrada (len después, fuerza 1→0).

export const NUEVO_FPS = 30;
export const NUEVO_DURATION = 1024;
const W = 1080;
const H = 1920;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = Easing.out(Easing.cubic);

type Fx = {
  scale: number;
  tx: number;
  ty: number;
  blur: number;
  origin: string;
  trail?: [number, number]; // rastro de movimiento (px, dirección opuesta al avance)
  overlay?: { color: string; o: number };
  bg?: string;
};
type Lado = { len: number; fx: (s: number) => Fx };
type Corte = { c: number; sale: Lado; entra: Lado };

const cortes: Corte[] = [
  {
    // 1. Edificio → ella: empuje a las ventanas encendidas, destello cálido en el corte, vuelve en zoom-out
    c: 294,
    sale: { len: 10, fx: (s) => ({ scale: 1 + 0.5 * s, tx: 0, ty: 0, blur: 18 * s, origin: "48% 62%", overlay: { color: "#ffc77a", o: 0.85 * clamp01((s - 0.6) / 0.4) } }) },
    entra: { len: 12, fx: (s) => ({ scale: 1 + 0.3 * s, tx: 0, ty: 0, blur: 16 * s, origin: "50% 36%", overlay: { color: "#ffc77a", o: 0.6 * clamp01((s - 0.5) / 0.5) } }) },
  },
  {
    // 2. Ella → calle: match cut vertical (empuje a su cara; sale del punto de fuga de la calle)
    c: 436,
    sale: { len: 8, fx: (s) => ({ scale: 1 + 0.35 * s, tx: 0, ty: 0, blur: 8 * s, origin: "50% 30%" }) },
    entra: { len: 10, fx: (s) => ({ scale: 1 + 0.35 * s, tx: 0, ty: 0, blur: 8 * s, origin: "50% 25%" }) },
  },
  {
    // 3. Calle → ella: whip pan horizontal con arrastre de amarillo
    c: 578,
    sale: { len: 8, fx: (s) => ({ scale: 1, tx: -0.95 * W * s, ty: 0, blur: 10 * s, origin: "50% 50%", trail: [150 * s, 0], overlay: { color: "#f0b41e", o: 0.6 * s }, bg: "#c8921a" }) },
    entra: { len: 9, fx: (s) => ({ scale: 1, tx: 0.95 * W * s, ty: 0, blur: 10 * s, origin: "50% 50%", trail: [150 * s, 0], overlay: { color: "#f0b41e", o: 0.6 * s }, bg: "#c8921a" }) },
  },
  {
    // 4. Ella → dron: whip tilt hacia arriba, la voz sigue
    c: 687,
    sale: { len: 7, fx: (s) => ({ scale: 1, tx: 0, ty: -0.9 * H * s, blur: 10 * s, origin: "50% 50%", trail: [0, 200 * s], bg: "#6fb0ea" }) },
    entra: { len: 9, fx: (s) => ({ scale: 1, tx: 0, ty: 0.9 * H * s, blur: 10 * s, origin: "50% 50%", trail: [0, 200 * s], bg: "#6fb0ea" }) },
  },
  {
    // 5. Dron → ella: crash zoom al monumento del sol, entra con el monumento arriba y baja hacia ella
    c: 775,
    sale: { len: 10, fx: (s) => ({ scale: 1 + 2.2 * s, tx: 0, ty: 0, blur: 20 * s, origin: "42% 53%" }) },
    entra: { len: 12, fx: (s) => ({ scale: 1 + 0.6 * s, tx: 0, ty: 0, blur: 14 * s, origin: "50% 8%" }) },
  },
  {
    // 6. Calle → playa: cross-zoom con ella como ancla
    c: 865,
    sale: { len: 10, fx: (s) => ({ scale: 1 + 0.15 * s, tx: 0, ty: 0, blur: 5 * s, origin: "50% 45%" }) },
    entra: { len: 12, fx: (s) => ({ scale: 1 + 0.15 * s, tx: 0, ty: 0, blur: 5 * s, origin: "50% 45%" }) },
  },
];

const NEUTRO: Fx = { scale: 1, tx: 0, ty: 0, blur: 0, origin: "50% 50%" };

const efecto = (f: number): Fx => {
  for (const k of cortes) {
    if (f < k.c && f >= k.c - k.sale.len) return k.sale.fx(Math.pow((f - (k.c - k.sale.len) + 1) / k.sale.len, 2));
    if (f >= k.c && f < k.c + k.entra.len) return k.entra.fx(1 - easeOut((f - k.c) / k.entra.len));
  }
  return NEUTRO;
};

const Clip: React.FC = () => (
  <Video src={staticFile("nuevo/video_1080.mp4")} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
);

export const SpotNuevo: React.FC = () => {
  const f = useCurrentFrame();
  const x = efecto(f);
  const activo = x !== NEUTRO;
  const copias = x.blur > 0.5 ? [1, 2, 3, 4] : [];
  const tr = x.trail ?? [0, 0];
  const capa = (k: number): React.CSSProperties => {
    const kk = k / 4;
    return {
      transform: `translate(${x.tx + tr[0] * kk}px, ${x.ty + tr[1] * kk}px) scale(${x.scale * (tr[0] || tr[1] ? 1 : 1 + k * 0.035 * (x.blur / 16))})`,
      transformOrigin: x.origin,
    };
  };
  return (
    <AbsoluteFill style={{ background: x.bg ?? "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ ...(activo ? capa(0) : {}), filter: x.blur > 0.3 ? `blur(${x.blur}px)` : undefined }}>
        <Clip />
      </AbsoluteFill>
      {copias.map((k) => (
        <AbsoluteFill key={k} style={{ ...capa(k), filter: `blur(${x.blur * 1.2}px)`, opacity: 0.22 }}>
          <Clip />
        </AbsoluteFill>
      ))}
      {x.overlay && x.overlay.o > 0.01 && <AbsoluteFill style={{ background: x.overlay.color, opacity: x.overlay.o }} />}
      <Audio src={staticFile("nuevo/voz.m4a")} />
      <Audio src={staticFile("nuevo/sfx.m4a")} />
    </AbsoluteFill>
  );
};
