import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, Easing, Freeze, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useBebas } from "../Playa/Video41Playa";

// Edit nuevo de SPOT 335 ("SPOT 335 VIDEO.mov", 34,13 s, 30 fps). Seis cortes con transición propia, medidos con ffmpeg (fotograma = primer fotograma de la toma nueva):
//   294 edificio → ella · 436 ella → calle · 578 calle → ella sentada · 687 ella → dron · 775 dron → ella · 865 calle → playa
// Cada transición = lado de salida (len fotogramas antes del corte, fuerza 0→1) + lado de entrada (len después, fuerza 1→0).

export const NUEVO_FPS = 30;
// El edificio (fotogramas 223–293) se alarga HOLD fotogramas: se mantiene el último fotograma con un empuje lento y la voz hace la pausa natural que ya tenía en 9,70–9,80 s.
const HOLD = 0; // 0 = sin alargar (la versión con 24 sonaba mal: se cortaba la voz)
const C_EDIF = 294;
export const NUEVO_DURATION = 1024 + HOLD;
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
    c: 294 + HOLD,
    sale: { len: 10, fx: (s) => ({ scale: 1 + 0.5 * s, tx: 0, ty: 0, blur: 18 * s, origin: "48% 62%", overlay: { color: "#ffc77a", o: 0.85 * clamp01((s - 0.6) / 0.4) } }) },
    entra: { len: 12, fx: (s) => ({ scale: 1 + 0.3 * s, tx: 0, ty: 0, blur: 16 * s, origin: "50% 36%", overlay: { color: "#ffc77a", o: 0.6 * clamp01((s - 0.5) / 0.5) } }) },
  },
  {
    // 2. Ella → calle: match cut vertical (empuje a su cara; sale del punto de fuga de la calle)
    c: 436 + HOLD,
    sale: { len: 8, fx: (s) => ({ scale: 1 + 0.35 * s, tx: 0, ty: 0, blur: 8 * s, origin: "50% 30%" }) },
    entra: { len: 10, fx: (s) => ({ scale: 1 + 0.35 * s, tx: 0, ty: 0, blur: 8 * s, origin: "50% 25%" }) },
  },
  // 4. Ella → dron (687): corte limpio, sin transición ni whoosh; la voz sigue
  {
    // 5. Dron → ella: crash zoom al monumento del sol, entra con el monumento arriba y baja hacia ella
    c: 775 + HOLD,
    sale: { len: 10, fx: (s) => ({ scale: 1 + 2.2 * s, tx: 0, ty: 0, blur: 20 * s, origin: "42% 53%" }) },
    entra: { len: 12, fx: (s) => ({ scale: 1 + 0.6 * s, tx: 0, ty: 0, blur: 14 * s, origin: "50% 8%" }) },
  },
  {
    // 6. Calle → playa: cross-zoom con ella como ancla
    c: 865 + HOLD,
    sale: { len: 10, fx: (s) => ({ scale: 1 + 0.15 * s, tx: 0, ty: 0, blur: 5 * s, origin: "50% 45%" }) },
    entra: { len: 12, fx: (s) => ({ scale: 1 + 0.15 * s, tx: 0, ty: 0, blur: 5 * s, origin: "50% 45%" }) },
  },
];

const NEUTRO: Fx = { scale: 1, tx: 0, ty: 0, blur: 0, origin: "50% 50%" };

// 3. Calle → ella sentada: las letras "350 METROS DEL MAR" se abren y ella aparece a través de ellas (entrada = LETRAS_LEN fotogramas).
// 4. Ella → dron: iris circular que se abre desde su cara y revela el dron (entrada = IRIS_LEN fotogramas); ella queda congelada durante el iris.
const C_LETRAS = 578 + HOLD;
const LETRAS_LEN = 16;
const C_IRIS = 687 + HOLD;
const IRIS_LEN = 14;
const easeIO = Easing.inOut(Easing.cubic);
const enLetras = (f: number) => f >= C_LETRAS && f < C_LETRAS + LETRAS_LEN;
const enIris = (_f: number) => false; // el iris se sustituyó por un blur normal (ver cortes)

const efecto = (f: number): Fx => {
  // anticipación: ligero empuje a las letras / a su cara justo antes del corte
  if (f >= C_LETRAS - 8 && f < C_LETRAS) return { scale: 1 + 0.08 * Math.pow((f - (C_LETRAS - 8) + 1) / 8, 2), tx: 0, ty: 0, blur: 0, origin: "50% 31%" };
  for (const k of cortes) {
    if (f < k.c && f >= k.c - k.sale.len) return k.sale.fx(Math.pow((f - (k.c - k.sale.len) + 1) / k.sale.len, 2));
    if (f >= k.c && f < k.c + k.entra.len) return k.entra.fx(1 - easeOut((f - k.c) / k.entra.len));
  }
  return NEUTRO;
};

