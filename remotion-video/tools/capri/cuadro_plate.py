"""Placa limpia del cuadro (sin ella): promedia, en coordenadas del fotograma de referencia, los píxeles donde MODNet crudo dice 'no es ella'."""
import sys, cv2, numpy as np
sys.path.insert(0, __file__.rsplit("/", 1)[0])
REF, A, B = 1060, 1050, 1243
sift = cv2.SIFT_create(4000); bf = cv2.BFMatcher()
mask = np.full((1920, 1080), 255, np.uint8); mask[820:, 300:] = 0; mask[1380:, :] = 0; mask[:, 900:] = 0
rd = lambda k: cv2.imread(f"out/e_all/f_{k:04d}.jpg")
kr, dr = sift.detectAndCompute(cv2.cvtColor(rd(REF), cv2.COLOR_BGR2GRAY), mask)
acc = np.zeros((1920, 1080, 3), np.float64); cnt = np.zeros((1920, 1080), np.float64)
K = np.ones((41, 41), np.uint8)
for k in range(A, B + 1, 3):
    im = rd(k); kk, dd = sift.detectAndCompute(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), mask)
    m = [a for a, b in bf.knnMatch(dd, dr, k=2) if a.distance < 0.7 * b.distance]
    src = np.float32([kr[a.trainIdx].pt for a in m]); dst = np.float32([kk[a.queryIdx].pt for a in m])
    H, _ = cv2.findHomography(src, dst, cv2.RANSAC, 2.0)
    raw = cv2.imread(f"out/raw/{k:04d}.png", 0)
    per = cv2.dilate((raw > 10).astype(np.uint8), K)
    w = cv2.warpPerspective(im, H, (1080, 1920), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_LINEAR)
    pw = cv2.warpPerspective(per, H, (1080, 1920), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_NEAREST)
    ok = (pw == 0).astype(np.float64)
    acc += w * ok[..., None]; cnt += ok
plate = (acc / np.maximum(cnt, 1)[..., None]).astype(np.uint8)
cv2.imwrite("out/cuadro_plate.png", plate); cv2.imwrite("out/cuadro_cnt.png", (cnt / cnt.max() * 255).astype(np.uint8))
print("PLATE_OK", cnt.max())
