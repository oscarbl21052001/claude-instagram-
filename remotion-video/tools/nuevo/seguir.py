"""Sigue el texto viejo de NUEVO.mov (perspectiva 3D + zoom): homografía fotograma a fotograma con ECC sobre las máscaras (pirámide 1/8 -> 1/4).
Salida: <dir>/H.json con H[k] = homografía (píxeles de 1080x1920) que lleva el fotograma k al fotograma de referencia REF."""
import sys, os, json, cv2, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from mascara import mascara
S = sys.argv[1]; REF, A = 373, 222
def core(k):
    im = cv2.imread(f"{S}/frj/f_{k:04d}.jpg"); _, c = mascara(im); return c
def pyr(c, f):
    s = cv2.resize(c.astype(np.float32), (1080 // f, 1920 // f), interpolation=cv2.INTER_AREA)
    return cv2.GaussianBlur(s, (0, 0), 2)
crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6)
def ecc(tmpl, img, W0):
    W = W0.astype(np.float32).copy(); cc = None
    for f, it in ((8, 400), (4, 300)):
        t, i = pyr(tmpl, f), pyr(img, f)
        D = np.diag([1 / f, 1 / f, 1]); Di = np.diag([f, f, 1])
        Wf = (D @ W @ Di).astype(np.float32)
        try:
            cc, Wf = cv2.findTransformECC(t, i, Wf, cv2.MOTION_HOMOGRAPHY, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, it, 1e-7), None, 5)
        except cv2.error:
            return W, -1
        W = (Di @ Wf @ D).astype(np.float32)
    return W, cc
# H_k: transforma coordenadas de la imagen "template" (k+1, ya alineada con REF) hacia la imagen k (convención de ECC: warp = de template a input)
Hk = {REF: np.eye(3)}   # Hk[k]: coordenadas del fotograma REF -> coordenadas del fotograma k
cores = {k: core(k) for k in range(A, REF + 1)}
W = np.eye(3)
for k in range(REF - 1, A - 1, -1):
    # alinear core[k+1] (plantilla) con core[k] (entrada): W_step lleva coords de k+1 -> coords de k
    Ws, cc = ecc(cores[k + 1], cores[k], np.eye(3))
    if cc < 0.6:  # reintento con escala inicial estimada por área
        ar = (cores[k].sum() + 1) / (cores[k + 1].sum() + 1); s = ar ** 0.5
        Ws, cc = ecc(cores[k + 1], cores[k], np.diag([s, s, 1]).astype(np.float32))
    Hk[k] = Ws @ Hk[k + 1]
    if k % 10 == 0 or cc < 0.8: print(k, round(float(cc), 3), flush=True)
json.dump({str(k): v.tolist() for k, v in Hk.items()}, open(f"{S}/H.json", "w"))
print("SEGUIR_OK")

# --- refinado directo REF -> k (quita la deriva de la cadena) ---
ref = cores[REF]
H2 = {}
for k in range(A, REF + 1):
    W, cc = ecc(ref, cores[k], Hk[k])
    w0 = cv2.warpPerspective(ref, Hk[k], (1080, 1920), flags=cv2.INTER_NEAREST) > 0
    w1 = cv2.warpPerspective(ref, W, (1080, 1920), flags=cv2.INTER_NEAREST) > 0
    c = cores[k] > 0
    i0 = (w0 & c).sum() / max((w0 | c).sum(), 1); i1 = (w1 & c).sum() / max((w1 | c).sum(), 1)
    H2[k] = W if i1 > i0 and cc > 0 else Hk[k]
    if k % 20 == 0: print("refina", k, round(float(i0), 3), round(float(i1), 3), flush=True)
json.dump({str(k): v.tolist() for k, v in H2.items()}, open(f"{S}/H2.json", "w"))
print("REFINA_OK")
