import sys, cv2, numpy as np
sys.path.insert(0, "tools/cambio")
from common import *
N = 97
H = {96: np.load("out/H96.npy")}
tpl, widths = render_text(["300 METROS", "DEL MAR"])
S = 2.0; Sm = np.diag([1 / S, 1 / S, 1])
def gray(k):
    g = cv2.cvtColor(cv2.imread(f"out/full/{k:03d}.png"), cv2.COLOR_BGR2GRAY)
    return cv2.resize(cv2.GaussianBlur(g, (0, 0), 1.5), None, fx=1 / S, fy=1 / S).astype(np.float32)
def roi(k):
    _, Y, Yc, T = masks(k)
    m = cv2.dilate(np.maximum(Yc, Y), np.ones((151, 151), np.uint8))  # entorno de la calle (suelo)
    return cv2.resize(m, None, fx=1 / S, fy=1 / S, interpolation=cv2.INTER_NEAREST)
rep = {}
for k in range(95, 67, -1):
    ref, inp = gray(k + 1), gray(k)
    M = roi(k + 1)
    Wm = np.eye(3, dtype=np.float32)
    ok = False
    try:
        cc, Wm = cv2.findTransformECC(ref, inp, Wm, cv2.MOTION_HOMOGRAPHY, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 500, 1e-7), M, 7)
        ok = True
    except cv2.error as e:
        cc = -1
    # warp de ECC está en coordenadas reducidas: pasar a píxeles completos
    Wf = np.linalg.inv(Sm) @ Wm @ Sm
    H[k] = Wf @ H[k + 1]
    # comprobación: píxeles de texto del fotograma k dentro de la plantilla proyectada (dilatada)
    _, Y, Yc, T = masks(k)
    wp = cv2.warpPerspective(tpl, H[k], (1080, 1920)) > 100
    wpd = cv2.dilate(wp.astype(np.uint8), np.ones((21, 21), np.uint8)) > 0
    prec = (wpd & (T > 0)).sum() / max((T > 0).sum(), 1)
    rep[k] = (round(float(cc), 3), round(float(prec), 3), int((T > 0).sum()))
    print(k, rep[k])
np.save("out/H_all.npy", np.array([H.get(k, np.zeros((3, 3))) for k in range(0, N + 1)]))
