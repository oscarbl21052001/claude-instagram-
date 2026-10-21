import { AbsoluteFill, useCurrentFrame } from "remotion";

// Subtítulos minimalistas estilo documental (mismo estilo, tamaño y altura que en CAPRI): Inter Medium 30 px, blanco, sombra suave, una línea,
// centrado a 330 px del borde inferior (más arriba que en CAPRI, a petición de la persona), con una línea fina blanca encima y un degradado negro suave abajo para el contraste.
// Texto: Whisper medium sobre la voz de "SPOT 335 VIDEO". Pendiente de confirmar por la persona: "Bombinhas", "garantizas", "12.000 dólares".
export const FPS = 30;
const T = (s: number) => Math.round(s * FPS);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const SUBS: { a: number; b: number; t: string }[] = [
  { a: 0.0, b: 2.6, t: "Con tan solo 12.000 dólares de anticipo," },
  { a: 2.68, b: 4.7, t: "cuotas de 700 dólares mensuales," },
  { a: 4.72, b: 7.4, t: "más refuerzos, ya garantizas tu unidad." },
  { a: 7.44, b: 9.56, t: "Te presento el SPOT 335," },
  { a: 9.98, b: 12.32, t: "un emprendimiento pensado para disfrutar" },
  { a: 12.6, b: 14.44, t: "y rentabilizar durante todo el año." },
  { a: 14.66, b: 17.34, t: "A tan solo 350 metros del mar," },
  { a: 17.78, b: 19.24, t: "en pleno corazón de Bombinhas." },
  { a: 19.46, b: 21.9, t: "¿Por qué SPOT 335 tiene un gran potencial" },
  { a: 21.9, b: 22.84, t: "de rentabilidad?" },
  { a: 22.92, b: 24.8, t: "Porque hoy el turista no busca solo" },
  { a: 24.8, b: 25.62, t: "cercanía al mar," },
  { a: 25.96, b: 28.64, t: "busca experiencias, comodidad y servicios." },
  { a: 28.64, b: 30.7, t: "Invertí ahora en una de las ciudades" },
  { a: 30.7, b: 33.08, t: "con mayor crecimiento y demanda turística" },
  { a: 33.08, b: 34.1, t: "del sur de Brasil." },
];

export const Subtitulos: React.FC<{ total: number }> = ({ total }) => {
  const f = useCurrentFrame();
  let op = 0;
  let text = "";
  for (const s of SUBS) {
    const a = T(s.a) - 2;
    const b = T(s.b);
    const o = Math.min(clamp01((f - a) / 5), clamp01((b + 6 - f) / 6));
    if (o > op) {
      op = o;
      text = s.t;
    }
  }
  // el degradado de contraste queda fijo todo el vídeo (sin parpadear entre frases)
  const grad = Math.min(clamp01(f / 10), clamp01((total - f) / 10));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 640, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)", opacity: grad }} />
      {op > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 330, display: "flex", flexDirection: "column", alignItems: "center", opacity: op }}>
          <div style={{ width: 56, height: 1.5, background: "rgba(255,255,255,0.8)", marginBottom: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.5)" }} />
          <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 30, letterSpacing: 1.2, color: "#FFFFFF", textShadow: "0 1px 3px rgba(0,0,0,0.75), 0 2px 12px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.5)", textAlign: "center", whiteSpace: "nowrap" }}>{text}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
