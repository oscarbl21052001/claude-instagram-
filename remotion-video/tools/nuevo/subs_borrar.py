"""NUEVO: borra los subtítulos quemados (blanco con sombra) SOLO donde existen. Segmentos medidos sobre el vídeo con el texto verde ya cambiado
(30 fps, 1080x1920): por segmento el texto es estático -> máscara = píxeles blancos finos (top-hat) presentes en >=70 % de los fotogramas,
recortada a las filas de texto (quita líneas blancas del render) y dilatada para la sombra. Relleno con LaMa (limpiar.rellenar) en una banda.
Uso: subs_borrar.py <dir> [seg...]  -> <dir>/sk/f_NNNN.jpg (fotogramas limpios) y <dir>/sm/NN.png (máscaras por segmento)"""
import sys, os, json, cv2, numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "constructora"))
from limpiar import rellenar
S = sys.argv[1]
SEG = [(4, 57), (62, 100), (330, 377), (384, 465), (481, 497), (498, 598), (607, 686), (699, 741), (763, 790), (803, 837)]
VENTANA = {4: (1262, 1340)}   # segmento 'diferenciado': la lámpara del render queda justo debajo y no es texto
K = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
Y0, Y1, X0, X1 = 1130, 1450, 60, 1020
def blanco(k):
    im = cv2.imread(f"{S}/sf/f_{k:04d}.jpg"); mn = im.min(2)
    th = cv2.morphologyEx(mn, cv2.MORPH_TOPHAT, K)
    m = ((mn > 185) & (th > 35)).astype(np.uint8)
    out = np.zeros_like(m); out[Y0:Y1, X0:X1] = m[Y0:Y1, X0:X1]; return out
def mascara_seg(a, b, i=None):
    acc = sum(blanco(k).astype(np.float32) for k in range(a, b + 1)) / (b - a + 1)
    m = (acc >= 0.7).astype(np.uint8)
    if i in VENTANA: m[:VENTANA[i][0]] = 0; m[VENTANA[i][1]:] = 0
    rows = m.sum(1)
    keep = np.zeros_like(m)
    ys = np.where(rows > 25)[0]
    if len(ys):
        # agrupa filas de texto (huecos < 14 px) y descarta grupos finos (líneas del render)
        grupos = np.split(ys, np.where(np.diff(ys) > 14)[0] + 1)
        for g in grupos:
            if len(g) >= 14: keep[g.min() - 4:g.max() + 5] = 1
    m = m * keep
    # rellena huecos dentro de cada línea (texto blanco sobre zonas blancas: blusa, móvil) uniendo letras en horizontal
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (61, 13))) * keep
    d = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)))
    return d, m
if __name__ == "__main__":
    os.makedirs(f"{S}/sk", exist_ok=True); os.makedirs(f"{S}/sm", exist_ok=True)
    sel = [int(a) for a in sys.argv[2:]] or range(len(SEG))
    for i in sel:
        a, b = SEG[i]
        d, m = mascara_seg(a, b, i); cv2.imwrite(f"{S}/sm/{i:02d}.png", d * 255)
        ys, xs = np.where(d > 0); print("seg", i, a, b, "píxeles", int(d.sum()), "caja", (xs.min(), ys.min(), xs.max(), ys.max()) if len(ys) else None, flush=True)
        if len(ys) == 0: continue
        for k in range(a, b + 1):
            f = f"{S}/sk/f_{k:04d}.jpg"
            if os.path.exists(f): continue
            im = cv2.imread(f"{S}/sf/f_{k:04d}.jpg")
            out = rellenar(im, d, (0, 1100, 1080, 1480), esc=0.8)
            cv2.imwrite(f, out, [cv2.IMWRITE_JPEG_QUALITY, 96])
        print("seg", i, "hecho", flush=True)
    print("SUBS_DONE", flush=True)
