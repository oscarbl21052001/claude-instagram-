import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useEnter, useKitFonts } from "../kit";

// Reel esquemático sincronizado con el audio "AUDIO.mp4" (11,6 s):
// "Y cuando estas tres cosas están alineadas, tenés un producto pensado para disfrutar, rentabilizar y tener
//  grandes ganancias también con la plusvalía del inmueble."
// Tres tarjetas → se funden en un cuerpo brillante → casa 3D → emoji con gafas, billete y flecha verde que palpita.
// Paleta: la del esquema anterior (negro y dorados); verde solo en la flecha y el billete.

export const CASA_FPS = 30;
export const CASA_DURATION = 348; // 11,6 s

// Tiempos (s) tomados de la transcripción por palabras (faster-whisper "medium") y del nivel de voz
const T = {
  card: [0.0, 0.08, 0.16], // las tres tarjetas aparecen casi a la vez para poder leerlas
  mergeFrom: 1.7, // "estas tres cosas"
  mergeTo: 3.3, // "alineadas"
  glowFrom: 2.3,
  morph: 3.64, // "tenés un producto pensado"
  morphLen: 0.3,
  emoji: 5.04, // "para disfrutar"
  bill: 6.32, // "rentabilizar"
  arrow: 9.1, // "plusvalía del inmueble"
};

const P = {
  black: "#000000",
  ink: "#1a1a1a",
  gold: "#C7AE6A",
  goldDeep: "#b99a45",
  goldMid: "#d5c28f",
  cream: "#e3d6b4",
  sheen: "#F3EBB6",
  shade: "#8f7138",
  green: "#22c55e",
  bg: "#F4F0E8", // blanco roto
  bgDeep: "#E8E1D2",
};
const METAL = `linear-gradient(135deg, ${P.shade} 0%, ${P.gold} 28%, ${P.sheen} 50%, ${P.gold} 72%, ${P.shade} 100%)`;

const CARDS = ["Localización estratégica", "Constructora de renombre", "Amenities premium"];
const CARD = { w: 880, h: 124, ys: [330, 470, 610], cx: 540, cy: 470 };
const HOUSE_SCREEN_Y = 1010; // centro de la casa en pantalla (px)

// 1 unidad 3D = PXU px en el plano z = 0
const PXU = 168;
const FOV = 30;
const CAM_Z = 1920 / PXU / 2 / Math.tan((FOV / 2) * (Math.PI / 180));
const HOUSE_SCALE = 0.92;
const HOUSE_X = -0.3; // la casa se desplaza a la izquierda para dejar sitio a la flecha
const HOUSE_Y = -0.3 - 1.335 * HOUSE_SCALE; // la casa mide 2,67 de alto
const HOUSE_SCREEN_X = 540 + HOUSE_X * PXU;
const SLOT = {
  emoji: new THREE.Vector3(-1.85, 1.95, 0.5),
  bill: new THREE.Vector3(1.85, 2.3, 0.4),
  arrow: new THREE.Vector3(2.2, -0.55, 0.7),
};
const FROM = new THREE.Vector3(HOUSE_X, 0.95, 0.3); // de aquí salen: la parte alta de la casa

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// ---------- fondo ----------
const Fondo: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / CASA_FPS;
  const blob = (cx: number, cy: number, size: number, alpha: string, period: number, phase: number) => (
    <div
      style={{
        position: "absolute",
        left: cx + Math.sin((t / period) * Math.PI * 2 + phase) * 80 - size / 2,
        top: cy + Math.cos((t / period) * Math.PI * 2 + phase) * 100 - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(226,190,100,${alpha}) 0%, transparent 66%)`,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #F8F5EE 0%, ${P.bg} 55%, ${P.bgDeep} 100%)` }}>
      {blob(220, 420, 1200, "0.16", 11, 0)}
      {blob(880, 1350, 1100, "0.12", 9, 2)}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 48%, transparent 45%, rgba(120,98,52,0.16) 100%)" }} />
    </AbsoluteFill>
  );
};

