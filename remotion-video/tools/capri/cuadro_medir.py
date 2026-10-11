"""Mide las 4 esquinas de la foto del cuadro (interior del marco negro) en fotogramas de la escena 4 de CAPRI (1080x1920).
Desde un punto interior camina hacia fuera hasta el marco oscuro (sub-píxel), ajusta rectas robustas y las intersecta.
La esquina inferior derecha queda tapada por ella: sale de la intersección de las rectas."""
import sys, cv2, numpy as np
THR = 48
def cruza(g, x, y, d, maxt=140):
    prev = g[int(round(y)), int(round(x))]
    for t in range(1, maxt):
        xx, yy = x + d[0] * t, y + d[1] * t
        v = g[int(round(yy)), int(round(xx))]
        if v < THR <= prev:
            f = (prev - THR) / max(prev - v, 1e-6)
            return np.array([x + d[0] * (t - 1 + f), y + d[1] * (t - 1 + f)])
        prev = v
    return None
def recta(p):
    p = np.array([q for q in p if q is not None], np.float32)
    vx, vy, x0, y0 = cv2.fitLine(p, cv2.DIST_HUBER, 0, 0.01, 0.01).ravel()
    return np.array([vx, vy]), np.array([x0, y0]), len(p)
def inter(r1, r2):
    A = np.array([r1[0], -r2[0]]).T; t = np.linalg.solve(A, r2[1] - r1[1])
    return r1[1] + t[0] * r1[0]
def medir(path):
    im = cv2.imread(path); g = cv2.GaussianBlur(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 1.0)
    L = [cruza(g, 250, y, (-1, 0)) for y in list(range(680, 760, 8)) + list(range(1000, 1230, 8))]
    T = [cruza(g, x, 700, (0, -1)) for x in range(220, 700, 10)]
    B = [cruza(g, x, 1190, (0, 1)) for x in range(170, 440, 6)]
    R = [cruza(g, 600, y, (1, 0)) for y in range(670, 880, 6)]
    rl, rt, rb, rr = recta(L), recta(T), recta(B), recta(R)
    c = np.array([inter(rl, rt), inter(rr, rt), inter(rr, rb), inter(rl, rb)])  # TL TR BR BL
    return c, (rl[2], rt[2], rb[2], rr[2])
if __name__ == "__main__":
    c, n = medir(sys.argv[1]); print(n); print(np.round(c, 1).tolist())
