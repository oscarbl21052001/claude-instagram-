"""Capa dorada de la calle + posición del texto pegado al suelo, fotograma a fotograma.

Uso: python tools/calle/procesar.py <fotogramas> <road_NNNN.npy> <G_todo.npy> <salida_png> <salida.ts>
- Estabiliza la probabilidad de "calle" con los vecinos alineados por la homografía del giro de cámara.
- Se queda solo con la calle principal: la zona conectada con la calle del primer fotograma (propagada hacia delante)
  y la del último (propagada hacia atrás); descarta el resto (solares, aparcamientos).
- Escribe p_NNNN.webp (dorado con la luz de la imagen, alfa = calle) y un módulo TypeScript con la matriz
  del texto (3x3 textura -> pantalla) por fotograma.
"""
import os, sys
import cv2, numpy as np
from PIL import Image

fr, rd, gfile, outpng, outts = sys.argv[1:6]
os.makedirs(outpng, exist_ok=True)
G = np.load(gfile)
N = len(G)
W, Hh = 1080, 1920
GOLD = np.array([226, 168, 38], np.float32)  # mostaza dorado (RGB)
P = [np.load(os.path.join(rd, f"road_{i:04d}.npy")) for i in range(N)]
Ginv = [np.linalg.inv(g) for g in G]
warp = lambda a, M, interp=cv2.INTER_LINEAR: cv2.warpPerspective(a, M, (W, Hh), flags=interp)

# 1) probabilidad estabilizada
Ps = []
for t in range(N):
    acc, w = np.zeros((Hh, W), np.float32), 0.0
    for k in (-2, -1, 0, 1, 2):
        j = t + k
        if 0 <= j < N:
            wk = 1.0 if k == 0 else 0.6
            acc += wk * warp(P[j], G[t] @ Ginv[j]).astype(np.float32)
            w += wk
    Ps.append(acc / w)
M = [(p > 128).astype(np.uint8) for p in Ps]


def main_component(m, seed=None):
    k = np.ones((61, 61), np.uint8)
    core = cv2.morphologyEx(m, cv2.MORPH_OPEN, k)  # rompe uniones finas con solares
    n, lab, st, _ = cv2.connectedComponentsWithStats(core)
    if n < 2:
        return m
    i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    return (cv2.dilate((lab == i).astype(np.uint8), np.ones((81, 81), np.uint8)) & m).astype(np.uint8)


S0 = main_component(M[0])
S1 = main_component(M[-1])
tol = np.ones((31, 31), np.uint8)
paint_area = []
for t in range(N):
    keep = cv2.dilate(warp(S0, G[t], cv2.INTER_NEAREST), tol) | cv2.dilate(warp(S1, G[t] @ Ginv[-1], cv2.INTER_NEAREST), tol)
    m = M[t] & keep
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] < 4000:
            m[lab == i] = 0
    a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 2.0)
    img = cv2.imread(os.path.join(fr, f"f_{t:04d}.jpg"))[..., ::-1].astype(np.float32)
    luma = (0.3 * img[..., 0] + 0.59 * img[..., 1] + 0.11 * img[..., 2]) / 255.0
    shade = np.clip(0.62 + 0.9 * luma, 0.0, 1.5)[..., None]  # conserva sombras y textura
    mix = 0.78 * np.clip(GOLD * shade, 0, 255) + 0.22 * img  # sutil: asoma el empedrado
    rgba = np.dstack([np.clip(mix, 0, 255), a * 255]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(os.path.join(outpng, f"p_{t:04d}.webp"), quality=90, alpha_quality=100, method=4)
    paint_area.append(int(m.sum()))

# 2) texto sobre el suelo: rectángulo de la textura -> trapecio de la calle en el fotograma 0
TW, TH = 1800, 1000
q = [float(v) for v in os.environ.get("QUAD", "398,1790,612,1790,274,1290,410,1290").split(",")]
LN, RN, LF, RF = (q[0], q[1]), (q[2], q[3]), (q[4], q[5]), (q[6], q[7])
# la lectura va hacia el mar (de cerca a lejos); la parte superior de las letras queda a la izquierda de la calle
src = np.float32([[0, 0], [TW, 0], [TW, TH], [0, TH]])
dst = np.float32([LN, LF, RF, RN])
H0 = cv2.getPerspectiveTransform(src, dst)
rows = []
for t in range(N):
    Ht = G[t] @ H0
    Ht = Ht / Ht[2, 2]
    rows.append(Ht)
def css(Ht):
    h = Ht
    return [h[0, 0], h[1, 0], 0, h[2, 0], h[0, 1], h[1, 1], 0, h[2, 1], 0, 0, 1, 0, h[0, 2], h[1, 2], 0, h[2, 2]]
with open(outts, "w") as f:
    f.write("// Generado por tools/calle/procesar.py. Matriz CSS (matrix3d) por fotograma: textura del texto -> pantalla.\n")
    f.write(f"export const TEXTO_W = {TW};\nexport const TEXTO_H = {TH};\n")
    f.write("export const TEXTO_M: number[][] = [\n" + ",\n".join("  [" + ",".join(f"{v:.8g}" for v in css(h)) + "]" for h in rows) + ",\n];\n")
    f.write("export const CALLE_AREA: number[] = [" + ",".join(str(round(a / 1000)) for a in paint_area) + "]; // miles de px por fotograma\n")
print("áreas (miles de px):", [round(a / 1000) for a in paint_area])