// ---------- tarjetas y cuerpo fundido (2D) ----------
const Tarjeta: React.FC<{ i: number; merge: number }> = ({ i, merge }) => {
  const frame = useCurrentFrame();
  const enter = useEnter(Math.round(T.card[i] * CASA_FPS));
  const text = CARDS[i];
  const typed = Math.max(0, Math.floor(((frame - T.card[i] * CASA_FPS - 4) / CASA_FPS) * 90));
  const y = CARD.ys[i] + (CARD.cy - CARD.ys[i]) * merge;
  const scale = 1 - 0.16 * merge;
  const glow = smooth(0.2, 1, merge);
  return (
    <div
      style={{
        position: "absolute",
        left: CARD.cx - CARD.w / 2,
        top: y - CARD.h / 2,
        width: CARD.w,
        height: CARD.h,
        boxSizing: "border-box",
        borderRadius: 34,
        display: "flex",
        alignItems: "center",
        padding: "0 44px",
        background: "linear-gradient(180deg, rgba(70,58,32,0.96) 0%, rgba(26,26,26,0.97) 78%)",
        border: `1.5px solid rgba(199,174,106,${0.45 + 0.4 * glow})`,
        boxShadow: `0 20px 46px rgba(70,50,15,0.30), 0 0 ${30 + 90 * glow}px rgba(226,168,38,${0.12 + 0.5 * glow})`,
        backdropFilter: "blur(18px)",
        opacity: interpolate(enter, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }) * (1 - smooth(0.82, 1, merge)),
        transform: `translateY(${(1 - Math.min(enter, 1)) * -50}px) scale(${scale * (0.94 + 0.06 * Math.min(enter, 1))})`,
        filter: `blur(${(1 - Math.min(enter, 1)) * 8}px)`,
      }}
    >
      <div style={{ width: 8, height: 54, borderRadius: 4, background: METAL, marginRight: 30, flexShrink: 0 }} />
      <div
        style={{
          fontFamily: "Inter",
          fontWeight: 800,
          fontSize: 41,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: P.cream,
          whiteSpace: "nowrap",
          opacity: 1 - smooth(0.25, 0.7, merge),
        }}
      >
        {[...text].map((c, k) => (
          <span key={k} style={{ opacity: k < typed ? 1 : 0 }}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
};

const Cuerpo: React.FC<{ merge: number }> = ({ merge }) => {
  const frame = useCurrentFrame();
  const t = frame / CASA_FPS;
  const m = (frame / CASA_FPS - T.morph) / T.morphLen; // 0→1 durante la transformación
  const collapse = clamp01(m);
  const ease = Easing.in(Easing.cubic)(collapse);
  const show = smooth(0.62, 1, merge);
  const g = smooth(T.glowFrom, T.mergeTo + 0.2, t);
  const pulse = 0.85 + 0.15 * Math.sin(t * 7);
  const intensity = g * (collapse > 0 ? 1 + 1.4 * collapse : pulse);
  const x = CARD.cx + (HOUSE_SCREEN_X - CARD.cx) * ease;
  const y = CARD.cy + (HOUSE_SCREEN_Y - CARD.cy) * ease;
  const scale = (1 + 0.04 * g) * (1 - 0.78 * ease);
  const opacity = show * (1 - smooth(0.7, 1, collapse));
  if (opacity <= 0.001) return null;
  const sweep = ((t * 0.9) % 1.6) - 0.3; // brillo que cruza el cuerpo
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - 520,
          top: y - 330,
          width: 1040,
          height: 660,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, rgba(236,176,40,${0.55 * intensity}) 0%, rgba(226,190,100,${0.28 * intensity}) 38%, transparent 70%)`,
          opacity,
          transform: `scale(${scale})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - 300,
          top: y - 105,
          width: 600,
          height: 210,
          boxSizing: "border-box",
          padding: 7,
          borderRadius: 58,
          background: METAL,
          boxShadow: `0 0 ${60 + 110 * intensity}px rgba(226,168,38,${0.4 + 0.5 * Math.min(intensity, 1.4)}), 0 24px 50px rgba(70,50,15,0.25)`,
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 52,
            overflow: "hidden",
            background: `radial-gradient(ellipse at 50% 50%, rgba(243,235,182,${0.35 + 0.4 * intensity}) 0%, ${P.ink} 78%)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              bottom: -40,
              width: 140,
              left: `${sweep * 100}%`,
              transform: "skewX(-20deg)",
              background: "linear-gradient(90deg, transparent, rgba(255,246,210,0.55), transparent)",
            }}
          />
        </div>
      </div>
    </>
  );
};

const Destello: React.FC = () => {
  const t = useCurrentFrame() / CASA_FPS;
  const k = interpolate(t, [T.morph - 0.1, T.morph + 0.12, T.morph + 0.7], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (k <= 0.001) return null;
  const e = smooth(T.morph, T.morph + 0.6, t);
  const size = 300 + 800 * e;
  const ring = 240 + 1100 * e;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: HOUSE_SCREEN_X - size / 2,
          top: HOUSE_SCREEN_Y - size / 2,
          width: size,
          height: size,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,232,150,0.95) 0%, rgba(236,176,40,0.5) 34%, transparent 68%)",
          opacity: k,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: HOUSE_SCREEN_X - ring / 2,
          top: HOUSE_SCREEN_Y - ring / 2,
          width: ring,
          height: ring,
          borderRadius: "50%",
          border: "7px solid rgba(226,168,38,0.85)",
          boxSizing: "border-box",
          opacity: k * 0.8,
        }}
      />
    </>
  );
};

// ---------- 3D ----------
const useSpr = (startSec: number, damping = 11, stiffness = 120, mass = 0.6) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - startSec * fps, fps, config: { damping, stiffness, mass } });
};

// Geometrías suaves (esquinas redondeadas): mismo lenguaje de "icono 3D" que el emoji
const useRBox = (w: number, h: number, d: number, r: number) => useMemo(() => new RoundedBoxGeometry(w, h, d, 5, r), [w, h, d, r]);

const Entorno: React.FC = () => {
  const { gl, scene } = useThree();
  const [handle] = useState(() => delayRender("Entorno 3D"));
  useLayoutEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = tex;
    scene.environmentIntensity = 0.85;
    pm.dispose();
    continueRender(handle);
    return () => {
      scene.environment = null;
      tex.dispose();
    };
  }, [gl, scene, handle]);
  return null;
};

const Casa: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / CASA_FPS;
  const s = (d: number) => Math.max(0.0001, useSpr(T.morph + 0.12 + d));
  const base = s(0), walls = s(0.07), roof = useSpr(T.morph + 0.12 + 0.17), details = s(0.26), chim = s(0.32);
  const roofGeo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(-1.7, 0);
    sh.lineTo(1.7, 0);
    sh.lineTo(0, 1.1);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 2.05, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 8, curveSegments: 16 });
    g.translate(0, 0, -1.025);
    return g;
  }, []);
  const gWalls = useRBox(2.5, 1.55, 1.9, 0.16);
  const gDoor = useRBox(0.5, 1.0, 0.1, 0.04);
  const gDoorFrame = useRBox(0.64, 1.1, 0.07, 0.05);
  const gWinFrame = useRBox(0.86, 0.76, 0.07, 0.06);
  const gGlass = useRBox(0.68, 0.58, 0.08, 0.05);
  const gBar = useRBox(0.05, 0.6, 0.04, 0.015);
  const gBarH = useRBox(0.7, 0.05, 0.04, 0.015);
  const gChim = useRBox(0.34, 0.8, 0.34, 0.06);
  const gCap = useRBox(0.44, 0.09, 0.44, 0.04);
  const bob = Math.sin(t * 1.6) * 0.05;
  const ivory = { color: "#FBF7EC", roughness: 0.55, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.35 };
  const gold = { color: "#D2B56B", roughness: 0.28, metalness: 0.9, clearcoat: 0.25 };
  const charcoal = { color: "#262626", roughness: 0.4, metalness: 0.25, clearcoat: 0.5 };
  const glass = { color: "#24364a", roughness: 0.08, metalness: 0.25, clearcoat: 1, emissive: "#ffcf7a", emissiveIntensity: 0.32 };
  const Ventana: React.FC = () => (
    <group>
      <mesh geometry={gWinFrame} position={[0, 0, 0]}>
        <meshPhysicalMaterial {...gold} />
      </mesh>
      <mesh geometry={gGlass} position={[0, 0, 0.03]}>
        <meshPhysicalMaterial {...glass} />
      </mesh>
      <mesh geometry={gBar} position={[0, 0, 0.075]}>
        <meshPhysicalMaterial {...gold} />
      </mesh>
      <mesh geometry={gBarH} position={[0, 0, 0.075]}>
        <meshPhysicalMaterial {...gold} />
      </mesh>
    </group>
  );
  return (
    <group position={[HOUSE_X, HOUSE_Y + bob, 0]} scale={HOUSE_SCALE} rotation={[0.2, 0.55 + Math.sin(t * 0.7) * 0.1, 0]}>
      {/* plataforma redonda con aro dorado */}
      <group scale={base}>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[2.15, 2.2, 0.16, 72]} />
          <meshPhysicalMaterial {...charcoal} />
        </mesh>
        <mesh position={[0, 0.165, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.12, 0.035, 16, 96]} />
          <meshPhysicalMaterial {...gold} />
        </mesh>
      </group>
      {/* muros */}
      <group scale={walls} position={[0, 0.16 + 0.775, 0]}>
        <mesh geometry={gWalls}>
          <meshPhysicalMaterial {...ivory} />
        </mesh>
      </group>
      {/* tejado dorado */}
      <group position={[0, 1.71 + (1 - Math.min(roof, 1.2)) * 2.2, 0]} scale={Math.max(0.0001, Math.min(roof * 1.0, 1.15))}>
        <mesh geometry={roofGeo}>
          <meshPhysicalMaterial {...gold} />
        </mesh>
      </group>
      {/* puerta y ventanas */}
      <group scale={details}>
        <mesh geometry={gDoorFrame} position={[0.55, 0.16 + 0.55, 0.95]}>
          <meshPhysicalMaterial {...gold} />
        </mesh>
        <mesh geometry={gDoor} position={[0.55, 0.16 + 0.5, 0.985]}>
          <meshPhysicalMaterial {...charcoal} />
        </mesh>
        <mesh position={[0.69, 0.16 + 0.48, 1.04]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshPhysicalMaterial {...gold} />
        </mesh>
        <group position={[-0.62, 1.0, 0.95]}>
          <Ventana />
        </group>
        <group position={[1.25, 1.0, 0.1]} rotation={[0, Math.PI / 2, 0]}>
          <Ventana />
        </group>
      </group>
      {/* chimenea */}
      <group scale={chim} position={[0.85, 2.28, -0.35]}>
        <mesh geometry={gChim}>
          <meshPhysicalMaterial {...ivory} />
        </mesh>
        <mesh geometry={gCap} position={[0, 0.44, 0]}>
          <meshPhysicalMaterial {...gold} />
        </mesh>
      </group>
    </group>
  );
};

// Halo suave (sprite con degradado radial)
const useHalo = (rgb: string) =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, `rgba(${rgb},0.9)`);
    gr.addColorStop(0.4, `rgba(${rgb},0.35)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [rgb]);

const Halo: React.FC<{ rgb: string; size: number; opacity: number }> = ({ rgb, size, opacity }) => {
  const tex = useHalo(rgb);
  return (
    <sprite scale={[size, size, 1]}>
      <spriteMaterial map={tex} transparent opacity={opacity} depthWrite={false} blending={THREE.NormalBlending} />
    </sprite>
  );
};

// Salida desde la casa: arco con rebote hasta su sitio
const useSalida = (start: number, slot: THREE.Vector3) => {
  const frame = useCurrentFrame();
  const t = frame / CASA_FPS;
  const p = useSpr(start, 10, 110, 0.7);
  const arc = Math.sin(Math.PI * clamp01((t - start) / 0.55)) * 0.9;
  const pos = new THREE.Vector3().lerpVectors(FROM, slot, Math.min(p, 1.25));
  pos.y += arc;
  const alive = t >= start;
  return { p, pos, alive, tt: t - start };
};

const Chispas: React.FC<{ start: number; at: THREE.Vector3; rgb?: string }> = ({ start, at, rgb = "199,160,60" }) => {
  const t = useCurrentFrame() / CASA_FPS - start;
  if (t < 0 || t > 0.8) return null;
  const k = t / 0.8;
  const e = 1 - Math.pow(1 - k, 3);
  return (
    <group position={at.toArray()}>
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2 + i * 0.7;
        const d = (0.9 + (i % 3) * 0.35) * e;
        return (
          <mesh key={i} position={[Math.cos(a) * d, Math.sin(a) * d, 0.2]} scale={0.07 * (1 - k) + 0.001}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color={`rgb(${rgb})`} />
          </mesh>
        );
      })}
    </group>
  );
};

