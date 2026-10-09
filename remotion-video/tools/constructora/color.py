"""Corrección de color de CONSTRUCTORA: quita la capa verde de la historia (más fuerte arriba, abajo y en los lados) y da un tono normal."""
import cv2, numpy as np
W, H = 1440, 2530
OX, OY, SC = 80, 150, 1280 / 1440          # salida -> coordenadas del original (recorte + reescalado)

def mapa_tinte(amp_top=17.0, amp_bot=14.0, amp_izq=6.0, amp_der=3.0):
    y = (OY + np.arange(H) * SC)[:, None]; x = (OX + np.arange(W) * SC)[None, :]
    OH, OW = 2530, 1440
    t = amp_top * np.exp(-y / 330) + amp_bot * np.exp(-(OH - y) / 330) + amp_izq * np.exp(-x / 150) + amp_der * np.exp(-(OW - x) / 150)
    return t.astype(np.float32)

_T = None
def grade(im, fuerza=1.6, exposicion=1.06, contraste=1.07, saturacion=1.06, quita_verde=0.75):
    global _T
    if _T is None: _T = mapa_tinte()
    f = im.astype(np.float32)
    B, G, R = f[..., 0], f[..., 1], f[..., 2]
    t = _T * fuerza
    G = G - 0.7 * t; R = R + 0.15 * t; B = B + 0.15 * t
    f = np.dstack([B, G, R])
    # tono: exposición, curva suave de contraste y algo de saturación
    f = np.clip(f * exposicion, 0, 255) / 255.0
    f = 0.5 + (f - 0.5) * contraste
    f = np.clip(f, 0, 1)
    hsv = cv2.cvtColor((f * 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
    # tinte verde-azulado de baja saturación (paredes, mesas, sombras): se lleva hacia neutro; los verdes vivos (vegetación) se respetan
    h_, s_ = hsv[..., 0], hsv[..., 1]
    en_tono = np.clip((h_ - 38) / 8, 0, 1) * np.clip((105 - h_) / 8, 0, 1)          # hue OpenCV 38..105 (verde→cian)
    poca_sat = np.clip((150 - s_) / 60, 0, 1)
    w = en_tono * poca_sat
    hsv[..., 1] = np.clip(s_ * (1 - quita_verde * w) * saturacion, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
