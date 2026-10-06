"""Renderiza el recorrido de cámara de una unidad con Cycles (CPU). Se ejecuta con el Python que tiene bpy.

    python tools/unidad/walkthrough.py frames tipo101 --out work/tipo101            # fotogramas a 12 fps
    python tools/unidad/walkthrough.py mids   tipo101 --out work/tipo101            # intermedios reales en los giros rápidos
Opciones: --samples 16  --res 576x1024  --frames A:B (solo ese rango, para pruebas)
Cada fotograma tarda ~30 s con 4 núcleos. Luego: python tools/unidad/assemble_walk.py --out work/tipo101 --video public/tour/tipo101.mp4
"""
import argparse, importlib, math, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
ap = argparse.ArgumentParser(); ap.add_argument("mode", choices=["frames", "mids"]); ap.add_argument("spec"); ap.add_argument("--out", required=True)
ap.add_argument("--samples", type=int, default=16); ap.add_argument("--res", default="576x1024"); ap.add_argument("--frames", default="")
args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
import bpy
from mathutils import Vector
spec = importlib.import_module("specs." + args.spec); spec.build()
S = bpy.context.scene; mx, my, KN, FPS = spec.mx, spec.my, spec.WALK_KNOTS, 12
S.render.engine = 'CYCLES'; S.cycles.device = 'CPU'; S.cycles.samples = args.samples; S.cycles.use_denoising = True
S.cycles.adaptive_threshold = 0.06; S.cycles.adaptive_min_samples = 4; S.cycles.max_bounces = 5; S.cycles.diffuse_bounces = 3
S.cycles.glossy_bounces = 3; S.cycles.transmission_bounces = 4; S.cycles.sample_clamp_indirect = 4.0
try: S.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
S.render.resolution_x, S.render.resolution_y = (int(v) for v in args.res.split("x")); S.render.image_settings.compression = 3
S.view_settings.view_transform = 'AgX'; S.view_settings.look = 'AgX - Medium High Contrast'; S.view_settings.exposure = 0.0
bpy.ops.object.camera_add(); cam = bpy.context.active_object; cam.data.lens = 18; cam.data.sensor_fit = 'HORIZONTAL'; cam.data.sensor_width = 36; S.camera = cam

def cr(p0, p1, p2, p3, u):
    return tuple(0.5 * ((2*b) + (-a+c)*u + (2*a-5*b+4*c-d)*u*u + (-a+3*b-3*c+d)*u**3) for a, b, c, d in zip(p0, p1, p2, p3))
def at(t):                                   # posición y objetivo (px) en el instante t, con Catmull-Rom y arranque/parada suaves
    t = max(0, min(KN[-1][0], t)); i = 0
    while i < len(KN) - 2 and t > KN[i+1][0]: i += 1
    u = (t - KN[i][0]) / (KN[i+1][0] - KN[i][0]); u = u*u*(3-2*u) * 0.35 + u * 0.65
    g = lambda j, k: KN[min(max(j, 0), len(KN)-1)][k]
    return [cr(g(i-1, k), g(i, k), g(i+1, k), g(i+2, k), u) for k in (1, 2)]
def yaw(t):
    p, g = at(t); return math.degrees(math.atan2(-(g[1]-p[1]), g[0]-p[0]))

total = int(KN[-1][0] * FPS)
A, B = (int(v) for v in args.frames.split(":")) if args.frames else (0, total + 1)
if args.mode == "frames": todo = [(f, f / FPS, "frames", "f") for f in range(A, min(B, total + 1))]
else:                                         # intermedios solo donde la cámara gira > 3° por fotograma o avanza > 0,22 m
    sel = []
    for f in range(total):
        dy = abs((yaw((f+1)/FPS) - yaw(f/FPS) + 180) % 360 - 180); (pa, _), (pb, _) = at(f/FPS), at((f+1)/FPS)
        if dy > 3 or math.hypot(pb[0]-pa[0], pb[1]-pa[1]) * spec.K > 0.22: sel.append(f)
    todo = [(f, (f + 0.5) / FPS, "mids", "m") for f in sel if A <= f < B]
for (f, t, sub, pre) in todo:
    path = os.path.join(args.out, sub, f"{pre}_{f:04d}.png")
    if os.path.exists(path): continue
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pos, tgt = at(t); bob = 0.012 * math.sin(t * 2 * math.pi * 1.6)           # leve balanceo de caminar
    loc = Vector((mx(pos[0]), my(pos[1]), 1.55 + bob)); look = Vector((mx(tgt[0]), my(tgt[1]), 1.25))
    cam.location = loc; cam.rotation_euler = (look - loc).to_track_quat('-Z', 'Y').to_euler()
    S.render.filepath = path; t0 = time.time(); bpy.ops.render.render(write_still=True); print(f"{sub} {f}/{total} {time.time()-t0:.0f}s", flush=True)
print("FIN", flush=True)
