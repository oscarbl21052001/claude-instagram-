import { Video } from "@remotion/media";
import { AbsoluteFill, Easing, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useBebas } from "../Playa/Video41Playa";
import { useKitFonts } from "../kit";
import { useFuentesSolaia } from "./SolaiaIntro";

// SOLAIA 11,5–21,6 s: palabras clave sobre las 6 tomas (dormitorio → minimercado), sincronizadas con la voz (Whisper).
// Cuatro estilos: 1 Poppins terracota + contorno · 2 Playfair sobre cristal · 3 Bebas con zoom · 4 pastilla con icono.
const FPS = 30;
const T0 = 11.5;
export const KW_DURATION = Math.round(10.1 * FPS);
const F = (t: number) => Math.round((t - T0) * FPS);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = Easing.out(Easing.cubic);
const GOLD = "linear-gradient(135deg, #8f7138 0%, #C7AE6A 28%, #F3EBB6 50%, #C7AE6A 72%, #8f7138 100%)";
const TERRA = "#c2562f";

type Linea = { txt: string; t: number; clave?: boolean };
type Grupo = { a: number; b: number; lineas: Linea[]; icono: string };
// a/b: aparece y sale (s). Cortes: 14,58 · 17,10 · 18,54 · 19,48 · 20,38 · 21,38
const GRUPOS: Grupo[] = [
  { a: 12.2, b: 14.35, icono: "cama", lineas: [{ txt: "DEPARTAMENTOS", t: 12.24 }, { txt: "MODERNOS", t: 12.8, clave: true }] },
  { a: 15.9, b: 16.95, icono: "copa", lineas: [{ txt: "SALÓN DE FIESTAS", t: 15.94, clave: true }] },
  { a: 17.3, b: 18.4, icono: "olas", lineas: [{ txt: "PISCINAS", t: 17.36 }, { txt: "CLIMATIZADAS", t: 17.64, clave: true }] },
  { a: 18.72, b: 19.4, icono: "lavadora", lineas: [{ txt: "LAVANDERÍA", t: 18.78, clave: true }] },
  { a: 19.76, b: 20.3, icono: "pesas", lineas: [{ txt: "GIMNASIO", t: 19.82, clave: true }] },
  { a: 20.52, b: 21.3, icono: "carrito", lineas: [{ txt: "MINIMERCADO", t: 20.58, clave: true }] },
];

const contorno = (r: number, c = "#fff") =>
  Array.from({ length: 16 }, (_, i) => `${(Math.cos((i / 16) * Math.PI * 2) * r).toFixed(1)}px ${(Math.sin((i / 16) * Math.PI * 2) * r).toFixed(1)}px 0 ${c}`).join(", ");

const ICONOS: Record<string, string> = {
  cama: "M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7 M3 14h18 M3 18v2 M21 18v2 M7 9V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2",
  estrella: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M18 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z",
  copa: "M7 3h10l-.7 6a4.3 4.3 0 0 1-8.6 0z M12 13v7 M8 21h8",
  olas: "M3 8c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0 M3 13c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0 M3 18c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0",
  lavadora: "M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M12 10a4 4 0 1 0 .01 0 M7 6.5h.01 M10 6.5h.01",
  pesas: "M6 8v8 M3 10v4 M18 8v8 M21 10v4 M6 12h12",
  carrito: "M3 4h2l2.4 11h10.2l2-8H6.2 M9 20.2h.01 M17 20.2h.01",
};

// grupo activo en el fotograma f
const useGrupo = () => {
  const f = useCurrentFrame();
  for (const g of GRUPOS) if (f >= F(g.a) && f < F(g.b) + 10) return { g, f, local: f - F(g.a), sale: clamp01((f - F(g.b)) / 8) };
  return null;
};

// ---- 1. Poppins terracota con contorno blanco; palabra a palabra con rebote; línea dorada bajo la clave ----
const Estilo1: React.FC = () => {
  const x = useGrupo();
  const { fps } = useVideoConfig();
  if (!x) return null;
  const { g, f, sale } = x;
  const tam = Math.min(104, 940 / (Math.max(...g.lineas.map((l) => l.txt.length)) * 0.68));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 250, display: "flex", flexDirection: "column", alignItems: "center", opacity: 1 - sale, transform: `translateY(${-sale * 40}px)` }}>
      {g.lineas.map((l) => {
        const p = Math.min(spring({ frame: f - F(l.t), fps, config: { damping: 15, stiffness: 150 } }), 1.1);
        if (f < F(l.t)) return null;
        const sub = easeOut(clamp01((f - F(l.t) - 6) / 12));
        return (
          <div key={l.txt} style={{ position: "relative", fontFamily: "Poppins", fontWeight: 800, fontSize: tam, letterSpacing: 3, lineHeight: 1.12, color: TERRA, opacity: clamp01(p * 2), transform: `translateY(${(1 - Math.min(p, 1)) * 34}px)`, textShadow: `${contorno(tam * 0.045)}, 0 8px 22px rgba(50,25,8,0.45)` }}>
            {l.txt}
            {l.clave && <div style={{ position: "absolute", left: 0, bottom: -4, height: 7, width: `${sub * 100}%`, borderRadius: 4, background: GOLD, boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }} />}
          </div>
        );
      })}
    </div>
  );
};

