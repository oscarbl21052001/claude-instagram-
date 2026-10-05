import { AbsoluteFill } from "remotion";
import {
  Background,
  colors,
  fonts,
  GlassCard,
  Headline,
  Icon,
  IconName,
  safe,
  Tag,
  TypeWriter,
  useKitFonts,
  Word,
  WordCaptions,
} from "../kit";

// Demostración del kit con texto de ejemplo (sin material de ningún video).
const Stat: React.FC<{ icon: IconName; label: string; value: string; delay: number; tone: string }> = ({
  icon,
  label,
  value,
  delay,
  tone,
}) => (
  <GlassCard delay={delay} glow={`${tone}22`} style={{ padding: "34px 36px", display: "flex", alignItems: "center", gap: 28 }}>
    <div
      style={{
        flexShrink: 0,
        width: 96,
        height: 96,
        borderRadius: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `${tone}26`,
        color: tone,
        border: `1.5px solid ${tone}44`,
      }}
    >
      <Icon name={icon} size={52} />
    </div>
    <div>
      <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 32, color: colors.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 70, lineHeight: 1, color: colors.fg, letterSpacing: -2 }}>{value}</div>
    </div>
  </GlassCard>
);

const WORDS: Word[] = [
  { text: "Así", start: 4.0, end: 4.3 },
  { text: "se", start: 4.3, end: 4.5 },
  { text: "ven", start: 4.5, end: 4.8 },
  { text: "los", start: 4.8, end: 5.0 },
  { text: "subtítulos", start: 5.0, end: 5.6, highlight: true },
  { text: "con", start: 5.6, end: 5.8 },
  { text: "palabras", start: 5.8, end: 6.2 },
  { text: "clave", start: 6.2, end: 6.8, highlight: true },
];

export const KitDemo: React.FC = () => {
  useKitFonts();
  return (
    <AbsoluteFill>
      <Background />
      <div style={{ position: "absolute", left: safe.side, top: safe.top }}>
        <Tag text="Ejemplo de estilo" delay={4} />
        <div style={{ marginTop: 36 }}>
          <Headline lines={["TARJETAS", "EN MOVIMIENTO"]} delay={10} gradientLine={1} size={188} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: safe.side,
          right: safe.side,
          top: 780,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 28,
        }}
      >
        <Stat icon="chart" label="Alcance" value="+128%" delay={34} tone={colors.accentSoft} />
        <Stat icon="target" label="Objetivo" value="3 de 4" delay={42} tone={colors.highlight} />
        <Stat icon="layers" label="Capas" value="12" delay={50} tone={colors.pink} />
        <Stat icon="spark" label="Ideas" value="48" delay={58} tone={colors.accentIndigo} />
      </div>
      <div style={{ position: "absolute", left: safe.side, right: safe.side, top: 1250 }}>
        <TypeWriter text="Texto que se escribe solo" delay={88} />
      </div>
      <WordCaptions words={WORDS} maxWords={3} centerY={1500} size={80} />
    </AbsoluteFill>
  );
};
