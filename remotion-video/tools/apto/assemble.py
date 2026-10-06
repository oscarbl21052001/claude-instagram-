import os, numpy as np
from PIL import Image
D = "/tmp/claude-0/-home-user-claude-instagram-/16f988dd-8ad8-54a3-b130-a3272d5d802c/scratchpad/apto/"
os.makedirs(D + "seq", exist_ok=True)
n = len([f for f in os.listdir(D + "walk") if f.startswith("f_")])
load = lambda p: np.asarray(Image.open(p).convert("RGB"), np.float32)
mids = 0
for i in range(n):
    a = load(D + f"walk/f_{i:04d}.png"); Image.fromarray(a.astype(np.uint8)).save(D + f"seq/s_{2*i:04d}.png")
    if i == n - 1: break
    m = D + f"walk_mid/m_{i:04d}.png"
    if os.path.exists(m): out = load(m); mids += 1
    else: out = 0.5 * (a + load(D + f"walk/f_{i+1:04d}.png"))          # cámara lenta: mezclar dos vecinos equivale al intermedio
    Image.fromarray(out.astype(np.uint8)).save(D + f"seq/s_{2*i+1:04d}.png")
print("fotogramas originales", n, "| intermedios reales", mids, "| mezclados", n - 1 - mids)