const Emoji: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / CASA_FPS;
  const { p, pos, alive, tt } = useSalida(T.emoji, SLOT.emoji);
  if (!alive) return null;
  const bob = Math.sin(t * 2.1) * 0.07;
  const spin = (1 - Math.min(p, 1)) * Math.PI * 2;
  return (
    <>
      <Chispas start={T.emoji} at={FROM} />
      <group position={[pos.x, pos.y + bob, pos.z]} rotation={[0, spin + Math.sin(t * 1.4) * 0.18, Math.sin(t * 1.7) * 0.06]} scale={Math.max(0.0001, p)}>
        <Halo rgb="236,190,70" size={3.2} opacity={0.38 * clamp01(tt * 2)} />
        <mesh>
          <sphereGeometry args={[0.62, 48, 48]} />
          <meshStandardMaterial color="#EDC454" roughness={0.3} metalness={0.1} emissive="#b99a45" emissiveIntensity={0.35} />
        </mesh>
        {/* gafas de sol */}
        <mesh position={[-0.215, 0.1, 0.5]} scale={[1, 0.82, 0.38]} rotation={[0.05, -0.2, 0]}>
          <sphereGeometry args={[0.215, 32, 24]} />
          <meshStandardMaterial color="#0b0b0b" roughness={0.12} metalness={0.5} />
        </mesh>
        <mesh position={[0.215, 0.1, 0.5]} scale={[1, 0.82, 0.38]} rotation={[0.05, 0.2, 0]}>
          <sphereGeometry args={[0.215, 32, 24]} />
          <meshStandardMaterial color="#0b0b0b" roughness={0.12} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.16, 0.57]}>
          <boxGeometry args={[0.2, 0.05, 0.05]} />
          <meshStandardMaterial color="#0b0b0b" roughness={0.3} />
        </mesh>
        <mesh position={[-0.46, 0.17, 0.4]} rotation={[0, 0.9, 0]}>
          <boxGeometry args={[0.04, 0.05, 0.3]} />
          <meshStandardMaterial color="#0b0b0b" roughness={0.3} />
        </mesh>
        <mesh position={[0.46, 0.17, 0.4]} rotation={[0, -0.9, 0]}>
          <boxGeometry args={[0.04, 0.05, 0.3]} />
          <meshStandardMaterial color="#0b0b0b" roughness={0.3} />
        </mesh>
        <mesh position={[-0.3, 0.2, 0.63]} scale={[1, 0.5, 0.3]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
        </mesh>
        {/* sonrisa */}
        <mesh position={[0, -0.08, 0.545]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.3, 0.04, 14, 40, Math.PI]} />
          <meshStandardMaterial color="#6b4a14" roughness={0.5} />
        </mesh>
      </group>
    </>
  );
};

