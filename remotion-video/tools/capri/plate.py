"""Fondo difuminado de CAPRI: colores del propio plano (panel azul, paredes beige, madera) sin ella y sin detalles.
Uso: python tools/capri/plate.py <fotograma_escena2> <fotograma_escena3> public/edit_plate/plate.jpg
Cada fotograma: se quita su silueta (recorte en public/recorte_edit/), se rellena, se desenfoca mucho y se promedian las dos escenas
(así el fondo es el mismo a ambos lados del corte de los 12,70 s)."""
import sys, cv2, numpy as np
from PIL import Image
ks, out = sys.argv[1:-1], sys.argv[-1]
acc = []
for k in ks:
    im = cv2.imread(f"out/e_all/f_{int(k):04d}.jpg")
    a = np.asarray(Image.open(f"public/recorte_edit/m_{int(k):04d}.webp").convert("RGBA"))[..., 3]
    m = cv2.dilate((a > 8).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61)))
    s = 6
    small = cv2.resize(im, None, fx=1 / s, fy=1 / s, interpolation=cv2.INTER_AREA)
    ms = cv2.resize(m, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    fill = cv2.inpaint(small, ms, 9, cv2.INPAINT_TELEA)
    fill = cv2.resize(fill, (im.shape[1], im.shape[0]), interpolation=cv2.INTER_CUBIC)
    acc.append(cv2.GaussianBlur(fill, (0, 0), 70).astype(np.float32))
p = np.mean(acc, axis=0)
p = cv2.GaussianBlur(p, (0, 0), 40)
hsv = cv2.cvtColor(np.clip(p, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
hsv[..., 1] = np.clip(hsv[..., 1] * 1.18, 0, 255); hsv[..., 2] = np.clip(hsv[..., 2] * 0.9, 0, 255)
p = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
h, w = p.shape[:2]
yy, xx = np.mgrid[0:h, 0:w]
vig = 1 - 0.28 * np.clip(((xx - w / 2) / (w * 0.75)) ** 2 + ((yy - h * 0.5) / (h * 0.75)) ** 2, 0, 1)
p = p * vig[..., None]
# se mezcla con un degradado azul profundo (el color del panel) para que el fondo quede limpio y los marcos blancos y dorados destaquen
t = np.linspace(0, 1, h)[:, None]
top, mid, bot = np.array([48, 34, 12.]), np.array([87, 67, 22.]), np.array([40, 31, 13.])   # BGR de #0c2230, #164357, #0d1f2b
grad = np.where(t < 0.5, top + (mid - top) * (t / 0.5), mid + (bot - mid) * ((t - 0.5) / 0.5))
grad = np.repeat(grad[:, None, :], w, axis=1) * (1 - 0.25 * np.clip(((xx - w / 2) / (w * 0.7)) ** 2, 0, 1))[..., None]
wg = (0.58 + 0.27 * np.clip((t - 0.78) / 0.2, 0, 1))[..., None]   # abajo (la mesa de madera) pesa más el azul para que no quede una franja marrón
p = np.clip((1 - wg) * p + wg * grad, 0, 255).astype(np.uint8)
cv2.imwrite(out, p, [cv2.IMWRITE_JPEG_QUALITY, 95]); print("plate", p.shape)
