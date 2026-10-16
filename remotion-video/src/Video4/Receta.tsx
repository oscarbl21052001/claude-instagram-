import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { AbsoluteFill, Easing, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { GAP_IN, T, V4_FPS } from "./Esquema";

// "Receta de inversión" (4,4–14,1 s): ella se encoge a un marco redondeado y, debajo, un edificio se llena como el vaso de la receta
// del Negroni de @Ror_Fly (solo la distribución y el dibujo a lápiz, nada copiado): edificio a la izquierda, tarjeta de paso a la derecha,
// fila de círculos con las palabras clave abajo. Al final el edificio lleno gira y se encoge hasta el punto dorado que abre el iris.

const INK = "#2a1d0c";
const GOLD = "#E8B93C";
const GOLD_DEEP = "#8f5f12";
const CREAM = "#FFF4CF";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeIO = Easing.inOut(Easing.cubic);
const easeOut = Easing.out(Easing.cubic);
const back = Easing.out(Easing.back(1.7));

export const REC_IN = T(4.0);
const REC_FRAME_IN = 14; // frames que tarda el vídeo en encogerse
const REC_OUT = GAP_IN; // el iris ya cubre el plano: vuelve a pantalla completa mientras tanto
const REC_RETURN = 18;

// ---------- marco de ella ----------
export const useMarco = () => {
  const f = useCurrentFrame();
  const a = easeIO(clamp01((f - REC_IN) / REC_FRAME_IN));
  const b = easeIO(clamp01((f - REC_OUT) / REC_RETURN));
  const p = a * (1 - b);
  // ella sube a todo el ancho, sin marco: su borde inferior se difumina hacia el fondo camel
  return { p, h: 1920 - 1180 * p, it: -640 * p, fade: 160 * p, zoom: 1 };
};

export const FondoReceta: React.FC = () => {
  const f = useCurrentFrame();
  const o = clamp01((f - REC_IN) / 8) * (1 - clamp01((f - REC_OUT) / 10));
  if (o <= 0) return null;
  return <AbsoluteFill style={{ opacity: o, background: "linear-gradient(180deg, #E5CA9C 0%, #CEA676 100%)" }} />;
};

const useRecetaFonts = () => {
  const [handle] = useState(() => delayRender("Cargando tipografías de la receta"));
  useEffect(() => {
    Promise.all([
      loadFont({ family: "Chewy", url: staticFile("fonts/Chewy-Regular.woff2"), weight: "400" }),
      loadFont({ family: "Caveat", url: staticFile("fonts/Caveat-Bold.woff2"), weight: "700" }),
    ]).then(() => continueRender(handle));
  }, [handle]);
};

// ---------- línea de tiempo (s) ----------
const STEPS = [
  { at: 5.4, lines: ["LA CONSTRUCTORA", "TE FINANCIA"], sub: "directamente con ellos", done: 7.2 },
  { at: 8.7, lines: ["TÚ INICIAS CON", "CAPITAL MÍNIMO"], sub: "para comprar de pozo", done: 10.9 },
];
const RESULT_AT = 1e9; // sin tarjeta de resultado
const FADE_UI = 13.5; // la interfaz se va y queda solo el edificio
const SPIN_A = 13.2;
const MOVE_A = 13.6;
const END = 14.1;

const BX = { l: 130, r: 430, top: 1020, bot: 1430 };
const levelAt = (t: number) => {
  const r = (a: number, b: number) => easeIO(clamp01((t - a) / (b - a)));
  return (r(6.8, 7.3) + r(10.55, 11.05)) / 2;
};

const Check: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => (
  <path d={`M ${x - 9} ${y} L ${x - 2} ${y + 8} L ${x + 11} ${y - 8}`} fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
);

export const Receta: React.FC = () => {
  useRecetaFonts();
  const f = useCurrentFrame();
  const t = f / V4_FPS;
  if (f < REC_IN || f >= REC_OUT) return null;

  const ui = clamp01((t - 4.5) / 0.5) * (1 - clamp01((t - FADE_UI) / 0.5)); // título, tarjeta, pasos
  const drawK = easeOut(clamp01((t - 4.4) / 0.9)); // el edificio se dibuja
  const level = levelAt(t);
  const fillTop = BX.bot - (BX.bot - BX.top) * level;

  // giro + viaje al punto del iris
  const spin = easeIO(clamp01((t - SPIN_A) / (END - SPIN_A)));
  const sx = t < SPIN_A ? 1 : Math.cos(spin * 3 * Math.PI);
  const mv = easeIO(clamp01((t - MOVE_A) / (END - MOVE_A)));
  const sc = 1 - 0.93 * mv;
  const cx = 280 + (540 - 280) * mv;
  const cy = 1225 + (960 - 1225) * mv;
  const bOp = clamp01((t - 4.4) / 0.3) * (1 - clamp01((f - (GAP_IN - 18)) / 6));
  const pulse = t >= 11.0 && t < 12.3 ? 1 + 0.025 * Math.sin((t - 11.0) * 9) : 1;

  // paso actual de la tarjeta
  let step = -1;
  for (let i = 0; i < STEPS.length; i++) if (t >= STEPS[i].at) step = i;
  const isResult = t >= RESULT_AT;
  const stepStart = isResult ? RESULT_AT : step >= 0 ? STEPS[step].at : 0;
  const cardIn = back(clamp01((t - stepStart) / 0.35));
  const cardBoxIn = back(clamp01((t - 5.0) / 0.4));

  // grúa (paso 1): engancha el billete y lo deja caer en el edificio; después se retira
  const craneIn = easeOut(clamp01((t - 5.6) / 0.5));
  const craneOut = easeIO(clamp01((t - 7.6) / 0.6));
  const hook = 925 + 125 * easeIO(clamp01((t - 6.3) / 0.6)) - 125 * easeIO(clamp01((t - 7.0) / 0.5));
  const billVisible = t >= 6.0 && t < 6.85;
  const billPop = back(clamp01((t - 6.0) / 0.25));

  // mano (paso 2): sale de detrás de la tarjeta, sostiene la moneda sobre el edificio y la suelta
  const HAND_Y = 1000;
  const handIn = easeIO(clamp01((t - 9.2) / 0.6));
  const handOut = easeIO(clamp01((t - 10.75) / 0.5));
  const handX = 600 - 258 * handIn + 258 * handOut;
  const release = easeOut(clamp01((t - 10.3) / 0.2));
  const fall = clamp01((t - 10.3) / 0.55);
  const coinY = HAND_Y + 200 * fall * fall;
  const coinFalling = t >= 10.3 && t < 10.9;
  const coinHeld = t >= 9.2 && t < 10.3;

  const circleX = [330, 750];
  const doneAt = STEPS.map((s) => s.done);
  const barK = isResult ? 1 : step >= 0 ? (step + 1) / 2 : 0;
  const lineK = easeOut(clamp01((t - 8.7) / 0.7));

  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" />
          </filter>
          <clipPath id="nivel">
            <rect x={BX.l} y={fillTop} width={BX.r - BX.l} height={BX.bot - fillTop} />
          </clipPath>
        </defs>

        {/* título */}
        <g opacity={ui} transform={`translate(0 ${(1 - easeOut(clamp01((t - 4.4) / 0.5))) * 20})`}>
          <text x={540} y={860} textAnchor="middle" fontFamily="Chewy" fontSize={78} letterSpacing={3} fill={GOLD} stroke={INK} strokeWidth={9} strokeLinejoin="round" paintOrder="stroke">
            ¿CÓMO FUNCIONA?
          </text>
        </g>

        {/* edificio */}
        <g opacity={bOp} transform={`translate(${cx} ${cy}) scale(${sx * sc * pulse} ${sc * pulse}) translate(-280 -1225)`}>
          <g filter="url(#rough)">
            <rect x={BX.l} y={BX.top} width={BX.r - BX.l} height={BX.bot - BX.top} rx={8} fill="rgba(255,248,230,0.5)" opacity={drawK} />
            <rect x={BX.l} y={BX.top} width={BX.r - BX.l} height={BX.bot - BX.top} fill="rgba(232,185,60,0.6)" clipPath="url(#nivel)" />
            {[1050, 1130, 1210, 1290].map((y) =>
              [160, 250, 340].map((x) => {
                const lit = fillTop <= y + 60;
                return <rect key={`${x}-${y}`} x={x} y={y} width={60} height={56} rx={5} fill={lit ? CREAM : "rgba(255,255,255,0.35)"} stroke={INK} strokeWidth={3} opacity={drawK} />;
              }),
            )}
            <path d={`M 250 ${BX.bot} L 250 1385 Q 280 1360 310 1385 L 310 ${BX.bot}`} fill="rgba(42,29,12,0.2)" stroke={INK} strokeWidth={3.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - drawK} />
            <path d={`M ${BX.l} ${BX.bot} L ${BX.l} ${BX.top} L ${BX.r} ${BX.top} L ${BX.r} ${BX.bot}`} fill="none" stroke={INK} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - drawK} />
            <path d={`M 118 ${BX.top} L 118 990 L 442 990 L 442 ${BX.top} Z`} fill="rgba(255,248,230,0.7)" stroke={INK} strokeWidth={5} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - drawK} />
            <path d={`M 100 ${BX.bot} L 460 ${BX.bot}`} stroke={t >= 11.0 ? GOLD_DEEP : INK} strokeWidth={t >= 11.0 ? 9 : 5} strokeLinecap="round" opacity={drawK} />
          </g>
        </g>

        {/* marca de nivel, como el "1 oz" del vaso */}
        <g opacity={ui * clamp01(level * 6)}>
          <path d={`M 96 ${fillTop} L 126 ${fillTop}`} stroke={INK} strokeWidth={3.5} strokeLinecap="round" filter="url(#rough)" />
          <text x={88} y={fillTop + 9} textAnchor="end" fontFamily="Caveat" fontWeight={700} fontSize={32} fill={INK}>
            {level > 0.99 ? "lleno" : "1/2"}
          </text>
        </g>

        {/* grúa */}
        <g opacity={craneIn * (1 - craneOut) * ui} filter="url(#rough)" transform={`translate(${craneOut * 70} ${(1 - craneIn) * 40 - craneOut * 50})`}>
          <path d="M 456 1430 L 456 905 L 472 905 L 472 1430" fill="none" stroke={INK} strokeWidth={4} />
          {Array.from({ length: 10 }).map((_, i) => (
            <path key={i} d={`M 456 ${1430 - i * 52} L 472 ${1430 - i * 52 - 52} M 472 ${1430 - i * 52} L 456 ${1430 - i * 52 - 52}`} stroke={INK} strokeWidth={2} />
          ))}
          <path d="M 230 905 L 530 905 L 530 925 L 230 925 Z" fill="rgba(255,248,230,0.8)" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <rect x={500} y={925} width={34} height={36} fill={GOLD} stroke={INK} strokeWidth={3.5} />
          <path d={`M 300 925 L 300 ${hook}`} stroke={INK} strokeWidth={3} />
          <path d={`M 292 ${hook} L 308 ${hook} L 304 ${hook + 12} L 296 ${hook + 12} Z`} fill={INK} />
          {billVisible && (
            <g transform={`translate(300 ${hook + 12 + 24}) scale(${billPop})`}>
              <rect x={-46} y={-24} width={92} height={48} rx={7} fill={GOLD} stroke={INK} strokeWidth={4} />
              <circle cx={0} cy={0} r={14} fill="rgba(255,244,207,0.7)" stroke={INK} strokeWidth={3} />
            </g>
          )}
        </g>

        {/* mano (paso 2) */}
        {t >= 9.2 && handOut < 1 && (
          <g opacity={ui}>
            {coinFalling && (
              <g filter="url(#rough)" opacity={1 - clamp01((coinY - 1130) / 60)} transform={`translate(${handX - 66} ${coinY}) rotate(${fall * 200})`}>
                <circle cx={0} cy={0} r={20} fill={GOLD} stroke={INK} strokeWidth={4} />
                <circle cx={0} cy={0} r={13} fill="none" stroke={INK} strokeWidth={2.5} />
              </g>
            )}
            <g filter="url(#rough)" transform={`translate(${handX} ${HAND_Y})`}>
              <rect x={70} y={-36} width={270} height={72} rx={10} fill="#5a4630" stroke={INK} strokeWidth={4} />
              <rect x={58} y={-42} width={22} height={84} rx={8} fill={GOLD} stroke={INK} strokeWidth={4} />
              {coinHeld && (
                <g transform={`translate(-66 0) scale(${back(clamp01((t - 9.5) / 0.25))})`}>
                  <circle cx={0} cy={0} r={20} fill={GOLD} stroke={INK} strokeWidth={4} />
                  <circle cx={0} cy={0} r={13} fill="none" stroke={INK} strokeWidth={2.5} />
                </g>
              )}
              <rect x={-14} y={-32} width={84} height={64} rx={22} fill="#F2D3A5" stroke={INK} strokeWidth={4} />
              <g transform={`rotate(${-release * 22} -10 -18)`}>
                <rect x={-62} y={-27} width={56} height={18} rx={9} fill="#F2D3A5" stroke={INK} strokeWidth={4} />
              </g>
              <g transform={`rotate(${release * 22} -10 18)`}>
                <rect x={-58} y={9} width={52} height={18} rx={9} fill="#F2D3A5" stroke={INK} strokeWidth={4} />
              </g>
            </g>
          </g>
        )}

        {/* tarjeta de paso */}
        <g opacity={ui * clamp01(cardBoxIn * 2)} transform={`translate(0 ${(1 - cardBoxIn) * 24})`}>
          <rect x={522} y={974} width={490} height={330} rx={26} fill="rgba(232,185,60,0.55)" filter="url(#rough)" />
          <rect x={510} y={960} width={490} height={330} rx={26} fill="#FFF8E6" stroke={INK} strokeWidth={4.5} filter="url(#rough)" />
          {step >= 0 && (
            <g opacity={clamp01(cardIn * 2)} transform={`translate(0 ${(1 - cardIn) * 16})`}>
              <text x={540} y={1012} fontFamily="Inter" fontWeight={800} fontSize={20} letterSpacing={3} fill={GOLD_DEEP}>
                {isResult ? "RESULTADO" : `PASO ${step + 1} DE 2`}
              </text>
              {(isResult ? ["INVERSIÓN"] : STEPS[step].lines).map((ln, i, arr) => (
                <text key={ln} x={540} y={arr.length === 1 ? 1100 : 1074 + i * 50} fontFamily="Chewy" fontSize={isResult ? 66 : 44} letterSpacing={1.5} fill={GOLD} stroke={INK} strokeWidth={6} strokeLinejoin="round" paintOrder="stroke">
                  {ln}
                </text>
              ))}
              <text x={540} y={1186} fontFamily="Caveat" fontWeight={700} fontSize={36} fill={INK}>
                {isResult ? "con financiación" : STEPS[step].sub}
              </text>
            </g>
          )}
          <g filter="url(#rough)">
            <rect x={540} y={1236} width={370} height={20} rx={10} fill="rgba(42,29,12,0.12)" stroke={INK} strokeWidth={3} />
            <rect x={542} y={1238} width={Math.max(0, 366 * barK)} height={16} rx={8} fill={GOLD} />
          </g>
          <text x={924} y={1253} fontFamily="Caveat" fontWeight={700} fontSize={30} fill={INK}>
            {isResult ? "2/2" : step >= 0 ? `${step + 1}/2` : ""}
          </text>
        </g>

        {/* fila de pasos con las palabras clave */}
        <g opacity={ui}>
          <g filter="url(#rough)">
            <path d="M 352 1470 L 728 1470" stroke="rgba(42,29,12,0.3)" strokeWidth={5} strokeLinecap="round" />
            <path d={`M 352 1470 L ${352 + 376 * lineK} 1470`} stroke={GOLD_DEEP} strokeWidth={6} strokeLinecap="round" />
            {circleX.map((x, i) => {
              const d = easeOut(clamp01((t - doneAt[i]) / 0.3));
              return (
                <circle key={x} cx={x} cy={1470} r={22} fill={d > 0 ? GOLD : "#FFF8E6"} stroke={INK} strokeWidth={4} />
              );
            })}
          </g>
          {circleX.map((x, i) => {
            const d = easeOut(clamp01((t - doneAt[i]) / 0.3));
            return (
              <g key={x}>
                {d > 0 ? (
                  <g filter="url(#rough)">
                    <Check x={x} y={1470} k={d} />
                  </g>
                ) : (
                  <text x={x} y={1479} textAnchor="middle" fontFamily="Chewy" fontSize={26} fill="rgba(42,29,12,0.55)">
                    {i + 1}
                  </text>
                )}
                <text x={x} y={1522} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={20} letterSpacing={2} fill={d > 0 ? INK : "rgba(42,29,12,0.6)"}>
                  {["LA CONSTRUCTORA", "TÚ"][i]}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
