"""Fondo para CAPRI, fotograma a fotograma: desenfoque PROGRESIVO (real abajo, difuminado camel claro arriba).
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
    return 1678 if k < CUT1 else 1758 if k < CUT2 else 1632 if k < 1050 else 10 ** 5   # (escena 4: sin mesa) en las escenas 2 y 3 la taza asoma sobre el borde de la mesa y tapa su cuerpo: se corta por su borde superior
def mesa_borde(k):  # borde superior real de la mesa
    return 1678 if k < CUT1 else 1795 if k < CUT2 else 1665
# rampa camel: luminancia -> color (RGB)
STOPS = [(0.0, (128, 94, 60)), (0.25, (178, 130, 84)), (0.5, (212, 168, 114)), (0.78, (236, 211, 170)), (1.0, (250, 239, 216))]
def camel(L):
    xs = [s[0] for s in STOPS]
    return np.dstack([np.interp(L, xs, [s[1][c] for s in STOPS]) for c in range(3)])
def limpio(h, w):
    """Campo camel claro liso (BGR): más claro arriba y en el centro, camel medio hacia la franja de transición; con un poco de ruido para que el JPG no haga bandas."""
    ycoord = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    top, mid = np.array([152, 196, 226], np.float32), np.array([118, 166, 206], np.float32)       # BGR de #E2C498 y #CEA676
    t = np.clip(ycoord / (Y0 / h), 0, 1)
    col = top + (mid - top) * t[..., None] if False else (top[None, None, :] * (1 - t[..., None]) + mid[None, None, :] * t[..., None])
    xx = np.linspace(-1, 1, w, dtype=np.float32)[None, :]
    centro = 1 + 0.05 * np.clip(1 - xx ** 2, 0, 1)                    # centro algo más claro
    f = col * centro[..., None]
    rng = np.random.default_rng(1)
    f = f + rng.normal(0, 1.1, size=f.shape).astype(np.float32)
    return np.clip(f, 0, 255)
Y0, Y1 = 660, 1230      # franja de transición en coordenadas del vídeo: arriba muy borroso y camel, abajo el fondo real (con el encuadre ×1,16 queda hacia la mitad de la pantalla)
NIVELES = [0, 4, 8, 13, 18]
def procesar(k, guardar_recorte=False):
    """Fondo con desenfoque PROGRESIVO: nítido (original) por debajo de Y1, desenfoque creciente hasta σ=18 en Y0 y el tono camel entrando poco a poco.
    Los píxeles de ella no cuentan en el desenfoque (normalizado), así no se mancha el fondo con su color."""
    im = cv2.imread(f"out/e_all/f_{k:04d}.jpg")
    h, w = im.shape[:2]
    a = np.asarray(Image.open(f"public/recorte_hq/m_{k:04d}.webp").convert("RGBA"))[..., 3].astype(np.float32) / 255
    P = cv2.dilate((a > 0.03).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))).astype(np.float32)
    wgt = 1 - P
    f = im.astype(np.float32)
    # reserva muy borrosa (1/4 de resolución) para lo que queda bajo ella
    sm = cv2.resize(f, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA); ws = cv2.resize(wgt, (sm.shape[1], sm.shape[0]), interpolation=cv2.INTER_AREA)
    fb = cv2.GaussianBlur(sm * ws[..., None], (0, 0), 70 / 4) / np.maximum(cv2.GaussianBlur(ws, (0, 0), 70 / 4)[..., None], 1e-4)
    fallback = cv2.resize(fb, (w, h), interpolation=cv2.INTER_CUBIC)
    prev = fallback
    levels = {}
    for sg in reversed(NIVELES[1:]):          # del más borroso al menos: cada nivel usa el siguiente como reserva
        num = cv2.GaussianBlur(f * wgt[..., None], (0, 0), sg); den = cv2.GaussianBlur(wgt, (0, 0), sg)
        t = np.clip(den / 0.25, 0, 1)[..., None]
        prev = num / np.maximum(den[..., None], 1e-4) * t + prev * (1 - t)
        levels[sg] = prev
    # nivel 0 = fotograma real SIN ella (sustituida por el fondo de alrededor): así, cuando el fondo se desenfoca o se amplía, no queda una copia borrosa de ella
    # asomando bajo su recorte nítido. Anillo de 7 px (menor que el de los niveles borrosos) para que el borde se vea natural.
    P7 = cv2.dilate((a > 0.03).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))).astype(np.float32)
    P7 = cv2.GaussianBlur(P7, (0, 0), 1.5)[..., None]
    levels[0] = f * (1 - P7) + levels[4] * P7
    y = np.arange(h, dtype=np.float32)
    u = np.clip((Y1 - y) / (Y1 - Y0), 0, 1)           # 0 abajo, 1 arriba
    if k >= 1050:
        u = u * 0                                   # plano final (21 s en adelante): fondo real, solo sin ella
    sig = u * NIVELES[-1]
    prog = np.zeros_like(f)
    for j, sg in enumerate(NIVELES):
        onehot = np.zeros(len(NIVELES)); onehot[j] = 1
        wj = np.interp(sig, NIVELES, onehot).astype(np.float32)[:, None, None]
        prog += wj * levels[sg]
    # arriba NO se ve el fondo: degradado liso camel claro (sin panel, sin logo). La franja de transición desenfoca el fondo real poco a poco
    # y lo funde con ese camel; abajo queda el fondo original sin tocar.
    uc = np.clip(u * 1.35, 0, 1)                                      # el camel liso toma el control un poco antes de llegar arriba: no queda ni rastro del logo
    cy = (uc * uc * (3 - 2 * uc))[:, None, None].astype(np.float32)   # transición suave (smoothstep) sobre una franja ancha
    out = np.clip((1 - cy) * prog + cy * limpio(h, w), 0, 255).astype(np.uint8)
    cv2.imwrite(f"public/edit_bg/b_{k:04d}.jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 93])
if __name__ == "__main__":
    a, b = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (290, 1049)
    for k in range(a, b + 1):
        procesar(k)
        if k % 50 == 0: print(k, flush=True)
