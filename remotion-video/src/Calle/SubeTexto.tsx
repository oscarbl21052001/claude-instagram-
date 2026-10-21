import { Easing, interpolate, useCurrentFrame } from "remotion";

// El texto pegado al suelo se despega, gira hasta ponerse de frente y sube al cielo, donde queda en 3D (capas apiladas).
// Geometría: las 4 esquinas de la textura en pantalla pasan del suelo (matriz por fotograma) al rectángulo destino,
// interpolando centro, ángulo y radio de cada esquina (giro casi rígido); la matriz final sale de una homografía (DLT).

export type SubeConfig = {
  desde: number; // fotograma en que empieza a despegarse
  hasta: number; // fotograma en que llega al cielo
  destino: { x: number; y: number; w: number; h: number }; // rectángulo de la textura en pantalla (px de 1080x1920)
  capas: number; // capas del volumen
  paso: [number, number]; // desplazamiento en pantalla entre capas (px)
  atraviesa?: { desde: number; hasta: number; centro: [number, number]; escala: number }; // al final la cámara atraviesa el texto (crece y se funde)
};

type P = [number, number];

const proyectar = (m: number[], x: number, y: number): P => {
  const w = m[3] * x + m[7] * y + m[15];
  return [(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w];
};

// Homografía que lleva (0,0),(W,0),(W,H),(0,H) a q[0..3]; devuelve matrix3d.
const homografia = (W: number, H: number, q: P[]): number[] => {
  const s: P[] = [[0, 0], [W, 0], [W, H], [0, H]];
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = s[i];
    const [u, v] = q[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  const h = A.map((r, i) => r[8] / r[i]);
  return [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, 1];
};

const mezcla = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`;

export const SubeTexto: React.FC<{
  sube: SubeConfig;
  matrices: number[][];
  texW: number;
  texH: number;
  lineas: string[];
  fontSize: number;
  frameOffset?: number; // para continuar el texto en la secuencia siguiente
}> = ({ sube, matrices, texW, texH, lineas, fontSize, frameOffset = 0 }) => {
  const frame = useCurrentFrame() + frameOffset;
  if (frame < sube.desde - 1) return null;
  const m = matrices[Math.min(frame, matrices.length - 1)];
  const p = interpolate(frame, [sube.desde, sube.hasta], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.5, 0, 0.2, 1),
  });
  const d = sube.destino;
  const suelo: P[] = [proyectar(m, 0, 0), proyectar(m, texW, 0), proyectar(m, texW, texH), proyectar(m, 0, texH)];
  const cielo: P[] = [[d.x, d.y], [d.x + d.w, d.y], [d.x + d.w, d.y + d.h], [d.x, d.y + d.h]];
  const centro = (q: P[]): P => [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];
  const c0 = centro(suelo);
  const c1 = centro(cielo);
  const arco = Math.sin(Math.PI * p) * 70; // sube con una ligera curva
  const c: P = [c0[0] + (c1[0] - c0[0]) * p, c0[1] + (c1[1] - c0[1]) * p - arco];
  const q = suelo.map((s, i): P => {
    const a0 = Math.atan2(s[1] - c0[1], s[0] - c0[0]);
    let a1 = Math.atan2(cielo[i][1] - c1[1], cielo[i][0] - c1[0]);
    while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
    const r0 = Math.hypot(s[0] - c0[0], s[1] - c0[1]);
    const r1 = Math.hypot(cielo[i][0] - c1[0], cielo[i][1] - c1[1]);
    const a = a0 + (a1 - a0) * p;
    const r = r0 + (r1 - r0) * p;
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  });
  const M = homografia(texW, texH, q);
  const vol = Math.min(1, Math.max(0, (p - 0.35) / 0.65)); // el volumen crece al despegar
  const entra = interpolate(frame, [sube.desde - 1, sube.desde + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const N = sube.capas;
  const capas = Array.from({ length: N + 1 }).map((_, kk) => {
    const i = N - kk; // dibuja primero las de atrás
    const t = i / N;
    const color = i === 0 ? "#FFF8E7" : mezcla([214, 160, 44], [86, 56, 10], Math.pow(t, 0.8));
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: texW,
          height: texH,
          transformOrigin: "0 0",
          transform: `translate(${sube.paso[0] * i * vol}px, ${sube.paso[1] * i * vol}px) matrix3d(${M.join(",")})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Bebas Neue",
          fontSize,
          whiteSpace: "nowrap",
          lineHeight: 0.9,
          letterSpacing: 6,
          color,
          textShadow: i === N ? "0 18px 40px rgba(0,20,40,0.45)" : undefined,
        }}
      >
        {lineas.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
    );
  });
  // la cámara atraviesa el texto: crece alrededor del centro de la vista, se desenfoca y se funde
  const a = sube.atraviesa;
  const k = a ? Math.pow(interpolate(frame, [a.desde, a.hasta], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), 1.8) : 0;
  const escala = 1 + (a ? (a.escala - 1) * k : 0);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: entra * (1 - Math.min(1, Math.max(0, (k - 0.55) / 0.45))),
        transform: a ? `scale(${escala})` : undefined,
        transformOrigin: a ? `${a.centro[0]}px ${a.centro[1]}px` : undefined,
        filter: k > 0.05 ? `blur(${k * 14}px)` : undefined,
      }}
    >
      {capas}
    </div>
  );
};
