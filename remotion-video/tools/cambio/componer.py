"""Sustituye el texto de la calle en CAMBIO.mp4: borra el texto viejo y pone el nuevo con la misma geometría y el mismo barrido."""
import sys, os, cv2, numpy as np
sys.path.insert(0, "tools/cambio")
from common import *

NUEVO = ["UBICACIÓN", "ESTRATÉGICA"]
VIEJO = ["300 METROS", "DEL MAR"]
Ha = np.load("out/H_all.npy")
# Frente del barrido (px de textura) medido en el texto original, por fotograma (archivos 001..097). >=84: completo.
FRENTE = {79: 451, 80: 680, 81: 1108, 82: 1509, 83: 1650}
CREMA, SOMBRA = np.array([231, 248, 255], np.float32), np.array([0, 40, 60], np.float32)  # BGR de #FFF8E7 y rgba(60,40,0)

def capa_texto(lines, front):
    """Alfa de la tinta y de la sombra en la textura (float 0..1), recortadas al frente del barrido."""
    ink, _ = render_text(lines)
    a = ink.astype(np.float32) / 255
    if front < TEX_W:
        a[:, int(front):] = 0
    sh = cv2.GaussianBlur(a, (0, 0), 15)
    return a, sh

def warp_alpha(a, H, ss=2):
    """Proyecta un alfa de textura al fotograma con supersampling (ss) para evitar aliasing."""
    S = np.diag([ss, ss, 1.0])
    pre = cv2.GaussianBlur(a, (0, 0), 0.5 / 0.2)  # pre-filtro: la textura se reduce ~0,2 al proyectarse
    w = cv2.warpPerspective(pre, S @ H, (1080 * ss, 1920 * ss), flags=cv2.INTER_LINEAR)
    return cv2.resize(w, (1080, 1920), interpolation=cv2.INTER_AREA)

def procesar(k, dbg=False):
    im, Y, Yc, T = masks(k)
    have_old = k >= 79
    out = im.copy()
    if have_old:
        Rm = cv2.dilate(T, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17)))
        out = cv2.inpaint(im, Rm, 7, cv2.INPAINT_TELEA)
    if k < 79 or k > 97:
        return out
    front = FRENTE.get(k, TEX_W)
    # zona permitida: calle amarilla (con sombra) tras borrar el texto viejo
    hsv = cv2.cvtColor(out, cv2.COLOR_BGR2HSV)
    Yp = ((hsv[..., 0] >= 14) & (hsv[..., 0] <= 36) & (hsv[..., 1] > 100) & (hsv[..., 2] > 50)).astype(np.uint8)
    allowed = cv2.morphologyEx(Yp, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8)).astype(np.float32)
    allowed = cv2.GaussianBlur(allowed, (0, 0), 1.0)
    a, sh = capa_texto(NUEVO, front)
    A = warp_alpha(a, Ha[k]) * allowed
    Sa = warp_alpha(sh, Ha[k]) * allowed
    f = out.astype(np.float32)
    f = f * (1 - 0.45 * Sa[..., None]) + SOMBRA * (0.45 * Sa[..., None])
    al = (0.96 * A)[..., None]
    f = f * (1 - al) + CREMA * al
    res = np.clip(f, 0, 255).astype(np.uint8)
    return res

if __name__ == "__main__":
    os.makedirs("out/new", exist_ok=True)
    ks = [int(x) for x in sys.argv[1:]] or range(1, 98)
    for k in ks:
        cv2.imwrite(f"out/new/{k:03d}.png", procesar(k))
        print(k, end=" ", flush=True)
