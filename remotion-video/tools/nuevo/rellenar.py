"""Rellena (LaMa) el hueco del texto viejo en los fotogramas 222..374 de NUEVO.mov (1080x1920). Salida: <dir>/inp/f_NNNN.jpg"""
import sys, os, cv2, numpy as np
sys.path.insert(0, os.path.dirname(__file__)); sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "constructora"))
from mascara import mascara
from limpiar import rellenar
S = sys.argv[1]
os.makedirs(f"{S}/inp", exist_ok=True)
ref373 = mascara(cv2.imread(f"{S}/frj/f_0373.jpg"))[0]
for k in range(222, 379):
    f = f"{S}/inp/f_{k:04d}.jpg"
    if os.path.exists(f): continue
    im = cv2.imread(f"{S}/frj/f_{k:04d}.jpg")
    m, _ = mascara(im)
    if k >= 374:   # transición con viraje de color hacia el siguiente plano: el color del texto ya no es fiable -> máscara del fotograma 373, más ancha
        m = cv2.dilate(ref373, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35)))
    out = rellenar(im, m, (0, 0, 1080, 1000), esc=0.6)
    cv2.imwrite(f, out, [cv2.IMWRITE_JPEG_QUALITY, 96])
    if k % 10 == 0: print(k, flush=True)
print("INP_DONE", flush=True)
