"""Sigue el cuadro de la escena 4 de CAPRI (fotogramas 1050..1243). La cámara va en la mano y se mueve unos píxeles.
Referencia: esquinas medidas en el fotograma de referencia (cuadro_medir.py). Para cada fotograma: homografía del fondo estático
(SIFT + RANSAC, sin la zona de ella) respecto a la referencia y esquinas = H · esquinas_ref. Salida: public/cuadro_quads.json"""
import json, sys, cv2, numpy as np
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from cuadro_medir import medir
REF, A, B = 1060, 1050, 1243
def gris(k): return cv2.cvtColor(cv2.imread(f"out/e_all/f_{k:04d}.jpg"), cv2.COLOR_BGR2GRAY)
sift = cv2.SIFT_create(4000)
mask = np.full((1920, 1080), 255, np.uint8)
mask[820:, 300:] = 0          # sin ella (cuerpo/cabeza/manos)
mask[1380:, :] = 0            # sin el banco/mesa
mask[:, 900:] = 0
def feats(k):
    g = gris(k); return sift.detectAndCompute(g, mask)
cref, _ = medir("out/cuadro_plate.png")   # placa limpia (en coordenadas del fotograma REF): la esquina inferior derecha sale de las rectas
kr, dr = feats(REF)
bf = cv2.BFMatcher()
res = {}
for k in range(A, B + 1):
    kk, dd = feats(k)
    m = [a for a, b in bf.knnMatch(dd, dr, k=2) if a.distance < 0.7 * b.distance]
    src = np.float32([kr[a.trainIdx].pt for a in m]); dst = np.float32([kk[a.queryIdx].pt for a in m])
    H, inl = cv2.findHomography(src, dst, cv2.RANSAC, 2.0)
    q = cv2.perspectiveTransform(cref.reshape(-1, 1, 2).astype(np.float32), H).reshape(-1, 2)
    res[k] = {"q": q.round(2).tolist(), "n": int(inl.sum())}
    if k % 40 == 0: print(k, res[k]["n"], q.round(1).tolist(), flush=True)
json.dump({"ref": cref.round(2).tolist(), "frames": res}, open("out/cuadro_quads.json", "w"))
# módulo TS con la matriz CSS matrix3d de cada fotograma (elemento EW x EH -> cuadrilátero, ampliado 1,8 px para no dejar rendijas con el marco)
EW, EH = 1120, 1076
unit = np.float32([[0, 0], [EW, 0], [EW, EH], [0, EH]])
out = {}
for k, v in res.items():
    q = np.float32(v["q"]); c = q.mean(0); q = c + (q - c) * (1 + 1.8 / np.linalg.norm(q - c, axis=1).mean())
    H = cv2.getPerspectiveTransform(unit, q.astype(np.float32)); H = H / H[2, 2]
    out[k] = [round(float(x), 6) for x in (H[0, 0], H[1, 0], 0, H[2, 0], H[0, 1], H[1, 1], 0, H[2, 1], 0, 0, 1, 0, H[0, 2], H[1, 2], 0, 1)]
open("src/Capri/cuadroQuads.ts", "w").write("// generado por tools/capri/cuadro_seguir.py: matrix3d por fotograma del cuadro (escena 4)\nexport const CUADRO_EW = %d;\nexport const CUADRO_EH = %d;\nexport const CUADRO: Record<number, number[]> = %s;\n" % (EW, EH, json.dumps(out)))
print("SEGUIR_OK")