const SRC = "nuevo/video_1080.mp4";
const Pleno: React.FC<{ desde: number }> = ({ desde }) => (
  <Video src={staticFile(SRC)} trimBefore={desde} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
);
const Alarga: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + 0.035 * (f / HOLD)})`, transformOrigin: "50% 62%" }}>
      <Freeze frame={0}>
        <Pleno desde={C_EDIF - 1} />
      </Freeze>
    </AbsoluteFill>
  );
};
const Clip: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={C_EDIF} layout="none">
      <Pleno desde={0} />
    </Sequence>
    {HOLD > 0 && (
      <Sequence from={C_EDIF} durationInFrames={HOLD} layout="none">
        <Alarga />
      </Sequence>
    )}
    <Sequence from={C_EDIF + HOLD} layout="none">
      <Pleno desde={C_EDIF} />
    </Sequence>
  </AbsoluteFill>
);

// ---- 3. letras que se abren ----
// x inicial, ancho y línea base medidos en el fotograma 577; textLength fuerza el ancho exacto de las letras de la calle
const LINEAS = [{ t: "350 METROS", x: 130, w: 830, y: 585 }, { t: "DEL MAR", x: 262, w: 568, y: 765 }];
const OX = 462; // punto dentro del trazo de la "M": la ampliación termina llenando la pantalla
const OY = 505;
const LetrasAbren: React.FC<{ v: number }> = ({ v }) => {
  const k = Math.exp(Math.log(34) * easeIO(v));
  const calleOp = 1 - clamp01((v - 0.4) / 0.3);
  const mt = `translate(${OX}px, ${OY}px) scale(${k}) translate(${-OX}px, ${-OY}px)`;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ opacity: calleOp, transform: `scale(${k})`, transformOrigin: `${OX}px ${OY}px` }}>
        <Freeze frame={0}>
          <Pleno desde={C_LETRAS - HOLD - 1} />
        </Freeze>
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: clamp01((v - 0.55) / 0.3) }}>
        <Pleno desde={C_LETRAS - HOLD} />
      </AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <mask id="letrasMask" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <g style={{ transform: mt }}>
              {LINEAS.map((l) => (
                <text key={l.t} x={l.x} y={l.y} textLength={l.w} lengthAdjust="spacingAndGlyphs" fontFamily="Bebas Neue" fontSize={228} fill="#fff" stroke="#fff" strokeWidth={4}>
                  {l.t}
                </text>
              ))}
            </g>
          </mask>
        </defs>
        <foreignObject x={0} y={0} width={W} height={H} mask="url(#letrasMask)">
          <div style={{ width: W, height: H, position: "relative" }}>
            <Pleno desde={C_LETRAS - HOLD} />
          </div>
        </foreignObject>
      </svg>
    </AbsoluteFill>
  );
};

// ---- 4. iris ----
const IrisAbre: React.FC<{ v: number }> = ({ v }) => {
  const r = 1500 * easeIO(v);
  const cx = 0.5 * W;
  const cy = 0.31 * H;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${1.05 + 0.04 * v})`, transformOrigin: "50% 31%", filter: `blur(${3 * v}px)` }}>
        <Freeze frame={0}>
          <Pleno desde={C_IRIS - HOLD - 1} />
        </Freeze>
      </AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `circle(${r}px at ${cx}px ${cy}px)` }}>
        <Pleno desde={C_IRIS - HOLD} />
      </AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#fff" strokeWidth={5} opacity={0.75 * (1 - clamp01((v - 0.6) / 0.4))} />
      </svg>
    </AbsoluteFill>
  );
};

export const SpotNuevo: React.FC = () => {
  useBebas();
  const f = useCurrentFrame();
  const x = efecto(f);
  const especial = enLetras(f) ? (
    <Sequence from={C_LETRAS} layout="none">
      <LetrasAbren v={(f - C_LETRAS) / LETRAS_LEN} />
    </Sequence>
  ) : enIris(f) ? (
    <Sequence from={C_IRIS} layout="none">
      <IrisAbre v={(f - C_IRIS) / IRIS_LEN} />
    </Sequence>
  ) : null;
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
      {especial ?? (
        <>
      <AbsoluteFill style={{ ...(activo ? capa(0) : {}), filter: x.blur > 0.3 ? `blur(${x.blur}px)` : undefined }}>
        <Clip />
      </AbsoluteFill>
      {copias.map((k) => (
        <AbsoluteFill key={k} style={{ ...capa(k), filter: `blur(${x.blur * 1.2}px)`, opacity: 0.22 }}>
          <Clip />
        </AbsoluteFill>
      ))}
      {x.overlay && x.overlay.o > 0.01 && <AbsoluteFill style={{ background: x.overlay.color, opacity: x.overlay.o }} />}
        </>
      )}
      {HOLD > 0 ? (
        <>
          <Sequence from={0} durationInFrames={C_EDIF - 1} layout="none">
            <Audio src={staticFile("nuevo/voz.m4a")} volume={(f) => Math.min(1, (C_EDIF - 2 - f) / 2 + 0.0001)} />
          </Sequence>
          <Sequence from={C_EDIF - 1 + HOLD} layout="none">
            <Audio src={staticFile("nuevo/voz.m4a")} trimBefore={C_EDIF - 1} volume={(f) => Math.min(1, f / 2)} />
          </Sequence>
        </>
      ) : (
        <Audio src={staticFile("nuevo/voz.m4a")} />
      )}
      <Audio src={staticFile("nuevo/sfx.m4a")} />
    </AbsoluteFill>
  );
};
