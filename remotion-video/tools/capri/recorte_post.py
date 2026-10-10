"""Paso final del recorte de CAPRI: suavizado temporal del alfa de ViTMatte (solo donde es estable), estimación del color de primer plano
(pymatting, quita el borde oscuro del fondo en el pelo), corte contra la mesa con borde suave y escritura de public/recorte_hq/m_NNNN.webp.
Uso: python tools/capri/recorte_post.py [desde hasta] [nº procesos]"""
import os, sys
import numpy as np, cv2
from PIL import Image
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(__file__))
from fondo import mesa, CUT1, CUT2
A, B = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (290, 1049)
NP = int(sys.argv[3]) if len(sys.argv) > 3 else 3
os.makedirs("public/recorte_hq", exist_ok=True)
def escena(k): return 0 if k < CUT1 else 1 if k < CUT2 else 2
def leer(k): return cv2.imread(f"out/vt/{k:04d}.png", 0).astype(np.float32) / 255
def hacer(k):
    from pymatting import estimate_foreground_ml
    a = leer(k)
    ws, acc = 0.5, 0.5 * a
    for j in (k - 1, k + 1):
        if A <= j <= B and escena(j) == escena(k):
            aj = leer(j)
            w = np.where(np.abs(aj - a) < 0.3, 0.25, 0.0).astype(np.float32)
            acc += w * aj; ws = ws + w
    a = acc / ws
    T = mesa(k)
    a[T:, :] = 0
    y = np.arange(a.shape[0])[:, None]
    a *= np.clip((T - y) / 12.0, 0, 1)
    im = cv2.cvtColor(cv2.imread(f"out/e_all/f_{k:04d}.jpg"), cv2.COLOR_BGR2RGB).astype(np.float64) / 255
    ys, xs = np.where(a > 0.01)
    rgba = np.zeros((a.shape[0], a.shape[1], 4), np.uint8)
    if len(ys):
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        F = estimate_foreground_ml(im[y0:y1, x0:x1], a[y0:y1, x0:x1].astype(np.float64))
        rgba[y0:y1, x0:x1, :3] = (np.clip(F, 0, 1) * 255).astype(np.uint8)
    rgba[..., 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(f"public/recorte_hq/m_{k:04d}.webp", quality=92, method=4, alpha_quality=100)
    return k
if __name__ == "__main__":
    ks = [k for k in range(A, B + 1) if os.path.exists(f"out/vt/{k:04d}.png")]
    with Pool(NP) as p:
        for i, k in enumerate(p.imap_unordered(hacer, ks)):
            if i % 50 == 0: print(i, k, flush=True)
    print("POST_DONE", len(ks), flush=True)
