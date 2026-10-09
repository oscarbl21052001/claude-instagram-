import sys, cv2, numpy as np
sys.path.insert(0, "tools/cambio")
from common import *
im, Y, Yc, T = masks(96)
tpl, widths = render_text(["300 METROS", "DEL MAR"])
ys, xs = np.nonzero(T); P = np.column_stack([xs, ys]).astype(np.float64)
c = P.mean(0); w, v = np.linalg.eigh(np.cov((P - c).T)); a = v[:, 1]; b = np.array([-a[1], a[0]])
u = (P - c) @ b
lab = (u > np.median(u)).astype(int)  # arranque: mitad izquierda/derecha
for _ in range(10):
    lines = []
    for k in (0, 1):
        Q = P[lab == k]; lines.append(cv2.fitLine(Q.astype(np.float32), cv2.DIST_L2, 0, 0.01, 0.01).ravel())
    d = []
    for (vx, vy, x0, y0) in lines:
        d.append(np.abs((P[:, 0] - x0) * vy - (P[:, 1] - y0) * vx))
    lab = (d[1] < d[0]).astype(int)
# línea 1 ("300 METROS") = la de la izquierda
order = sorted((0, 1), key=lambda k: P[lab == k][:, 0].mean())
print("píxeles por línea", [int((lab == k).sum()) for k in order])
rows = np.where(tpl.max(1) > 0)[0]; cuts = np.where(np.diff(rows) > 5)[0]
bands = [(rows[0], rows[cuts[0]]), (rows[cuts[0] + 1], rows[-1])]
print("bandas de tex (y):", bands)
src, dst = [], []
for (y0, y1), k in zip(bands, order):
    Q = P[lab == k]; cq = Q.mean(0); wq, vq = np.linalg.eigh(np.cov((Q - cq).T)); ax = vq[:, 1]
    if ax[1] > 0: ax = -ax          # eje de lectura: hacia arriba en pantalla
    ac = np.array([-ax[1], ax[0]])   # transversal (tex y -> derecha)
    if ac[0] < 0: ac = -ac
    s = (Q - cq) @ ax; t = (Q - cq) @ ac
    # bordes largos por regresión sobre extremos transversales (percentiles) en tramos
    nb = 24; edges = {0: [], 1: []}
    bins = np.linspace(s.min(), s.max(), nb + 1)
    for i in range(nb):
        m = (s >= bins[i]) & (s < bins[i + 1])
        if m.sum() < 20: continue
        edges[0].append(((bins[i] + bins[i + 1]) / 2, np.percentile(t[m], 2))); edges[1].append(((bins[i] + bins[i + 1]) / 2, np.percentile(t[m], 98)))
    fits = [np.polyfit(*zip(*edges[j]), 1) for j in (0, 1)]
    s0, s1 = np.percentile(s, 0.5), np.percentile(s, 99.5)
    def pt(sv, j): return cq + ax * sv + ac * np.polyval(fits[j], sv)
    # esquinas en tex: (x0,y0)=inicio,arriba(izquierda en pantalla)...
    xs_t = np.where(tpl[y0:y1 + 1].max(0) > 0)[0]; x0, x1 = xs_t[0], xs_t[-1]
    # lectura x_tex ↔ -s (eje ax apunta arriba = final del texto) -> inicio del texto = s0 ; fin = s1
    src += [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]
    dst += [pt(s0, 0), pt(s1, 0), pt(s0, 1), pt(s1, 1)]
H, _ = cv2.findHomography(np.float32(src), np.float32(dst), 0)
def iou(H):
    wp = cv2.warpPerspective(tpl, H, (1080, 1920)); return ((wp > 128) & (T > 0)).sum() / ((wp > 128) | (T > 0)).sum()
print("IoU", round(float(iou(H)), 3))
np.save("out/H96.npy", H)
wp = cv2.warpPerspective(tpl, H, (1080, 1920))
vis = im.copy(); vis[wp > 128] = (0.5 * vis[wp > 128] + 0.5 * np.array([255, 0, 255])).astype(np.uint8)
cv2.imwrite("out/fit96.png", vis[800:1920, 0:700])
