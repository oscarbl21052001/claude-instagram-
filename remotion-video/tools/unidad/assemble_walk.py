"""Une fotogramas (12 fps) e intermedios en un vídeo a 24 fps, 1080x1920, con 2 s finales fijos.

    python tools/unidad/assemble_walk.py --out work/tipo101 --video public/tour/tipo101.mp4
Requiere: pip install pillow numpy, y ffmpeg. En los intervalos sin intermedio real se mezclan los dos fotogramas vecinos
(correcto cuando la cámara va lenta). No usar ffmpeg minterpolate: deforma la imagen en los giros.
"""
import argparse, os, subprocess
import numpy as np
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument("--out", required=True); ap.add_argument("--video", required=True); a = ap.parse_args()
fr, mi, seq = (os.path.join(a.out, d) for d in ("frames", "mids", "seq")); os.makedirs(seq, exist_ok=True)
n = len([f for f in os.listdir(fr) if f.startswith("f_")]); load = lambda p: np.asarray(Image.open(p).convert("RGB"), np.float32); real = 0
for i in range(n):
    cur = load(os.path.join(fr, f"f_{i:04d}.png")); Image.fromarray(cur.astype(np.uint8)).save(os.path.join(seq, f"s_{2*i:04d}.png"))
    if i == n - 1: break
    m = os.path.join(mi, f"m_{i:04d}.png")
    if os.path.exists(m): out = load(m); real += 1
    else: out = 0.5 * (cur + load(os.path.join(fr, f"f_{i+1:04d}.png")))
    Image.fromarray(out.astype(np.uint8)).save(os.path.join(seq, f"s_{2*i+1:04d}.png"))
print(f"fotogramas {n} | intermedios reales {real} | mezclados {n-1-real}")
os.makedirs(os.path.dirname(os.path.abspath(a.video)), exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "24", "-i", os.path.join(seq, "s_%04d.png"), "-vf",
    "scale=1080:1920:flags=lanczos,unsharp=5:5:0.6:5:5:0.0,tpad=stop_mode=clone:stop_duration=2,format=yuv420p",
    "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-movflags", "+faststart", a.video], check=True)
print("vídeo:", a.video)
