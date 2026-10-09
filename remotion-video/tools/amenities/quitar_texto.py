"""Borra el texto fino "2 PISCINAS" de los fotogramas de AMENITIES (out/amf/NNN.png -> out/amn/NNN.png).
El texto es estático: la máscara es la intersección estable de los trazos claros (top-hat) en todos los fotogramas."""
import cv2, numpy as np, sys, os
X0, X1, Y0, Y1 = 420, 1025, 2312, 2418   # caja donde está el texto (1440x2544)
os.makedirs("out/amn", exist_ok=True)
K = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
def tophat(im):
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    th = cv2.morphologyEx(g, cv2.MORPH_TOPHAT, K).astype(np.float32)
    m = np.zeros(g.shape, np.uint8); m[Y0:Y1, X0:X1] = (th[Y0:Y1, X0:X1] > 28)
    return m
def mascara_estable(n=44, frac=0.25):
    acc = sum(tophat(cv2.imread(f"out/amf/{k:03d}.png")).astype(np.float32) for k in range(1, n + 1)) / n
    m = (acc >= frac).astype(np.uint8)
    return m
if __name__ == "__main__":
    M = mascara_estable(); cv2.imwrite("out/am_mask.png", M * 255); print("píxeles de máscara", int(M.sum()))
    ks = [int(a) for a in sys.argv[1:]] or range(1, 45)
    for k in ks:
        im = cv2.imread(f"out/amf/{k:03d}.png")
        mk = cv2.dilate(np.maximum(M, tophat(im)), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17)))
        fill = cv2.inpaint(im, mk, 8, cv2.INPAINT_TELEA)
        fill = cv2.GaussianBlur(fill, (0, 0), 2.5)
        a = cv2.GaussianBlur(mk.astype(np.float32), (0, 0), 2.5)[..., None]   # borde suave
        out = (im * (1 - a) + fill * a).astype(np.uint8)
        cv2.imwrite(f"out/amn/{k:03d}.png", out)
