import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { CLIPS, HOOK_FRAMES, VIDEO_START } from "./theme";

type P = [number, number];
const SKIN = "#EDB98E", SHIRT = "#7A4A2E", PANTS = "#8FB4D9", SHOE = "#D9B382", INK = "#2A1A0E", HAIR = "#8A5A35", BAG = "#C98A4B";
const clampv = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// IK de 2 segmentos: devuelve el codo/rodilla
const ik = (root: P, target: P, l1: number, l2: number, bend: number): { mid: P; end: P } => {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  const d = clampv(Math.hypot(dx, dy), 0.01, l1 + l2 - 0.5);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / Math.hypot(dx, dy || 0.0001), uy = dy / Math.hypot(dx, dy || 0.0001);
  const mid: P = [root[0] + ux * a - uy * h * bend, root[1] + uy * a + ux * h * bend];
  const end: P = [root[0] + ux * d, root[1] + uy * d];
  return { mid, end };
};

const Limb: React.FC<{ root: P; target: P; l1: number; l2: number; bend: number; w: number; color: string; endR?: number; endColor?: string }> =
  ({ root, target, l1, l2, bend, w, color, endR = 0, endColor }) => {
    const { mid, end } = ik(root, target, l1, l2, bend);
    return (
      <g>
        <polyline points={`${root[0]},${root[1]} ${mid[0]},${mid[1]} ${end[0]},${end[1]}`} fill="none" stroke={INK} strokeWidth={w + 5} strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={`${root[0]},${root[1]} ${mid[0]},${mid[1]} ${end[0]},${end[1]}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
        {endR > 0 && <circle cx={end[0]} cy={end[1]} r={endR} fill={endColor ?? color} stroke={INK} strokeWidth={2.5} />}
      </g>
    );
  };

type Kind = "walk" | "jacuzzi" | "social" | "clients" | "billar" | "piscina" | "piloto" | "point" | "tv" | "end";
// side: "L" tarjeta izquierda, "R" tarjeta derecha, "E" cierre, null = sin tarjeta (no aparece)
const SCENES: { kind: Kind; x: number; side: "L" | "R" | "E" | null }[] = [
  { kind: "jacuzzi", x: 210, side: "L" }, { kind: "social", x: 230, side: "L" }, { kind: "clients", x: 190, side: null },
  { kind: "billar", x: 230, side: "L" }, { kind: "piscina", x: 210, side: "L" }, { kind: "piloto", x: 860, side: "R" },
  { kind: "point", x: 190, side: null }, { kind: "tv", x: 700, side: null }, { kind: "end", x: 540, side: "E" },
];

export const Mascot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // inicios de escena
  const starts: number[] = []; let t = VIDEO_START;
  CLIPS.forEach(([, , dd]) => { starts.push(t); t += Math.round(dd * fps); });
  let idx = -1;
  for (let i = 0; i < starts.length; i++) if (frame >= starts[i]) idx = i;
  const kind: Kind = idx < 0 ? "walk" : SCENES[idx].kind;
  const sceneStart = idx < 0 ? 0 : starts[idx];
  const lt = (frame - sceneStart) / fps;
  const time = frame / fps;

  const sc = idx < 0 ? null : SCENES[idx];
  const side = sc ? sc.side : null;
  const lf = frame - sceneStart;
  const dur = idx < 0 ? 0 : Math.round(CLIPS[idx][2] * fps);
  const p = spring({ frame: lf - 4, fps, config: { damping: 18, stiffness: 100, mass: 1 } });
  const ex = interpolate(lf, [dur - 10, dur - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let X = 190, Y = 1862, vis = 1;
  const S = 1.5;
  let sit = false;
  if (idx < 0) {
    X = interpolate(frame, [0, HOOK_FRAMES], [170, 640], { extrapolateRight: "clamp" });
    vis = interpolate(frame, [78, 88], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  } else if (side === "L") {
    X = sc!.x + interpolate(p, [0, 1], [-90, 0]) - ex * 60; Y = 300; vis = p * (1 - ex); sit = true;
  } else if (side === "R") {
    X = sc!.x + interpolate(p, [0, 1], [110, 0]) + ex * 60; Y = 300; vis = p * (1 - ex); sit = true;
  } else if (side === "E") {
    const u = spring({ frame: lf - 6, fps, config: { damping: 16, stiffness: 90 } });
    X = 540; Y = 1862; vis = u * (1 - ex); sit = false;
  } else { vis = 0; }
  const hopArc = 0;
  const tubScene = kind === "jacuzzi" || kind === "piscina";
  if (tubScene) sit = false;

  const w = (f: number, ph = 0) => Math.sin(time * Math.PI * 2 * f + ph);
  const bob = w(1.7) * 3;
  let body = bob;           // desplazamiento vertical del cuerpo
  let lean = w(0.8) * 2;    // inclinación en grados
  const hip: P = [0, -80 + body], sh: P = [0, -135 + body];
  const shL: P = [-24, sh[1]], shR: P = [24, sh[1]];
  let handL: P = [-34, -92 + body + w(1.3) * 4], handR: P = [34, -92 + body + w(1.3, 1) * 4];
  let footL: P = [-14, 0 + Math.max(0, w(0.9)) * -6], footR: P = [14, 0 + Math.max(0, -w(0.9)) * -6];
  let hat = false, front: React.ReactNode = null, back: React.ReactNode = null, mouth: "smile" | "o" | "big" = "smile";
  let hide: "none" | "legs" = "none";
  let headTilt = w(1.1) * 3;

  if (kind === "walk") {
    const s = Math.sin(time * Math.PI * 2 * 2.2), c = Math.cos(time * Math.PI * 2 * 2.2);
    footL = [-10 + s * 24, -Math.max(0, c) * 12]; footR = [10 - s * 24, -Math.max(0, -c) * 12];
    handL = [-20 - s * 18, -100 + body + Math.abs(s) * -4]; handR = [26 + s * 14, -108 + body];
    body = bob * 1.6; hat = true; lean = 4;
    front = <g transform={`translate(${handR[0]} ${handR[1] - 4}) rotate(${-20 + s * 6})`}><rect x={-6} y={-30} width={12} height={46} rx={6} fill="#F4E9DA" stroke={INK} strokeWidth={2.5} /><line x1={-6} y1={-18} x2={6} y2={-18} stroke="#2A5F8F" strokeWidth={2} /><line x1={-6} y1={-6} x2={6} y2={-6} stroke="#2A5F8F" strokeWidth={2} /></g>;
  } else if (kind === "jacuzzi") {
    hide = "legs"; handL = [-52 + w(2.4) * 8, -170 + body + w(2.4) * 14]; handR = [52 + w(2.4, 2) * 8, -168 + body + w(2.4, 2) * 14];
    mouth = "big"; body = bob * 1.4;
    front = (
      <g>
        <rect x={-72} y={-78} width={144} height={80} rx={26} fill="#4FB3D9" stroke={INK} strokeWidth={4} />
        <rect x={-72} y={-78} width={144} height={16} rx={8} fill="#BDEBFA" stroke={INK} strokeWidth={3} />
        {[0, 1, 2, 3, 4].map((i) => { const p = ((time * 0.9 + i * 0.21) % 1); return <circle key={i} cx={-50 + i * 25 + Math.sin(time * 4 + i) * 4} cy={-62 - p * 70} r={4 + (i % 2) * 2} fill="#EAFBFF" stroke={INK} strokeWidth={1.5} opacity={1 - p} />; })}
      </g>
    );
  } else if (kind === "social") {
    const k = (Math.sin(time * Math.PI * 2 * 0.55) + 1) / 2; // 0 abajo,1 boca
    const kk = clampv((k - 0.25) / 0.5, 0, 1);
    handR = [30 - kk * 12, -105 - kk * 62 + body]; handL = [-30, -90 + body]; mouth = kk > 0.7 ? "o" : "smile";
    footL = [-14, -Math.max(0, w(1.1)) * 8]; footR = [14, -Math.max(0, -w(1.1)) * 8];
    front = <g transform={`translate(${handR[0]} ${handR[1] - 8}) rotate(${-kk * 25})`}><path d="M-11 -22 L11 -22 L5 8 L-5 8 Z" fill="#FFD0A0" stroke={INK} strokeWidth={2.5} /><path d="M-9 -12 L9 -12 L5 8 L-5 8 Z" fill="#F0642E" /><line x1={4} y1={-30} x2={0} y2={-6} stroke="#fff" strokeWidth={2.5} /><circle cx={12} cy={-24} r={5} fill="#7BC043" stroke={INK} strokeWidth={2} /></g>;
  } else if (kind === "clients") {
    const j = Math.abs(Math.sin(time * Math.PI * 2 * 1.2));
    body = bob - j * 14; handR = [38, -176 + body - j * 6]; handL = [-40 + w(3) * 8, -150 + body + w(3) * 14];
    footL = [-14, -j * 14]; footR = [14, -j * 14]; mouth = "big";
    front = <g transform={`translate(${handR[0]} ${handR[1] - 8})`}><rect x={-7} y={-8} width={14} height={14} rx={3} fill={SKIN} stroke={INK} strokeWidth={2.5} /><rect x={-4} y={-22} width={8} height={16} rx={4} fill={SKIN} stroke={INK} strokeWidth={2.5} /></g>;
    back = <g>{[0, 1, 2].map((i) => { const p = ((time * 0.7 + i * 0.33) % 1); return <text key={i} x={30 + i * 18 + Math.sin(time * 5 + i) * 6} y={-190 - p * 90} fontSize={22} opacity={1 - p} fill="#E8443A" textAnchor="middle">♥</text>; })}</g>;
  } else if (kind === "billar") {
    const th = (Math.sin(time * Math.PI * 2 * 0.9) + 1) / 2; // empuje
    lean = 10; handL = [20 + th * 14, -104 + body]; handR = [-2 - th * 6, -92 + body];
    footL = [-16, 0]; footR = [18, 0]; mouth = "smile";
    const tipX = 70 + th * 18;
    front = <g>
      <line x1={-40 - th * 8} y1={-86 + body} x2={tipX} y2={-110 + body} stroke="#D9A066" strokeWidth={5} strokeLinecap="round" /><line x1={-40 - th * 8} y1={-86 + body} x2={-20} y2={-92 + body} stroke={INK} strokeWidth={7} strokeLinecap="round" />
      <circle cx={tipX + 26 + th * 40} cy={-108 + body * 0.2} r={9} fill="#F4E9DA" stroke={INK} strokeWidth={2.5} />
      <circle cx={tipX + 70 + th * 20} cy={-108} r={9} fill="#E8443A" stroke={INK} strokeWidth={2.5} /></g>;
  } else if (kind === "piscina") {
    hide = "legs"; const ph = time * Math.PI * 2 * 1.1;
    handL = [-30 + Math.cos(ph) * 40, -140 + body + Math.sin(ph) * 34]; handR = [30 + Math.cos(ph + Math.PI) * 40, -140 + body + Math.sin(ph + Math.PI) * 34];
    body = bob * 1.5; mouth = "big";
    front = <g>
      <ellipse cx={0} cy={-66} rx={46} ry={14} fill="none" stroke={INK} strokeWidth={22} /><ellipse cx={0} cy={-66} rx={46} ry={14} fill="none" stroke="#F4E9DA" strokeWidth={16} strokeDasharray="22 22" /><ellipse cx={0} cy={-66} rx={46} ry={14} fill="none" stroke="#E8443A" strokeWidth={16} strokeDasharray="22 22" strokeDashoffset={22} />
      <rect x={-96} y={-54} width={192} height={60} rx={20} fill="#3FA9E0" stroke={INK} strokeWidth={4} />
      <path d={`M-90 -46 q15 -8 30 0 t30 0 t30 0 t30 0 t30 0 t30 0`} transform={`translate(${Math.sin(time * 3) * 6} 0)`} fill="none" stroke="#BDEBFA" strokeWidth={4} /></g>;
  } else if (kind === "piloto") {
    const j = Math.abs(Math.sin(time * Math.PI * 2 * 1.5));
    body = bob - j * 10; handR = [36 + w(3) * 4, -170 + body]; handL = [-32, -92 + body]; footL = [-14, -j * 10]; footR = [14, -j * 10]; mouth = "big";
    front = <g transform={`translate(${handR[0]} ${handR[1] - 12}) rotate(${w(3) * 12})`}><circle cx={0} cy={-8} r={9} fill="#F2C94C" stroke={INK} strokeWidth={2.5} /><circle cx={0} cy={-8} r={3.5} fill="#1A120B" /><rect x={-3} y={0} width={6} height={26} fill="#F2C94C" stroke={INK} strokeWidth={2.5} /><rect x={3} y={14} width={8} height={5} fill="#F2C94C" stroke={INK} strokeWidth={2} /><rect x={3} y={22} width={6} height={4} fill="#F2C94C" stroke={INK} strokeWidth={2} /></g>;
    back = <g>{[0, 1, 2].map((i) => <text key={i} x={30 + Math.cos(i * 2.1) * 34} y={-205 + Math.sin(i * 2.1) * 14} fontSize={20} fill="#F2C94C" opacity={0.5 + 0.5 * Math.sin(time * 8 + i * 2)} textAnchor="middle">✦</text>)}</g>;
  } else if (kind === "point") {
    const sw = w(0.9);
    handL = [-30, -104 + body]; handR = [52 + sw * 14, -150 + body - sw * 26]; lean = 6 + sw * 2;
    footL = [-16, -Math.max(0, w(1.2)) * 6]; footR = [14, -Math.max(0, -w(1.2)) * 6];
    front = <g transform={`translate(${handL[0] - 6} ${handL[1] - 12}) rotate(-8)`}><rect x={-16} y={-26} width={30} height={40} rx={4} fill="#F4E9DA" stroke={INK} strokeWidth={2.5} /><rect x={-6} y={-30} width={10} height={8} rx={2} fill="#8A8F98" stroke={INK} strokeWidth={2} />{[0, 1, 2].map((i) => <line key={i} x1={-10} y1={-14 + i * 10} x2={8} y2={-14 + i * 10} stroke="#2A5F8F" strokeWidth={2} />)}</g>;
  } else if (kind === "tv") {
    const k = (Math.sin(time * Math.PI * 2 * 0.8) + 1) / 2; const kk = clampv((k - 0.3) / 0.4, 0, 1);
    handL = [-34, -100 + body]; handR = [28 - kk * 10, -100 - kk * 62 + body]; mouth = kk > 0.7 ? "o" : "smile";
    footL = [-14, -Math.max(0, w(1.0)) * 5]; footR = [14, -Math.max(0, -w(1.0)) * 5];
    front = <g>
      <g transform={`translate(${handL[0] - 4} ${handL[1] - 4})`}><path d="M-14 -22 L14 -22 L10 16 L-10 16 Z" fill="#fff" stroke={INK} strokeWidth={2.5} /><path d="M-14 -22 L-5 -22 L-3 16 L-10 16 Z" fill="#E8443A" /><path d="M5 -22 L14 -22 L10 16 L3 16 Z" fill="#E8443A" />{[-9, 0, 9].map((x, i) => <circle key={i} cx={x} cy={-26} r={6} fill="#FFF3C4" stroke={INK} strokeWidth={2} />)}</g>
      <circle cx={handR[0] - 2} cy={handR[1] - 8} r={6} fill="#FFF3C4" stroke={INK} strokeWidth={2} /></g>;
  } else if (kind === "end") {
    const j = Math.abs(Math.sin(time * Math.PI * 2 * 1.1));
    body = bob - j * 40; handL = [-50, -190 + body + w(3) * 6]; handR = [50, -190 + body + w(3, 1) * 6]; footL = [-18 - j * 4, -j * 40]; footR = [18 + j * 4, -j * 40]; mouth = "big";
    const cols = ["#E8A33D", "#E8443A", "#4FB3D9", "#7BC043", "#F4E9DA"];
    back = <g>{Array.from({ length: 22 }).map((_, i) => { const p = ((lt * 0.45 + i * 0.137) % 1); return <rect key={i} x={-170 + ((i * 53) % 340) + Math.sin(lt * 3 + i) * 12} y={-420 + p * 440} width={9} height={14} fill={cols[i % 5]} transform={`rotate(${lt * 200 + i * 40} ${-170 + ((i * 53) % 340)} ${-420 + p * 440})`} opacity={1 - p * 0.4} />; })}</g>;
  }

  if (sit) {
    footL = [34, -48 + w(1.3) * 7]; footR = [26, -44 - w(1.3) * 7];
    
  }
  const sitDy = sit ? 64 : 0;
  // reajustar puntos que dependen de body final
  const hipP: P = [0, -80 + body], shY = -135 + body;
  const shLp: P = [-24, shY], shRp: P = [24, shY];

  const blink = (frame % 96) < 4;
  const headY = -175 + body;
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <g opacity={vis} transform={`translate(${X} ${Y + hopArc}) scale(${sit ? 1.15 : S}) rotate(${lean} 0 0)`}>
        <g transform={`translate(0 ${sitDy})`}>
        {!sit && <ellipse cx={0} cy={4} rx={46} ry={9} fill="rgba(0,0,0,0.35)" />}
        {back}
        {hide === "none" && <>
          <Limb root={[-12, hipP[1]]} target={footL} l1={40} l2={40} bend={0.6} w={15} color={PANTS} endR={0} />
          <Limb root={[12, hipP[1]]} target={footR} l1={40} l2={40} bend={0.6} w={15} color={PANTS} endR={0} />
          <ellipse cx={footL[0] + 6} cy={footL[1] - 2} rx={15} ry={8} fill={SHOE} stroke={INK} strokeWidth={2.5} />
          <ellipse cx={footR[0] + 6} cy={footR[1] - 2} rx={15} ry={8} fill={SHOE} stroke={INK} strokeWidth={2.5} />
        </>}
        <Limb root={shLp} target={handL} l1={30} l2={30} bend={-0.6} w={12} color={SKIN} endR={7} />
        <rect x={-26} y={shY - 6} width={52} height={64} rx={22} fill={SHIRT} stroke={INK} strokeWidth={4} />
        <path d={`M-12 ${shY - 6} Q0 ${shY + 12} 12 ${shY - 6}`} fill={SKIN} stroke={INK} strokeWidth={3} />
        <line x1={18} y1={shY - 2} x2={-24} y2={hipP[1] + 2} stroke={BAG} strokeWidth={5} strokeLinecap="round" />
        <rect x={-42} y={hipP[1] - 6} width={26} height={22} rx={6} fill={BAG} stroke={INK} strokeWidth={3} />
        <line x1={-42} y1={hipP[1] + 2} x2={-16} y2={hipP[1] + 2} stroke={INK} strokeWidth={2} />
        <Limb root={shRp} target={handR} l1={30} l2={30} bend={0.6} w={12} color={SKIN} endR={7} />
        <g transform={`rotate(${headTilt} 0 ${headY + 26})`}>
          <circle cx={-10} cy={headY - 38} r={14} fill={HAIR} stroke={INK} strokeWidth={3.5} />
          <circle cx={0} cy={headY} r={30} fill={SKIN} stroke={INK} strokeWidth={4} />
          {!hat && <path d={`M-31 ${headY + 6} Q-36 ${headY - 36} 0 ${headY - 34} Q36 ${headY - 36} 31 ${headY + 6} Q26 ${headY - 12} 6 ${headY - 16} Q-20 ${headY - 10} -31 ${headY + 6}`} fill={HAIR} stroke={INK} strokeWidth={3} />}
          {hat && <g><path d={`M-32 ${headY - 12} Q-30 ${headY - 46} 0 ${headY - 46} Q30 ${headY - 46} 32 ${headY - 12} Z`} fill="#F2C94C" stroke={INK} strokeWidth={3.5} /><rect x={-38} y={headY - 14} width={76} height={8} rx={4} fill="#F2C94C" stroke={INK} strokeWidth={3.5} /></g>}
          {blink ? <>
            <line x1={-14} y1={headY + 2} x2={-6} y2={headY + 2} stroke={INK} strokeWidth={3} strokeLinecap="round" /><line x1={6} y1={headY + 2} x2={14} y2={headY + 2} stroke={INK} strokeWidth={3} strokeLinecap="round" /></> : <>
            <circle cx={-10} cy={headY + 2} r={4.5} fill={INK} /><circle cx={10} cy={headY + 2} r={4.5} fill={INK} /><circle cx={-8.5} cy={headY} r={1.4} fill="#fff" /><circle cx={11.5} cy={headY} r={1.4} fill="#fff" /></>}
          <line x1={-16} y1={headY - 2} x2={-19} y2={headY - 6} stroke={INK} strokeWidth={2.5} strokeLinecap="round" /><line x1={16} y1={headY - 2} x2={19} y2={headY - 6} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={-18} cy={headY + 12} r={5} fill="#F08A7A" opacity={0.6} /><circle cx={18} cy={headY + 12} r={5} fill="#F08A7A" opacity={0.6} />
          {mouth === "smile" && <path d={`M-8 ${headY + 12} Q0 ${headY + 20} 8 ${headY + 12}`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />}
          {mouth === "big" && <path d={`M-10 ${headY + 11} Q0 ${headY + 28} 10 ${headY + 11} Z`} fill="#8A2B2B" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />}
          {mouth === "o" && <ellipse cx={0} cy={headY + 15} rx={4} ry={5} fill="#8A2B2B" stroke={INK} strokeWidth={2.5} />}
        </g>
        {front}
        </g>
      </g>
    </svg>
  );
};