const useBillTexture = () =>
  useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 464;
    const g = c.getContext("2d")!;
    const bg = g.createLinearGradient(0, 0, 1024, 464);
    bg.addColorStop(0, "#1c4b34");
    bg.addColorStop(0.5, "#2f7a52");
    bg.addColorStop(1, "#1c4b34");
    g.fillStyle = bg;
    g.fillRect(0, 0, 1024, 464);
    g.strokeStyle = "#e3d6b4";
    g.lineWidth = 8;
    g.strokeRect(26, 26, 972, 412);
    g.lineWidth = 3;
    g.strokeStyle = "rgba(227,214,180,0.7)";
    g.strokeRect(48, 48, 928, 368);
    for (let i = 0; i < 9; i++) {
      g.strokeStyle = "rgba(227,214,180,0.12)";
      g.beginPath();
      g.arc(512, 232, 90 + i * 22, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = "#1a1a1a";
    g.beginPath();
    g.arc(512, 232, 130, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#C7AE6A";
    g.lineWidth = 8;
    g.stroke();
    g.fillStyle = "#e3d6b4";
    g.font = "800 190px Inter, Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("$", 512, 246);
    g.font = "800 64px Inter, Arial, sans-serif";
    g.fillText("$", 120, 110);
    g.fillText("$", 904, 354);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);

const Billete: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / CASA_FPS;
  const { p, pos, alive, tt } = useSalida(T.bill, SLOT.bill);
  const tex = useBillTexture();
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.6, 0.72, 28, 4);
    const a = g.attributes.position;
    for (let i = 0; i < a.count; i++) a.setZ(i, 0.09 * Math.sin((a.getX(i) / 1.6) * Math.PI * 1.3));
    g.computeVertexNormals();
    return g;
  }, []);
  if (!alive) return null;
  const bob = Math.sin(t * 1.8 + 1) * 0.08;
  const spin = (1 - Math.min(p, 1)) * Math.PI * 2;
  return (
    <>
      <Chispas start={T.bill} at={FROM} rgb="199,150,40" />
      <group position={[pos.x, pos.y + bob, pos.z]} rotation={[0.15 + Math.sin(t * 1.2) * 0.1, spin - 0.25 + Math.sin(t * 1.1) * 0.2, 0.12 + Math.sin(t * 1.5) * 0.05]} scale={Math.max(0.0001, p)}>
        <Halo rgb="226,168,38" size={3.0} opacity={0.3 * clamp01(tt * 2)} />
        <mesh geometry={geo}>
          <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.55} metalness={0.05} />
        </mesh>
      </group>
    </>
  );
};

