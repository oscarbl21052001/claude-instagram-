import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { AbsoluteFill, Easing, Freeze, OffthreadVideo, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// OFICIOS: gancho "PARA MIS CLIENTES SOY / MULTIUSOS" + 5 emojis, y por cada cambio de oficio una etiqueta con su emoji.
// `completo` suma el flash con zoom en cada corte, el contador 1/5 y el detalle animado sobre cada fondo. El cierre va siempre.

export const OFICIOS_FPS = 30;
const VIDEO_FRAMES = 340; // 11,33 s
const TAIL = 40; // fotograma final congelado para que se lea el cierre
export const OFICIOS_DURATION = VIDEO_FRAMES + TAIL;

const INK = "#1b1208";
const GOLD = "#F2C044";
const CREAM = "#FFF4DC";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = Easing.out(Easing.cubic);
const easeIn = Easing.in(Easing.cubic);
const s = (sec: number) => Math.round(sec * OFICIOS_FPS);

const OFICIOS = [
  { cut: 3.87, emoji: "⚖️", lines: ["ABOGADA"], ring: { x: 40, y: 200, w: 760, h: 440 } },
  { cut: 5.33, emoji: "📋", lines: ["GESTORA DE", "PROYECTOS"], ring: { x: 40, y: 540, w: 760, h: 330 } },
  { cut: 6.7, emoji: "📊", lines: ["FINANZAS"], ring: { x: 740, y: 730, w: 330, h: 220 } },
  { cut: 8.3, emoji: "🛋️", lines: ["INTERIORISTA"], ring: { x: 100, y: 470, w: 830, h: 280 } },
  { cut: 9.83, emoji: "📐", lines: ["ARQUITECTA"], ring: { x: 700, y: 490, w: 340, h: 420 } },
];
const CIERRE = 10.45;

const useFonts = () => {
  const [handle] = useState(() => delayRender("Cargando Poppins"));
  useEffect(() => {
    loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-ExtraBold.woff2"), weight: "800" }).then(() => continueRender(handle));
  }, [handle]);
};

const POP: React.CSSProperties = { fontFamily: "Poppins", fontWeight: 800, whiteSpace: "nowrap", paintOrder: "stroke fill", letterSpacing: -2 };

const Sticker: React.FC<{ emoji: string; size: number; rot: number; shadow?: number }> = ({ emoji, size, rot, shadow = 10 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      boxSizing: "border-box",
      background: CREAM,
      border: `${Math.round(size / 17)}px solid ${INK}`,
      boxShadow: `0 ${shadow}px 0 rgba(27,18,8,.9), 0 ${shadow * 1.8}px 30px rgba(0,0,0,.35)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Noto Color Emoji",
      fontSize: size * 0.52,
      transform: `rotate(${rot}deg)`,
    }}
  >
    {emoji}
  </div>
);

const Gancho: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = easeIn(clamp01((f - s(3.5)) / s(0.3)));
  const ent = (a: number, d = 14) => easeOut(clamp01((f - s(a)) / d));
  const eSmall = ent(0.12, 12);
  const eBig = ent(0.25, 18);
  const sc = interpolate(spring({ frame: f - s(0.25), fps, config: { damping: 12, stiffness: 140 } }), [0, 1], [1.4, 1]);
  const centers = [140, 340, 540, 740, 940];
  return (
    <AbsoluteFill style={{ opacity: 1 - o, transform: `translateY(${-o * 70}px)`, filter: o > 0.02 ? `blur(${o * 10}px)` : undefined }}>
      <div style={{ ...POP, position: "absolute", left: 66, top: 150, fontSize: 64, color: CREAM, WebkitTextStroke: `10px ${INK}`, opacity: eSmall, transform: `translateY(${(1 - eSmall) * -24}px)`, textShadow: "0 6px 0 rgba(27,18,8,.9), 0 12px 28px rgba(0,0,0,.4)" }}>
        PARA MIS CLIENTES SOY
      </div>
      <div style={{ ...POP, position: "absolute", left: 50, top: 205, fontSize: 175, letterSpacing: -4, color: GOLD, WebkitTextStroke: `14px ${INK}`, opacity: clamp01(eBig * 3), transform: `scale(${sc})`, transformOrigin: "0 60%", filter: eBig < 1 ? `blur(${(1 - eBig) * 10}px)` : undefined, textShadow: "0 10px 0 rgba(27,18,8,.9), 0 20px 40px rgba(0,0,0,.45)" }}>
        MULTIUSOS
      </div>
      {OFICIOS.map((of, i) => {
        const p = spring({ frame: f - s(0.7 + i * 0.14), fps, config: { damping: 9, stiffness: 160 } });
        return (
          <div key={of.emoji} style={{ position: "absolute", left: centers[i] - 85, top: 520, opacity: clamp01(p * 2), transform: `scale(${p}) translateY(${(1 - p) * 40}px)` }}>
            <Sticker emoji={of.emoji} size={170} rot={[-6, 5, -4, 6, -5][i]} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Etiqueta: React.FC<{ i: number; completo: boolean }> = ({ i, completo }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const of = OFICIOS[i];
  const start = s(of.cut) + 2;
  const end = i < OFICIOS.length - 1 ? s(OFICIOS[i + 1].cut) - 3 : s(CIERRE);
  if (f < start || f > end + 12) return null;
  const p = spring({ frame: f - start, fps, config: { damping: 10, stiffness: 150 } });
  const out = easeIn(clamp01((f - end) / 10));
  const pulse = 1 + Math.sin((f - start) / 5) * 0.025 * clamp01((f - start) / 20);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 600, opacity: (1 - out) * clamp01(p * 2), transform: `translateY(${-out * 40}px)` }}>
      <div style={{ position: "absolute", left: 60, top: 190, transform: `scale(${p * pulse})`, transformOrigin: "50% 50%" }}>
        <Sticker emoji={of.emoji} size={200} rot={-6} />
      </div>
      <div style={{ position: "absolute", left: 292, top: 190, height: 200, display: "flex", flexDirection: "column", justifyContent: "center", transform: `translateX(${(1 - p) * 60}px)` }}>
        {of.lines.map((l) => (
          <div key={l} style={{ ...POP, fontSize: of.lines.length > 1 ? 74 : 94, lineHeight: 1.05, color: GOLD, WebkitTextStroke: `12px ${INK}`, textShadow: "0 8px 0 rgba(27,18,8,.9), 0 16px 34px rgba(0,0,0,.4)" }}>
            {l}
          </div>
        ))}
      </div>
      {completo && (
        <div style={{ position: "absolute", right: 40, top: 40, padding: "6px 26px", borderRadius: 40, background: INK, border: `4px solid ${GOLD}`, ...POP, letterSpacing: 0, fontSize: 46, color: CREAM, transform: `scale(${p})` }}>
          {i + 1}/5
        </div>
      )}
    </div>
  );
};

const Detalle: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const r = OFICIOS[i].ring;
  const a = s(OFICIOS[i].cut) + 14;
  const b = i < OFICIOS.length - 1 ? s(OFICIOS[i + 1].cut) - 3 : s(CIERRE);
  if (f < a || f > b + 8) return null;
  const draw = easeOut(clamp01((f - a) / 18));
  const out = clamp01((f - b) / 8);
  const per = 2 * (r.w + r.h);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: 1 - out }}>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={26} fill="none" stroke={INK} strokeWidth={16} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} />
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={26} fill="none" stroke={GOLD} strokeWidth={8} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} />
    </svg>
  );
};

const Cierre: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f - s(CIERRE);
  if (t < 0) return null;
  const eSmall = easeOut(clamp01(t / 12));
  const eBig = easeOut(clamp01((t - 5) / 16));
  const sc = interpolate(spring({ frame: t - 5, fps, config: { damping: 12, stiffness: 140 } }), [0, 1], [1.4, 1]);
  return (
    <AbsoluteFill>
      <div style={{ ...POP, position: "absolute", left: 66, top: 150, fontSize: 64, color: CREAM, WebkitTextStroke: `10px ${INK}`, opacity: eSmall, transform: `translateY(${(1 - eSmall) * -24}px)`, textShadow: "0 6px 0 rgba(27,18,8,.9), 0 12px 28px rgba(0,0,0,.4)" }}>
        PERO EN REALIDAD SOY
      </div>
      <div style={{ ...POP, position: "absolute", left: 50, top: 205, fontSize: 150, letterSpacing: -4, color: GOLD, WebkitTextStroke: `14px ${INK}`, opacity: clamp01(eBig * 3), transform: `scale(${sc})`, transformOrigin: "0 60%", filter: eBig < 1 ? `blur(${(1 - eBig) * 10}px)` : undefined, textShadow: "0 10px 0 rgba(27,18,8,.9), 0 20px 40px rgba(0,0,0,.45)" }}>
        CORREDORA
      </div>
    </AbsoluteFill>
  );
};

export const Oficios: React.FC<{ completo: boolean }> = ({ completo }) => {
  useFonts();
  const f = useCurrentFrame();
  // zoom corto + flash en cada corte (solo completo)
  let zoom = 1;
  let flash = 0;
  if (completo) {
    for (const of of OFICIOS) {
      const d = f - s(of.cut);
      if (d >= 0 && d < 8) {
        zoom = 1 + 0.07 * (1 - easeOut(d / 8));
        flash = 0.75 * (1 - easeOut(clamp01(d / 6)));
      }
    }
  }
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <Sequence durationInFrames={VIDEO_FRAMES}>
          <OffthreadVideo src={staticFile("oficios/oficios_1080.mp4")} />
        </Sequence>
        <Sequence from={VIDEO_FRAMES}>
          <Freeze frame={VIDEO_FRAMES - 2}>
            <OffthreadVideo src={staticFile("oficios/oficios_1080.mp4")} startFrom={VIDEO_FRAMES - 2} muted />
          </Freeze>
        </Sequence>
      </AbsoluteFill>
      {completo && OFICIOS.map((_, i) => <Detalle key={i} i={i} />)}
      <Gancho />
      {OFICIOS.map((_, i) => (
        <Etiqueta key={i} i={i} completo={completo} />
      ))}
      <Cierre />
      <AbsoluteFill style={{ background: "#fff", opacity: flash, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
