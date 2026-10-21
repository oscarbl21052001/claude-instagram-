import { Audio, Video } from "@remotion/media";
import { ReactNode } from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import mapaRua from "./mapaRua.json";
import { CalleConfig, CalleEscena } from "../Calle/CalleDorada";
import { SubeTexto } from "../Calle/SubeTexto";
import { TEXTO_H, TEXTO_M, TEXTO_W } from "../Calle/datosRua";
import { useFuente } from "../Playa/PlayaTexto";
import { TextoFlotante } from "../Playa/PlayaTexto";
import { BLOQUES, ListaFinal, LogoSpot, useBebas } from "../Playa/Video41Playa";
import { useKitFonts } from "../kit";

// SPOT 335, montaje final. Orden de las frases de `video 4.1`: 3 → 2 → dron de la calle ("a tan solo 350 metros del mar") → 1 → 4.
// Todos los cortes caen en cambios de plano del vídeo origen (fotogramas medidos con ffmpeg a 30 fps); la voz no se corta en medio de una palabra.
// Transiciones: zoom con desenfoque (la de VideoIdeas, sin brillo) en los cortes entre planos distintos; el dron de la calle termina con
// la cámara atravesando las letras. Entre ella y ella (frase 1 → frase 4) hay corte limpio.

export const FINAL_FPS = 30;
const SRC = "playa/video41_1080.mp4";

// Cortes en el vídeo origen (fotogramas)
const S3: [number, number] = [365, 588]; // 12,17–19,60 s
const S2: [number, number] = [150, 365]; // 5,00–12,17 s (corte interno a 213 = 7,10 s)
const S1: [number, number] = [0, 150];
const S4: [number, number] = [588, 755];
const RUA_F = 101; // 3,37 s (voz de "350 METROS.mov" + 2 fotogramas de aire)

const D = (r: [number, number]) => r[1] - r[0];
const T_S3 = 0;
const T_S2 = T_S3 + D(S3);
const T_RUA = T_S2 + D(S2);
const T_S1 = T_RUA + RUA_F;
const T_S4 = T_S1 + D(S1);
export const FINAL_DURATION = T_S4 + D(S4);

// ---------- transición zoom + desenfoque (misma matemática que VideoIdeas) ----------
type Lado = { len: number; peak: number; origin: string; blur?: number };
type Corte = { f: number; sale?: Lado; entra?: Lado };
const MAX_BLUR = 16;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = Easing.out(Easing.cubic);

const camara = (f: number, cortes: Corte[]) => {
  for (const c of cortes) {
    if (c.sale) {
      const u = clamp01((f - (c.f - c.sale.len)) / c.sale.len);
      if (f < c.f && u > 0) return { scale: 1 + (c.sale.peak - 1) * Math.pow(u, 2.2), blur: (c.sale.blur ?? MAX_BLUR) * Math.pow(u, 2), origin: c.sale.origin };
    }
    if (c.entra && f >= c.f) {
      const v = clamp01((f - c.f) / c.entra.len);
      if (v < 1) return { scale: 1 + (c.entra.peak - 1) * (1 - easeOut(v)), blur: (c.entra.blur ?? MAX_BLUR) * Math.pow(1 - v, 2), origin: c.entra.origin };
    }
  }
  return { scale: 1, blur: 0, origin: "50% 50%" };
};

