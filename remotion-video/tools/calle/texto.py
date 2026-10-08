"""Recalcula solo la posición del texto (sin repintar la calle).

Uso: QUAD="x1,y1,x2,y2,x3,y3,x4,y4" python tools/calle/texto.py <G_todo.npy> <src/Calle/datos.ts>
QUAD = esquinas en el fotograma 0 (cerca-izq, cerca-der, lejos-izq, lejos-der) del trozo de calle donde va el texto.
Conserva la línea CALLE_AREA del .ts existente.
"""
import os, re, sys
import cv2, numpy as np

G = np.load(sys.argv[1])
ts = sys.argv[2]
TW, TH = 1800, 1000
q = [float(v) for v in os.environ["QUAD"].split(",")]
LN, RN, LF, RF = (q[0], q[1]), (q[2], q[3]), (q[4], q[5]), (q[6], q[7])
H0 = cv2.getPerspectiveTransform(np.float32([[0, 0], [TW, 0], [TW, TH], [0, TH]]), np.float32([LN, LF, RF, RN]))
area = [l for l in open(ts).read().splitlines() if l.startswith("export const CALLE_AREA")]
rows = []
for g in G:
    h = g @ H0
    h = h / h[2, 2]
    rows.append([h[0, 0], h[1, 0], 0, h[2, 0], h[0, 1], h[1, 1], 0, h[2, 1], 0, 0, 1, 0, h[0, 2], h[1, 2], 0, h[2, 2]])
with open(ts, "w") as f:
    f.write("// Generado por tools/calle/procesar.py y tools/calle/texto.py. Matriz CSS (matrix3d) por fotograma: textura del texto -> pantalla.\n")
    f.write(f"export const TEXTO_W = {TW};\nexport const TEXTO_H = {TH};\n")
    f.write("export const TEXTO_M: number[][] = [\n" + ",\n".join("  [" + ",".join(f"{v:.8g}" for v in r) + "]" for r in rows) + ",\n];\n")
    f.write("\n".join(area) + "\n")