// ---- 2. Playfair cursiva blanca sobre cristal esmerilado con barrido y línea dorada ----
const Estilo2: React.FC = () => {
  const x = useGrupo();
  if (!x) return null;
  const { g, local, sale } = x;
  const tam = Math.min(92, 820 / (Math.max(...g.lineas.map((l) => l.txt.length)) * 0.6));
  const v = easeOut(clamp01(local / 14));
  const barrido = clamp01(local / 16);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 235, display: "flex", justifyContent: "center", opacity: (1 - sale) * clamp01(v * 3), transform: `translateY(${-sale * 30}px)` }}>
      <div style={{ position: "relative", padding: "26px 52px", borderRadius: 30, background: "rgba(25,18,10,0.30)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1.5px solid rgba(243,235,182,0.75)", boxShadow: "0 18px 50px rgba(0,0,0,0.3)", clipPath: `inset(0 ${(1 - barrido) * 100}% 0 0 round 30px)` }}>
        {g.lineas.map((l) => (
          <div key={l.txt} style={{ fontFamily: "Playfair Display", fontStyle: "italic", fontWeight: 500, fontSize: tam, lineHeight: 1.18, letterSpacing: 3, color: l.clave ? "#F3EBB6" : "#fff", textAlign: "center", textShadow: "0 3px 14px rgba(0,0,0,0.5)", whiteSpace: "nowrap" }}>
            {l.txt}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 232, left: 540 - 410 + barrido * 820, width: 3, height: 130 + (g.lineas.length - 1) * 110, background: GOLD, opacity: barrido < 1 ? 1 : 0, boxShadow: "0 0 16px rgba(243,235,182,0.9)" }} />
    </div>
  );
};

// ---- 3. Bebas blanca con contorno oscuro; la clave en terracota; entra con golpe de zoom ----
const Estilo3: React.FC = () => {
  const x = useGrupo();
  const { fps } = useVideoConfig();
  if (!x) return null;
  const { g, f, sale } = x;
  const tam = Math.min(210, 960 / (Math.max(...g.lineas.map((l) => l.txt.length)) * 0.42));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 230, display: "flex", flexDirection: "column", alignItems: "center", opacity: 1 - sale }}>
      {g.lineas.map((l) => {
        if (f < F(l.t)) return null;
        const p = spring({ frame: f - F(l.t), fps, config: { damping: 11, stiffness: 220 } });
        const bl = (1 - clamp01(p)) * 10;
        return (
          <div key={l.txt} style={{ fontFamily: "Bebas Neue", fontSize: tam, letterSpacing: 4, lineHeight: 1, color: l.clave ? "#e8622f" : "#fff", transform: `scale(${1 + (1 - p) * 0.9}) translateY(${-sale * 30}px)`, filter: bl > 0.3 ? `blur(${bl}px)` : undefined, opacity: clamp01(p * 3), textShadow: `${contorno(tam * 0.035, "rgba(28,16,6,0.95)")}, 0 10px 26px rgba(0,0,0,0.5)` }}>
            {l.txt}
          </div>
        );
      })}
    </div>
  );
};

// ---- 4. Pastilla de cristal con icono animado ----
const Estilo4: React.FC = () => {
  const x = useGrupo();
  const { fps } = useVideoConfig();
  if (!x) return null;
  const { g, local, sale } = x;
  const texto = g.lineas.map((l) => l.txt).join(" ");
  const tam = Math.min(54, 700 / (texto.length * 0.68));
  const p = Math.min(spring({ frame: local, fps, config: { damping: 16, stiffness: 120 } }), 1);
  const ic = spring({ frame: local - 4, fps, config: { damping: 9, stiffness: 160 } });
  const lado = GRUPOS.indexOf(g) % 2 === 0 ? -1 : 1;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 250, display: "flex", justifyContent: "center", opacity: clamp01(p * 2) * (1 - sale), transform: `translateX(${lado * ((1 - p) * 520 + sale * 520)}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "16px 48px 16px 16px", borderRadius: 999, background: "rgba(255,252,244,0.88)", border: "2px solid rgba(199,174,106,0.9)", boxShadow: "0 16px 44px rgba(50,30,10,0.35)", backdropFilter: "blur(10px)" }}>
        <div style={{ width: 92, height: 92, borderRadius: "50%", background: "linear-gradient(135deg,#c2562f,#e07a4d)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${Math.max(0, ic)}) rotate(${(1 - Math.min(ic, 1)) * -40}deg)`, boxShadow: "0 6px 18px rgba(194,86,47,0.5)" }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={ICONOS[g.icono]} />
          </svg>
        </div>
        <div style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: tam, letterSpacing: 3, color: "#4a2e1a", whiteSpace: "nowrap" }}>{texto}</div>
      </div>
    </div>
  );
};

export const PalabrasClave: React.FC<{ estilo: 1 | 2 | 3 | 4; sinVideo?: boolean }> = ({ estilo, sinVideo = false }) => {
  useBebas();
  useKitFonts();
  useFuentesSolaia();
  return (
    <AbsoluteFill style={{ background: sinVideo ? "transparent" : "#000" }}>
      {!sinVideo && <Video src={staticFile("solaia/solaia.mp4")} trimBefore={Math.round(T0 * FPS)} />}
      {estilo === 1 && <Estilo1 />}
      {estilo === 2 && <Estilo2 />}
      {estilo === 3 && <Estilo3 />}
      {estilo === 4 && <Estilo4 />}
    </AbsoluteFill>
  );
};
