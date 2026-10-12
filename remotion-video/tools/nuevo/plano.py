"""Texto plano (sin perspectiva) con Montserrat Black: etiquetas oscuras (tamaño L) y valores verdes (tamaño V), apilados con hueco G entre cajas de glifos.
render(lineas, L, V, G, align) -> (RGBA uint8 de 1080x1920*ss, cajas)."""
import os, numpy as np
from PIL import Image, ImageDraw, ImageFont
FONT = os.path.join(os.path.dirname(__file__), "fuentes", "Montserrat-VF.ttf")
BRIGHT, DARK = (2, 151, 49), (7, 42, 2)
OX, OY = 60, 100
def fuente(sz, w=900):
    f = ImageFont.truetype(FONT, int(round(sz))); f.set_variation_by_axes([w]); return f
def render(lineas, L, V, G, align="l", ss=1, w=900, tracking=0.0, ancho=None):
    im = Image.new("RGBA", (1080 * ss, 1920 * ss), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    info = []
    for t, tp in lineas:
        sz = (L if tp == "e" else V) * ss; f = fuente(sz, w)
        x0, y0, x1, y1 = d.textbbox((0, 0), t, font=f, anchor="ls")
        info.append((t, tp, f, x0, y0, x1, y1))
    W = max(i[5] - i[3] for i in info) if ancho is None else ancho * ss
    y = OY * ss; cajas = []
    for t, tp, f, x0, y0, x1, y1 in info:
        col = DARK if tp == "e" else BRIGHT; wl = x1 - x0
        x = OX * ss + (0 if align == "l" else (W - wl) / 2 if align == "c" else W - wl)
        d.text((x - x0, y - y0), t, font=f, fill=col + (255,), anchor="ls")
        cajas.append((x, y, x + wl, y + (y1 - y0))); y += (y1 - y0) + G * ss
    return np.asarray(im), cajas
