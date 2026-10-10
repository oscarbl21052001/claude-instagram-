"""Fondo difuminado claro y camel para CAPRI, fotograma a fotograma, y limpieza del recorte de ella.
- El recorte (public/recorte_edit/) se corta en el borde superior de la mesa (la taza y el móvil son parte de la mesa) con un borde suave.
- Fondo = el fotograma real SIN ella (desenfoque normalizado: los píxeles de ella no cuentan), desenfoque moderado para que se vean la mesa y sus
  elementos, y corrección a tonos camel claros (el panel azul oscuro pasa a camel medio).
Uso: python tools/capri/fondo.py [desde hasta]   (fotogramas 290..1049; escribe public/edit_bg/b_NNNN.jpg y reescribe los recortes)."""
import sys, os, cv2, numpy as np
from PIL import Image
os.makedirs("public/edit_bg", exist_ok=True)
SIGMA = 18
CUT1, CUT2 = 314, 635
def mesa(k):  # fila donde empieza la mesa (borde superior), por escena
    return 1678 if k < CUT1 else 1758 if k < CUT2 else 1632   # en las escenas 2 y 3 la taza asoma sobre el borde de la mesa y tapa su cuerpo: se corta por su borde superior
def mesa_borde(k):  # borde superior real de la mesa
    return 1678 if k < CUT1 else 1795 if k < CUT2 else 1665
# rampa camel: luminancia -> color (RGB)
STOPS = [(0.0, (128, 94, 60)), (0.25, (178, 130, 84)), (0.5, (212, 168, 114)), (0.78, (236, 211, 170)), (1.0, (250, 239, 216))]
def camel(L):
    xs = [s[0] for s in STOPS]
    return np.dstack([np.interp(L, xs, [s[1][c] for s in STOPS]) for c in range(3)])
def procesar(k, guardar_recorte=True):
    im = cv2.imread(f"out/e_all/f_{k:04d}.jpg")
    h, w = im.shape[:2]
    rgba = np.asarray(Image.open(f"public/recorte_edit/m_{k:04d}.webp").convert("RGBA")).copy()
    a = rgba[..., 3].astype(np.float32) / 255
    T = mesa(k)
    a[T:, :] = 0
    # borde suave contra la mesa (12 px)
    y = np.arange(h)[:, None]
    a *= np.clip((T - y) / 12.0, 0, 1)
    rgba[..., 3] = (a * 255).astype(np.uint8)
    if guardar_recorte:
        Image.fromarray(rgba, "RGBA").save(f"public/recorte_edit/m_{k:04d}.webp", quality=90, method=4)
    P = cv2.dilate((a > 0.03).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))).astype(np.float32)
    if k >= CUT1:
        P[T:mesa_borde(k) + 1, :] = 1            # banda de la taza/mesa: se rellena con lo de alrededor
    wgt = 1 - P
    f = im.astype(np.float32)
    def nblur(s):
        num = cv2.GaussianBlur(f * wgt[..., None], (0, 0), s); den = cv2.GaussianBlur(wgt, (0, 0), s)
        return num / np.maximum(den[..., None], 1e-4), den
    b1, d1 = nblur(SIGMA)
    b2, _ = nblur(70)
    t = np.clip(d1 / 0.25, 0, 1)[..., None]
    bg = b1 * t + b2 * (1 - t)
    # camel claro: luminancia del fondo real -> rampa camel, algo de color original para que no quede plano
    L = np.clip((0.114 * bg[..., 0] + 0.587 * bg[..., 1] + 0.299 * bg[..., 2]) / 255, 0, 1)
    L = np.clip(L ** 0.66 * 1.1, 0, 1)
    c = camel(L)[..., ::-1]                         # a BGR
    warm = np.clip((bg[..., 2] - bg[..., 0]) / 60, 0, 1)[..., None]      # las zonas cálidas (mesa, paredes) conservan más color real; el panel azul no
    mw = 0.1 + 0.4 * warm
    out = np.clip((1 - mw) * c + mw * bg, 0, 255).astype(np.uint8)
    cv2.imwrite(f"public/edit_bg/b_{k:04d}.jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 92])
if __name__ == "__main__":
    a, b = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (290, 1049)
    for k in range(a, b + 1):
        procesar(k)
        if k % 50 == 0: print(k, flush=True)