const Flecha: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / CASA_FPS;
  const p = useSpr(T.arrow, 9, 130, 0.7);
  const geo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 1.15);
    sh.lineTo(0.78, 0.2);
    sh.lineTo(0.3, 0.2);
    sh.lineTo(0.3, -1.0);
    sh.lineTo(-0.3, -1.0);
    sh.lineTo(-0.3, 0.2);
    sh.lineTo(-0.78, 0.2);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.28, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 4 });
    g.translate(0, 0, -0.14);
    return g;
  }, []);
  if (t < T.arrow) return null;
  // palpitación tipo latido: dos pulsos seguidos
  const ph = ((t - T.arrow - 0.45) * 1.55) % 1;
  const beat = t < T.arrow + 0.45 ? 0 : Math.exp(-Math.pow((ph - 0.0) / 0.07, 2)) + 0.65 * Math.exp(-Math.pow((ph - 0.24) / 0.07, 2));
  const k = Math.max(0.0001, Math.min(p, 1.2)) * (1 + 0.16 * beat);
  return (
    <>
      <Chispas start={T.arrow} at={SLOT.arrow} rgb="60,190,110" />
      <group position={[SLOT.arrow.x, SLOT.arrow.y + Math.sin(t * 1.9) * 0.06, SLOT.arrow.z]} rotation={[0.1, -0.35 + Math.sin(t * 1.2) * 0.08, 0]} scale={0.62 * k}>
        <Halo rgb="34,197,94" size={3.0 + 0.9 * beat} opacity={0.32 + 0.3 * beat} />
        <mesh geometry={geo}>
          <meshStandardMaterial color={P.green} roughness={0.28} metalness={0.1} emissive="#16a34a" emissiveIntensity={0.55 + 0.7 * beat} />
        </mesh>
      </group>
    </>
  );
};

