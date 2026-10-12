"""NUEVO.mov (FHS): máscara del texto verde "CUOTAS $500 / ANTICIPO $10.000" por fotograma (1080x1920).
Verde vivo ≈ RGB(2,151,49) y verde oscuro de las etiquetas ≈ RGB(7,42,2). Solo se busca en la parte alta (y<1000)."""
import cv2, numpy as np
K = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
def mascara(im, y_max=1000):
    rgb = cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.int16)
    d1 = np.abs(rgb - np.array([2, 151, 49])).sum(2); d2 = np.abs(rgb - np.array([7, 42, 2])).sum(2)
    m = ((d1 < 120) | (d2 < 70)).astype(np.uint8)
    m[y_max:] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, K(3))      # quita puntos sueltos
    core = m.copy()
    m = cv2.dilate(cv2.morphologyEx(m, cv2.MORPH_CLOSE, K(9)), K(23))   # cubre el borde suavizado y el halo de compresión de las letras
    return m, core
