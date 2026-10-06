"""Comprobación objetiva del modelo: vista cenital ortográfica superpuesta a la imagen del plano.

    python tools/unidad/check_plan.py tipo101 --plan plano_recortado.png --crop 16,12,668,559 --out comprobacion.png
--crop = (x0,y0,x1,y1) en píxeles del plano que abarca el apartamento. Requiere bpy + pillow en el mismo entorno.
Los muros del modelo (gris) deben coincidir con los del plano (negro). Revisar sobre todo baños, tabiques y huecos.
"""
import argparse, importlib, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
ap = argparse.ArgumentParser(); ap.add_argument("spec"); ap.add_argument("--plan", required=True); ap.add_argument("--crop", required=True); ap.add_argument("--out", required=True)
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
import bpy
from PIL import Image
spec = importlib.import_module("specs." + a.spec); spec.build()
for o in bpy.data.objects:                                           # sin techo ni luces LED: se ven los muros desde arriba
    if o.name.startswith(("techo", "ledlinea", "lama_balcon")): o.hide_render = True
x0, y0, x1, y1 = (int(v) for v in a.crop.split(","))
S = bpy.context.scene; S.render.engine = 'CYCLES'; S.cycles.device = 'CPU'; S.cycles.samples = 16; S.cycles.use_denoising = False; S.view_settings.view_transform = 'Standard'
W_m, L_m = (x1 - x0) * spec.K, (y1 - y0) * spec.K; PPM = 100                                   # 100 px por metro en la comprobación
S.render.resolution_x, S.render.resolution_y = int(W_m * PPM) + 40, int(L_m * PPM) + 40
cx, cy = (spec.mx(x0) + spec.mx(x1)) / 2, (spec.my(y0) + spec.my(y1)) / 2
bpy.ops.object.camera_add(location=(cx, cy, 30)); c = bpy.context.active_object; c.data.type = 'ORTHO'; c.data.ortho_scale = S.render.resolution_x / PPM; S.camera = c
S.render.filepath = a.out + ".top.png"; bpy.ops.render.render(write_still=True)
top = Image.open(a.out + ".top.png").convert("RGB"); plan = Image.open(a.plan).convert("RGB").crop((x0, y0, x1, y1))
f = PPM * spec.K; plan = plan.resize((round(plan.width * f), round(plan.height * f)))
canvas = Image.new("RGB", top.size, (0, 0, 0)); canvas.paste(plan, ((top.width - plan.width) // 2, (top.height - plan.height) // 2))
Image.blend(canvas, top, 0.5).save(a.out); os.remove(a.out + ".top.png"); print("comprobación guardada en", a.out)