const Escena3D: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / CASA_FPS;
  const { width, height } = useVideoConfig();
  const cam = CAM_Z - 0.6 * (t / 11.6);
  return (
    <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, cam], fov: FOV, near: 0.1, far: 200 }}>
      <Entorno />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 10]} intensity={2.2} color="#fff3d8" />
      <directionalLight position={[-6, 4, -4]} intensity={0.9} color="#e8d6a0" />
      <Casa />
      <Emoji />
      <Billete />
      <Flecha />
    </ThreeCanvas>
  );
};

// ---------- composición ----------
export const CasaPlusvalia: React.FC = () => {
  useKitFonts();
  const t = useCurrentFrame() / CASA_FPS;
  const merge = Easing.inOut(Easing.cubic)(clamp01((t - T.mergeFrom) / (T.mergeTo - T.mergeFrom)));
  // sombra de contacto bajo la casa
  const sombra = smooth(T.morph + 0.15, T.morph + 0.7, t);
  return (
    <AbsoluteFill style={{ background: P.bg }}>
      <Audio src={staticFile("audio/casa_plusvalia.m4a")} />
      <Fondo />
      <div
        style={{
          position: "absolute",
          left: HOUSE_SCREEN_X - 380,
          top: 960 - HOUSE_Y * PXU - 60,
          width: 760,
          height: 150,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(90,66,24,0.34) 0%, rgba(90,66,24,0) 70%)",
          opacity: sombra,
        }}
      />
      <Escena3D />
      {CARDS.map((_, i) => (
        <Tarjeta key={i} i={i} merge={merge} />
      ))}
      <Cuerpo merge={merge} />
      <Destello />
    </AbsoluteFill>
  );
};
