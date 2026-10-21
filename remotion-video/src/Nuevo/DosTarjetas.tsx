import { AbsoluteFill, Easing, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// Dos tarjetas laterales con la entrada dorada de Capri cuando ella dice "pensado para disfrutar y rentabilizar" (Whisper: disfrutar 11,68 s · rentabilizar 12,60 s).
// Izquierda: foto de la terraza + DISFRUTAR. Derecha: contador que sube sin parar + gráfico que se dibuja + RENTABILIZAR.

const GOLD = "linear-gradient(135deg, #8f7138 0%, #C7AE6A 28%, #F3EBB6 50%, #C7AE6A 72%, #8f7138 100%)";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = Easing.out(Easing.cubic);

export const D_IZQ = 347; // 11,57 s
export const D_DER = 374; // 12,47 s
export const D_FIN = 424; // 14,13 s (sale antes del zoom del corte a la calle)
const SALE = 9;

const W = 470;
const H = 400;
const Y = 1010;

const Tarjeta: React.FC<{ lado: "izq" | "der"; desde: number; children: React.ReactNode }> = ({ lado, desde, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < desde || f >= D_FIN) return null;
  const s = lado === "izq" ? -1 : 1;
  const e = Math.min(spring({ frame: f - desde, fps, config: { damping: 18, stiffness: 80 } }), 1);
  const out = easeOut(clamp01((f - (D_FIN - SALE)) / SALE));
  const slide = s * ((1 - e) * 520 + out * 560);
  const x = lado === "izq" ? 48 : 1080 - 48 - W;
  return (
    <div style={{ position: "absolute", left: x, top: Y, width: W, height: H, perspective: 1800, opacity: clamp01(e * 2.2) * (1 - out) }}>
      <div style={{ width: "100%", height: "100%", transform: `translateX(${slide}px) rotateY(${-s * 8 * (0.4 + 0.6 * e)}deg) rotateZ(${-s * 0.5}deg)`, transformStyle: "preserve-3d" }}>
        <div
          style={{
            boxSizing: "border-box",
            width: "100%",
            height: "100%",
            border: "8px solid transparent",
            borderRadius: 40,
            background: `linear-gradient(180deg, #FFFFFF 0%, #F6F1E6 100%) padding-box, ${GOLD} border-box`,
            boxShadow: "0 26px 64px rgba(70,44,18,0.42)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const Disfrutar: React.FC = () => {
  const f = useCurrentFrame();
  const k = easeOut(clamp01((f - D_IZQ - 6) / 14));
  const zoom = 1.08 - 0.08 * clamp01((f - D_IZQ) / 70);
  return (
    <div style={{ position: "absolute", inset: 0, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ flex: 1, borderRadius: 22, overflow: "hidden", position: "relative", boxShadow: "0 8px 22px rgba(70,44,18,0.35)", opacity: k }}>
        <Img src={staticFile("nuevo/fotos/terraza_disfrutar.png")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
      </div>
      <div style={{ textAlign: "center", fontFamily: "Bebas Neue", fontSize: 62, letterSpacing: 8, lineHeight: 1, color: "#3a2a14", opacity: k, transform: `translateY(${(1 - k) * 16}px)` }}>DISFRUTAR</div>
    </div>
  );
};

// contador que no para de subir: arranca lento y acelera; no representa ninguna cifra real
const valor = (t: number) => Math.floor(2400 * t + 1800 * t * t);
const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const Rentabilizar: React.FC = () => {
  const f = useCurrentFrame();
  const t = Math.max(0, f - D_DER - 6) / 30;
  const k = easeOut(clamp01((f - D_DER - 4) / 12));
  const pts = 28;
  const draw = clamp01((f - D_DER - 8) / 40);
  const curva = Array.from({ length: pts }, (_, i) => {
    const u = i / (pts - 1);
    return [u * 400, 150 - (Math.pow(u, 1.8) * 110 + Math.sin(u * 14) * 4 * u)] as const;
  });
  const n = Math.max(2, Math.round(draw * pts));
  const d = curva.slice(0, n).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const ult = curva[n - 1];
  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #1c150c 0%, #0d0a06 100%)", padding: "22px 24px", color: "#F4EAD3" }}>
      <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 22, letterSpacing: 7, color: "#C7AE6A", opacity: k }}>TODO EL AÑO</div>
      <div style={{ fontFamily: "Bebas Neue", fontSize: 112, lineHeight: 1, letterSpacing: 3, marginTop: 6, opacity: k, display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ color: "#C7AE6A", fontSize: 70 }}>↗</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(valor(t))}</span>
      </div>
      <svg viewBox="0 0 400 160" style={{ position: "absolute", left: 24, right: 24, top: 175, width: W - 64 - 0, height: 110 }}>
        <path d={d} fill="none" stroke="#C7AE6A" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        {draw > 0.05 && <circle cx={ult[0]} cy={ult[1]} r={8} fill="#F3EBB6" />}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 20, textAlign: "center", fontFamily: "Bebas Neue", fontSize: 56, letterSpacing: 8, lineHeight: 1, color: "#F4EAD3", opacity: k }}>RENTABILIZAR</div>
    </div>
  );
};

export const DosTarjetas: React.FC = () => {
  const f = useCurrentFrame();
  if (f < D_IZQ || f >= D_FIN) return null;
  return (
    <AbsoluteFill>
      <Tarjeta lado="izq" desde={D_IZQ}>
        <Disfrutar />
      </Tarjeta>
      <Tarjeta lado="der" desde={D_DER}>
        <Rentabilizar />
      </Tarjeta>
    </AbsoluteFill>
  );
};
