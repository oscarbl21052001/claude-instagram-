import { Video } from "@remotion/media";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { colors, fonts, GlassCard, Headline, safe, Tag, useKitFonts } from "../kit";

// Recorrido virtual de un apartamento tipo (recreación 3D aproximada a partir de un plano).
// Los tiempos están en fotogramas a 24 fps y siguen la ruta de cámara del render.
export const TOUR_FPS = 24;
export const TOUR_DURATION = 438;

type Room = { name: string; area: string; note: string; from: number; duration: number };
const ROOMS: Room[] = [
  { name: "Salón y cocina", area: "23,37 m²", note: "Comedor ovalado · cocina integrada", from: 58, duration: 100 },
  { name: "Balcón", area: "6,44 m²", note: "Con parrilla y vista al mar", from: 206, duration: 80 },
  { name: "Suite B", area: "12,45 m²", note: "Celosía de madera y ventanal", from: 368, duration: 56 },
];

const Fade: React.FC<{ duration: number; children: React.ReactNode }> = ({ duration, children }) => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ opacity: out }}>{children}</div>;
};

const RoomCard: React.FC<Room> = ({ name, area, note, duration }) => (
  <Fade duration={duration}>
    <div style={{ position: "absolute", left: safe.side, top: 1330, width: 640 }}>
      <GlassCard delay={0} style={{ padding: "34px 40px", background: "rgba(8,8,12,0.68)", border: "1.5px solid rgba(255,255,255,0.14)" }}>
        <div style={{ fontFamily: fonts.body, fontWeight: 800, fontSize: 30, letterSpacing: 4, textTransform: "uppercase", color: colors.accentSoft }}>{name}</div>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 96, lineHeight: 1.05, color: colors.fg, letterSpacing: -2 }}>{area}</div>
        <div style={{ marginTop: 6, fontFamily: fonts.body, fontWeight: 500, fontSize: 32, color: "rgba(255,255,255,0.82)" }}>{note}</div>
      </GlassCard>
    </div>
  </Fade>
);

const Scrim: React.FC<{ top?: boolean }> = ({ top }) => (
  <AbsoluteFill
    style={{
      background: top
        ? "linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0) 38%)"
        : "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 34%)",
    }}
  />
);

export const TourApto: React.FC = () => {
  useKitFonts();
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgDeep }}>
      <Video src={staticFile("tour/walk.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />

      {/* Portada */}
      <Sequence durationInFrames={72}>
        <Fade duration={72}>
          <Scrim top />
          <div style={{ position: "absolute", left: safe.side, top: safe.top }}>
            <Tag text="Recorrido virtual" delay={4} />
            <div style={{ marginTop: 30 }}>
              <Headline lines={["APARTAMENTO TIPO", "80 M² · 2 SUITES"]} delay={10} gradientLine={1} size={150} />
            </div>
          </div>
        </Fade>
      </Sequence>

      {/* Etiquetas de ambientes */}
      <Scrim />
      {ROOMS.map((r) => (
        <Sequence key={r.name} from={r.from} durationInFrames={r.duration}>
          <RoomCard {...r} />
        </Sequence>
      ))}

      {/* Aviso */}
      <Sequence from={TOUR_DURATION - 60} durationInFrames={60}>
        <div
          style={{
            position: "absolute",
            left: safe.side,
            right: safe.side,
            top: safe.top,
            textAlign: "center",
            fontFamily: fonts.body,
            fontWeight: 500,
            fontSize: 28,
            color: "rgba(255,255,255,0.78)",
            textShadow: "0 4px 24px rgba(0,0,0,0.7)",
          }}
        >
          Recreación 3D ilustrativa. Medidas y acabados aproximados.
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