const Pasada: React.FC<{ cortes: Corte[]; children: (muted: boolean) => ReactNode }> = ({ cortes, children }) => {
  const f = useCurrentFrame();
  const { scale, blur, origin } = camara(f, cortes);
  const copias = blur > 0.5 ? [1, 2, 3, 4] : [];
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: origin, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
        {children(false)}
      </AbsoluteFill>
      {copias.map((k) => (
        <AbsoluteFill
          key={k}
          style={{ transform: `scale(${scale * (1 + k * 0.035 * (blur / MAX_BLUR))})`, transformOrigin: origin, filter: `blur(${blur * 1.2}px)`, opacity: 0.22 }}
        >
          {children(true)}
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

// Ganancias por tramo: igualan el nivel medio de la voz (medido en el render: S3 −27,7 · S2 −29,7 · S1 −30,8 · S4 −23,7 · dron −19,8 dB; objetivo ≈ −27 dB).
const G_S2 = 1.37;
const G_S1 = 1.55;
const G_S4 = 0.68;
const G_RUA = 0.44;

// volumen con rampas de 2 fotogramas en los extremos de la secuencia (evita clics en los cortes)
const rampa = (dur: number) => (f: number) => Math.min(1, f / 2, (dur - 1 - f) / 2 + 0.0001);

const Tramo: React.FC<{ rango: [number, number]; muted: boolean; ganancia?: number; children?: ReactNode }> = ({ rango, muted, ganancia = 1, children }) => (
  <AbsoluteFill>
    <Video src={staticFile(SRC)} trimBefore={rango[0]} muted={muted} volume={(f) => ganancia * rampa(D(rango))(f)} objectFit="cover" style={{ width: "100%", height: "100%" }} />
    {children}
  </AbsoluteFill>
);

// ---------- dron de la calle (3,37 s): recorte de 5 s a 1,5x, calle dorada, texto que sube al cielo ----------
const RUA_CONFIG: CalleConfig = {
  video: "entrada/rua_x15.mp4",
  capas: "calle_rua",
  matrices: (mapaRua as number[]).map((i) => TEXTO_M[i]),
  mapa: mapaRua as number[],
  texW: TEXTO_W,
  texH: TEXTO_H,
  frames: RUA_F,
  pintura: { desde: 0, hasta: 14 },
  texto: { desde: 12, hasta: 30 },
  finEntra: { desde: 9999, hasta: 10000 },
  lineas: ["350 METROS", "DEL MAR"],
  fontSize: 400,
  sombra: "0 0 6px rgba(70,45,0,0.95), 0 0 22px rgba(70,45,0,0.7)",
  sube: {
    desde: 34,
    hasta: 66,
    destino: { x: 65, y: 340, w: 950, h: 528 },
    capas: 16,
    paso: [0.9, 1.8],
    atraviesa: { desde: 91, hasta: 111, centro: [540, 760], escala: 4.2 },
  },
};
const SUBE_PROPS = {
  sube: RUA_CONFIG.sube!,
  matrices: RUA_CONFIG.matrices,
  texW: TEXTO_W,
  texH: TEXTO_H,
  lineas: RUA_CONFIG.lineas,
  fontSize: 400,
};

const CierreNegro: React.FC<{ base: number }> = ({ base }) => {
  const s = useCurrentFrame() / FINAL_FPS + base;
  return <AbsoluteFill style={{ background: "#000", opacity: interpolate(s, [24.92, 25.15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />;
};

const Z = (peak: number, origin: string, len = 8): Lado => ({ len, peak, origin });
const CARA = "50% 36%";

export const SpotFinal: React.FC = () => {
  useFuente();
  useBebas();
  useKitFonts();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* sonido de ambiente muy bajo (−58 dB) para que no haya silencio digital entre frases */}
      <Audio src={staticFile("audio/room_tone.m4a")} />
      {/* Frase 3: ella caminando → dron de la playa (transición ya incluida en el vídeo) → ella */}
      <Sequence from={T_S3} durationInFrames={D(S3)} layout="none">
        <Pasada cortes={[{ f: D(S3), sale: Z(1.3, CARA, 8) }]}>
          {(muted) => (
            <Tramo rango={S3} muted={muted}>
              {BLOQUES.map((b) => (
                <TextoFlotante key={b.lineas[0].texto} b={b} base={S3[0] / FINAL_FPS} />
              ))}
            </Tramo>
          )}
        </Pasada>
      </Sequence>

      {/* Frase 2: render (SPOT 335) → ella en el vallado; corte interno a 7,10 s con zoom/desenfoque */}
      <Sequence from={T_S2} durationInFrames={D(S2)} layout="none">
        <Pasada
          cortes={[
            { f: 0, entra: Z(1.3, "50% 45%", 12) },
            { f: 213 - S2[0], sale: Z(1.3, "50% 45%", 8), entra: Z(1.3, CARA, 12) },
            { f: D(S2), sale: Z(1.3, CARA, 8) },
          ]}
        >
          {(muted) => (
            <Tramo rango={S2} muted={muted} ganancia={G_S2}>
              <LogoSpot base={S2[0] / FINAL_FPS} />
            </Tramo>
          )}
        </Pasada>
      </Sequence>

      {/* Dron de la calle con la voz "a tan solo 350 metros del mar" */}
      <Sequence from={T_RUA} durationInFrames={RUA_F} layout="none">
        <Pasada cortes={[{ f: 0, entra: Z(1.3, "62% 55%", 12) }, { f: RUA_F, sale: Z(1.25, "56% 55%", 8) }]}>
          {() => <CalleEscena config={RUA_CONFIG} />}
        </Pasada>
        <Audio src={staticFile("audio/350_metros.m4a")} volume={G_RUA} />
      </Sequence>

      {/* Frase 1: dron de la bahía → ella en la playa. Arranca con las letras atravesando la cámara */}
      <Sequence from={T_S1} durationInFrames={D(S1)} layout="none">
        <Pasada cortes={[{ f: 0, entra: Z(1.25, "56% 55%", 10) }]}>
          {(muted) => (
            <Tramo rango={S1} muted={muted} ganancia={G_S1}>
              <SubeTexto {...SUBE_PROPS} frameOffset={RUA_F} />
            </Tramo>
          )}
        </Pasada>
      </Sequence>

      {/* Frase 4: ella en la calle, con las palabras clave y cierre a negro */}
      <Sequence from={T_S4} durationInFrames={D(S4)} layout="none">
        {/* corte "a juego" desde ella en la playa: arranca ampliada (la cara cae donde estaba la cara anterior) y se abre sin desenfoque */}
        <Pasada cortes={[{ f: 0, entra: { len: 24, peak: 1.5, origin: "71% 80%", blur: 0 } }]}>
          {(muted) => (
            <Tramo rango={S4} muted={muted} ganancia={G_S4}>
              <ListaFinal base={S4[0] / FINAL_FPS} />
              <CierreNegro base={S4[0] / FINAL_FPS} />
            </Tramo>
          )}
        </Pasada>
      </Sequence>
    </AbsoluteFill>
  );
};

// Solo la frase 3 (ella caminando → dron de la playa con las letras → ella), sin la transición de salida, para verla suelta.
export const S3_DURATION = D(S3);
export const SpotFrase3: React.FC = () => {
  useFuente();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Tramo rango={S3} muted={false}>
        {BLOQUES.map((b) => (
          <TextoFlotante key={b.lineas[0].texto} b={b} base={S3[0] / FINAL_FPS} />
        ))}
      </Tramo>
    </AbsoluteFill>
  );
};
