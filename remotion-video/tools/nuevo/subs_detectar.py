"""NUEVO: detecta los subtítulos quemados (texto blanco fino con sombra) fotograma a fotograma: top-hat de blancos en la banda y 560..1850.
Salida: <dir>/subs.json con, por fotograma, nº de píxeles de texto y caja (x0,y0,x1,y1)."""
import sys, json, cv2, numpy as np
S = sys.argv[1]
K = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
def texto(im):
    mn = im.min(2)
    th = cv2.morphologyEx(mn, cv2.MORPH_TOPHAT, K)
    m = ((mn > 205) & (th > 55)).astype(np.uint8)
    m[:560] = 0; m[1850:] = 0
    return m
res = {}
for k in range(846):
    im = cv2.imread(f"{S}/sf/f_{k:04d}.jpg"); m = texto(im)
    d = cv2.dilate(m, np.ones((15, 35), np.uint8)); n, lab, st, _ = cv2.connectedComponentsWithStats(d)
    boxes = [st[j, :4].tolist() for j in range(1, n) if st[j, 4] > 1500]
    ys, xs = np.where(m > 0)
    res[k] = {"n": int(m.sum()), "boxes": boxes}
json.dump(res, open(f"{S}/subs.json", "w"))
print("OK")
