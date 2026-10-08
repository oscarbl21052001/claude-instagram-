"""Calle pintada con bordes RECTOS y texto pegado al suelo (sustituye a procesar.py, cuyo borde seguía la máscara del modelo).

Uso: python tools/calle/pintar_recta.py <fotogramas f_NNNN.jpg> <carpeta road_/occ_ de fotogramas clave> <G_todo.npy> <config.json> <salida_webp> <salida.ts>

config.json:
  {"tramos": [{"nombre": "inicio", "ref": 0, "poligono": [[x,y],...], "desde": 0, "hasta": 70},
              {"nombre": "final", "ref": 98, "poligono": [...], "desde": 84, "hasta": 98}],
   "quad": [x1,y1,x2,y2,x3,y3,x4,y4]}
- "poligono": contorno de la calle en el fotograma "ref" (px de 1080x1920), con lados rectos. Se lleva a cada fotograma con la
  homografía del giro (G[t] @ inv(G[ref])), así los bordes siguen siendo rectas y siguen la calle.
- Los obstáculos (árboles, coches, personas) salen de la segmentación del fotograma clave más cercano, llevada al fotograma t.
  Solo recortan dentro del contorno: nunca definen el borde.
- Escribe p_NNNN.webp (dorado con la luz de la imagen; alfa = calle) y el .ts con la matriz del texto (quad = cerca-izq,
  cerca-der, lejos-izq, lejos-der en el fotograma 0).
"""
import glob, json, os, sys
import cv2, numpy as np
from PIL import Image

fr, rd, gfile, cfgfile, outwebp, outts = sys.argv[1:7]
os.makedirs(outwebp, exist_ok=True)
cfg = json.load(open(cfgfile))
G = np.load(gfile)
N = len(G)
W, Hh = 1080, 1920
GOLD = np.array([226, 168, 38], np.float32)  # mostaza dorado (RGB)
SS = 3  # supersampling para bordes limpios
keys = sorted(int(os.path.basename(f)[4:8]) for f in glob.glob(os.path.join(rd, "occ_*.npy")))
Ginv = [np.linalg.inv(g) for g in G]


def warp_poly(poly, ref, t):
    M = G[t] @ Ginv[ref]
    p = np.array(poly, np.float64).reshape(-1, 1, 2)
    h = np.concatenate([p, np.ones((len(poly), 1, 1))], 2) @ M.T  # (n,1,3)
    w = h[..., 2]
    if (w <= 1e-6).any():
        return None
    return (h[..., :2] / w[..., None]).reshape(-1, 2)


def raster(poly):
    m = np.zeros((Hh * SS, W * SS), np.uint8)
    pts = np.round(poly * SS * 16).astype(np.int32)
    cv2.fillPoly(m, [pts], 255, lineType=cv2.LINE_8, shift=4)
    return cv2.resize(m, (W, Hh), interpolation=cv2.INTER_AREA).astype(np.float32) / 255


areas = []
for t in range(N):
    alpha = np.zeros((Hh, W), np.float32)
    for tr in cfg["tramos"]:
        if not (tr["desde"] <= t <= tr["hasta"]):
            continue
        poly = warp_poly(tr["poligono"], tr["ref"], t)
        if poly is None or np.abs(poly).max() > 20000:
            continue
        a = raster(poly)
        # obstáculos: fotograma clave más cercano dentro del mismo tramo
        ks = [k for k in keys if tr["desde"] <= k <= tr["hasta"]] or keys
        k = min(ks, key=lambda x: abs(x - t))
        occ = np.load(os.path.join(rd, f"occ_{k:04d}.npy")).astype(np.uint8)
        if k != t:
            occ = cv2.warpPerspective(occ, G[t] @ Ginv[k], (W, Hh), flags=cv2.INTER_NEAREST)
        occ = cv2.GaussianBlur(cv2.dilate(occ, np.ones((7, 7), np.uint8)).astype(np.float32), (0, 0), 1.5)
        alpha = np.maximum(alpha, a * (1 - np.clip(occ, 0, 1)))
    img = cv2.imread(os.path.join(fr, f"f_{t:04d}.jpg"))[..., ::-1].astype(np.float32)
    luma = (0.3 * img[..., 0] + 0.59 * img[..., 1] + 0.11 * img[..., 2]) / 255.0
    shade = np.clip(0.62 + 0.9 * luma, 0.0, 1.5)[..., None]  # conserva sombras y textura
    mix = 0.78 * np.clip(GOLD * shade, 0, 255) + 0.22 * img
    rgba = np.dstack([np.clip(mix, 0, 255), alpha * 255]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(os.path.join(outwebp, f"p_{t:04d}.webp"), quality=90, alpha_quality=100, method=4)
    areas.append(int((alpha > 0.5).sum()))

# texto sobre el suelo: rectángulo de la textura -> trapecio de la calle en el fotograma 0
TW, TH = 1800, 1000
q = [float(v) for v in cfg["quad"]]
LN, RN, LF, RF = (q[0], q[1]), (q[2], q[3]), (q[4], q[5]), (q[6], q[7])
H0 = cv2.getPerspectiveTransform(np.float32([[0, 0], [TW, 0], [TW, TH], [0, TH]]), np.float32([LN, LF, RF, RN]))
rows = []
for g in G:
    h = g @ H0
    h = h / h[2, 2]
    rows.append([h[0, 0], h[1, 0], 0, h[2, 0], h[0, 1], h[1, 1], 0, h[2, 1], 0, 0, 1, 0, h[0, 2], h[1, 2], 0, h[2, 2]])
with open(outts, "w") as f:
    f.write("// Generado por tools/calle/pintar_recta.py. Matriz CSS (matrix3d) por fotograma: textura del texto -> pantalla.\n")
    f.write(f"export const TEXTO_W = {TW};\nexport const TEXTO_H = {TH};\n")
    f.write("export const TEXTO_M: number[][] = [\n" + ",\n".join("  [" + ",".join(f"{v:.8g}" for v in r) + "]" for r in rows) + ",\n];\n")
    f.write("export const CALLE_AREA: number[] = [" + ",".join(str(round(a / 1000)) for a in areas) + "]; // miles de px por fotograma\n")
print("áreas (miles de px):", [round(a / 1000) for a in areas])
