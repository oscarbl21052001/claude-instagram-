"""Seguimiento del giro de cámara: homografías fotograma a fotograma (SIFT + RANSAC, OpenCV).

Uso: python tools/calle/seguir.py <fotogramas f_NNNN.jpg 1080x1920> <mascaras road_NNNN.npy> [modo]
modo "todo": usa rasgos de toda la imagen (para un giro puro vale para cualquier plano);
modo "suelo": solo rasgos dentro de la calle (válido aunque el dron se traslade).
Imprime, para cada salto k, el IoU entre la máscara del fotograma 0 llevada al fotograma k y la máscara real de k.
"""
import glob, os, sys
import cv2, numpy as np

fr, rd = sys.argv[1], sys.argv[2]
modo = sys.argv[3] if len(sys.argv) > 3 else "todo"
files = sorted(glob.glob(os.path.join(fr, "f_*.jpg")))
S = 0.5  # trabajar a mitad de resolución
sift = cv2.SIFT_create(nfeatures=4000)
bf = cv2.BFMatcher()


def feats(i, ground):
    g = cv2.imread(files[i], cv2.IMREAD_GRAYSCALE)
    g = cv2.resize(g, None, fx=S, fy=S, interpolation=cv2.INTER_AREA)
    mask = None
    if ground:
        r = np.load(os.path.join(rd, f"road_{i:04d}.npy")) > 128
        r = cv2.dilate(r.astype(np.uint8), np.ones((41, 41), np.uint8))
        mask = cv2.resize(r, (g.shape[1], g.shape[0]), interpolation=cv2.INTER_NEAREST)
    return sift.detectAndCompute(g, mask)


def hom(a, b):
    ka, da = a
    kb, db = b
    if da is None or db is None or len(ka) < 8 or len(kb) < 8:
        return None, 0
    good = [m for m, n in bf.knnMatch(da, db, k=2) if m.distance < 0.75 * n.distance]
    if len(good) < 8:
        return None, len(good)
    p = np.float32([ka[m.queryIdx].pt for m in good]) / S
    q = np.float32([kb[m.trainIdx].pt for m in good]) / S
    H, inl = cv2.findHomography(p, q, cv2.RANSAC, 4.0)
    return H, int(inl.sum()) if inl is not None else 0


if __name__ == "__main__":
    F = [feats(i, modo == "suelo") for i in range(len(files))]
    G = [np.eye(3)]
    for i in range(1, len(files)):
        H, n = hom(F[i - 1], F[i])
        G.append((H if H is not None else np.eye(3)) @ G[-1])
        print(i, "inliers", n, flush=True)
    np.save(f"G_{modo}.npy", np.array(G))
    m0 = np.load(os.path.join(rd, "road_0000.npy")) > 128
    for k in (4, 8, 12, 16, 20, 24, 28):
        if k >= len(files):
            break
        w = cv2.warpPerspective(m0.astype(np.uint8), G[k], (1080, 1920)) > 0
        if not os.path.exists(os.path.join(rd, f"road_{k:04d}.npy")):
            continue
        mk = np.load(os.path.join(rd, f"road_{k:04d}.npy")) > 128
        print("IoU", modo, k, round((w & mk).sum() / max(1, (w | mk).sum()), 3))
