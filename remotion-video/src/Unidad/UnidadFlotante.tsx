import { ThreeCanvas } from "@remotion/three";
import { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Background, colors, fonts, GlassCard, Headline, motion, safe, Tag, useKitFonts } from "../kit";

// La unidad flota en el centro, gira sobre sí misma y al final se inclina hacia adelante:
// el techo se levanta y se ve la distribución desde arriba.
export const UNIDAD_FPS = 30;
export const UNIDAD_DURATION = 270;

const W = 1080, H = 1920;
const FOV = 22, CAM_D = 66;
const PX = 56.5, X0 = 16, Y0 = 559;                        // escala del plano (px → m)
const plan = (px: number, py: number) => new THREE.Vector3((px - X0) / PX, 0.05, -((Y0 - py) / PX));
const CENTER = new THREE.Vector3(11.5 / 2, 1.4, -7.5 / 2 - 0.3);

const ROOMS = [
  { name: "Salón y cocina", area: "23,37 m²", at: plan(520, 330) },
  { name: "Balcón", area: "6,44 m²", at: plan(524, 510) },
  { name: "Suite B", area: "12,45 m²", at: plan(285, 470) },
  { name: "Suite A", area: "14,22 m²", at: plan(105, 425) },
];

const ease = Easing.bezier(...motion.expoOut);
const inOut = Easing.inOut(Easing.cubic);

const useModel = () => {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [handle] = useState(() => delayRender("Cargando modelo 3D"));
  useEffect(() => {
    new GLTFLoader().load(staticFile("models/unidad_tipo101.glb"), (g) => {
      g.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (o.name === "TECHO") { m.material = mat.clone(); (m.material as THREE.MeshStandardMaterial).transparent = true; }
        }
      });
      setModel(g.scene);
      continueRender(handle);
    });
  }, [handle]);
  return model;
};

export const UnidadFlotante: React.FC = () => {
  useKitFonts();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const model = useModel();

  // --- línea de tiempo ---
  const enter = spring({ frame, fps, config: motion.spring, durationInFrames: 40 });
  const yaw = interpolate(frame, [0, 165], [-0.8, 0], { easing: Easing.out(Easing.cubic), extrapolateRight: "clamp" });
  const pitch = interpolate(frame, [150, 232], [0.05, 1.12], { easing: inOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const floatY = 0.16 * Math.sin((frame / fps) * Math.PI * 1.1) * interpolate(frame, [150, 232], [1, 0.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(enter, [0, 1], [0.72, 1]);
  const lift = interpolate(frame, [138, 196], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const camY = interpolate(frame, [0, 232], [9, 17], { easing: inOut, extrapolateRight: "clamp" });

  useEffect(() => {
    if (!model) return;
    const techo = model.getObjectByName("TECHO");
    if (techo) {
      techo.position.y = lift * 3.2;
      const mat = (techo as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.opacity = 1 - lift;
      techo.visible = lift < 0.98;
    }
  }, [model, lift]);

  // --- proyección de las etiquetas (misma cámara y transformación que la escena) ---
  const labels = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 400);
    cam.position.set(0, camY, CAM_D);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(0, floatY, 0),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, "XYZ")),
      new THREE.Vector3(scale, scale, scale),
    );
    return ROOMS.map((r) => {
      const p = r.at.clone().sub(CENTER).applyMatrix4(m).project(cam);
      return { ...r, x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H };
    });
  }, [camY, floatY, pitch, yaw, scale]);

  const labelOpacity = interpolate(frame, [222, 246], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = interpolate(frame, [150, 232], [0.55, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Background />
      {/* resplandor bajo la unidad */}
      <div style={{ position: "absolute", left: W / 2 - 520, top: 1180, width: 1040, height: 220, borderRadius: "50%", background: `radial-gradient(ellipse, ${colors.accent}${Math.round(glow * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)` }} />

      <ThreeCanvas width={width} height={height} shadows camera={{ position: [0, camY, CAM_D], fov: FOV, near: 0.1, far: 400 }}>
        <hemisphereLight args={["#ffffff", "#7d7a99", 1.5]} />
        <directionalLight position={[7, 16, 14]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={1} shadow-camera-far={60} shadow-bias={-0.0004} />
        <directionalLight position={[-8, 6, -6]} intensity={0.7} />
        {model ? (
          <group position={[0, floatY, 0]} rotation={[pitch, yaw, 0, "XYZ"]} scale={scale}>
            <primitive object={model} position={[-CENTER.x, -CENTER.y, -CENTER.z]} />
          </group>
        ) : null}
      </ThreeCanvas>

      {/* título */}
      <div style={{ position: "absolute", left: safe.side, top: safe.top - 40, opacity: interpolate(frame, [4, 24], [0, 1], { extrapolateRight: "clamp" }) }}>
        <Tag text="Unidad tipo" delay={4} />
        <div style={{ marginTop: 26 }}>
          <Headline lines={["80 M²", "2 SUITES"]} delay={10} gradientLine={1} size={150} />
        </div>
      </div>

      {/* etiquetas de ambientes */}
      {labels.map((l, i) => (
        <div key={l.name} style={{ position: "absolute", left: l.x, top: l.y, transform: "translate(-50%, -50%)", opacity: labelOpacity }}>
          <GlassCard delay={222 + i * 4} style={{ padding: "16px 24px", background: "rgba(8,8,12,0.72)", border: "1.5px solid rgba(255,255,255,0.16)" }}>
            <div style={{ fontFamily: fonts.body, fontWeight: 800, fontSize: 21, letterSpacing: 2.5, textTransform: "uppercase", color: colors.accentSoft, whiteSpace: "nowrap" }}>{l.name}</div>
            <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 40, color: colors.fg, lineHeight: 1.05, whiteSpace: "nowrap" }}>{l.area}</div>
          </GlassCard>
        </div>
      ))}

      <div style={{ position: "absolute", left: safe.side, right: safe.side, top: 1560, textAlign: "center", fontFamily: fonts.body, fontWeight: 500, fontSize: 26, color: "rgba(255,255,255,0.7)", opacity: labelOpacity }}>
        Recreación 3D ilustrativa. Medidas aproximadas.
      </div>
    </AbsoluteFill>
  );
};
