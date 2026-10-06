import bpy, sys, os, math, time
sys.path.insert(0, "/tmp/claude-0/-home-user-claude-instagram-/16f988dd-8ad8-54a3-b130-a3272d5d802c/scratchpad/apto")
import scene2 as sc2
from mathutils import Vector
args = sys.argv[sys.argv.index("--")+1:]; F0, F1, SAMPLES, OUT = int(args[0]), int(args[1]), int(args[2]), args[3]
FPS = 12
sc2.build_all(); S = bpy.context.scene; mx, my = sc2.mx, sc2.my
S.render.engine = 'CYCLES'; S.cycles.device = 'CPU'; S.cycles.samples = SAMPLES; S.cycles.use_denoising = True; S.cycles.adaptive_threshold = 0.06; S.cycles.adaptive_min_samples = 4
S.cycles.max_bounces = 5; S.cycles.diffuse_bounces = 3; S.cycles.glossy_bounces = 3; S.cycles.transmission_bounces = 4; S.cycles.sample_clamp_indirect = 4.0
try: S.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
S.render.resolution_x, S.render.resolution_y = 576, 1024; S.render.image_settings.file_format = 'PNG'; S.render.image_settings.compression = 3
S.view_settings.view_transform = 'AgX'; S.view_settings.look = 'AgX - Medium High Contrast'; S.view_settings.exposure = 0.0
bpy.ops.object.camera_add(); cam = bpy.context.active_object; cam.data.lens = 18; cam.data.sensor_fit = 'HORIZONTAL'; cam.data.sensor_width = 36; S.camera = cam
# (segundo, posición px, objetivo px)
KN = [(0.0, (640, 30), (640, 150)), (2.0, (640, 100), (580, 230)), (3.5, (590, 160), (470, 270)), (5.0, (565, 215), (410, 330)),
      (6.5, (545, 290), (440, 360)), (8.0, (540, 380), (540, 520)), (9.3, (540, 455), (520, 545)), (10.6, (545, 478), (430, 505)),
      (12.0, (545, 420), (500, 250)), (12.8, (520, 300), (440, 200)), (13.4, (470, 190), (380, 175)), (14.0, (380, 170), (320, 215)),
      (14.6, (330, 230), (318, 330)), (15.4, (320, 330), (318, 410)), (16.2, (322, 400), (225, 470))]
def cr(p0, p1, p2, p3, u):
    return tuple(0.5*((2*b) + (-a+c)*u + (2*a-5*b+4*c-d)*u*u + (-a+3*b-3*c+d)*u**3) for a, b, c, d in zip(p0, p1, p2, p3))
def at(t):
    t = max(0, min(KN[-1][0], t)); i = 0
    while i < len(KN)-2 and t > KN[i+1][0]: i += 1
    u = (t - KN[i][0]) / (KN[i+1][0] - KN[i][0]); u = u*u*(3-2*u) * 0.35 + u * 0.65         # arranque y parada suaves
    g = lambda j, k: KN[min(max(j, 0), len(KN)-1)][k]
    return [cr(g(i-1, k), g(i, k), g(i+1, k), g(i+2, k), u) for k in (1, 2)]
os.makedirs(OUT, exist_ok=True); total = int(KN[-1][0]*FPS)
for f in range(F0, min(F1, total+1)):
    path = f"{OUT}/f_{f:04d}.png"
    if os.path.exists(path): continue
    pos, tgt = at(f / FPS)
    bob = 0.012 * math.sin(f / FPS * 2 * math.pi * 1.6)                                   # leve balanceo de caminar
    loc = Vector((mx(pos[0]), my(pos[1]), 1.55 + bob)); look = Vector((mx(tgt[0]), my(tgt[1]), 1.25))
    cam.location = loc; cam.rotation_euler = (look - loc).to_track_quat('-Z', 'Y').to_euler()
    S.render.filepath = path; t = time.time(); bpy.ops.render.render(write_still=True); print(f"FRAME {f}/{total} {time.time()-t:.0f}s", flush=True)
print("FIN", flush=True)
