"""Utilidades para reescribir el texto de la calle en CAMBIO.mp4 (tools/cambio/)."""
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

TEX_W, TEX_H = 1800, 1000  # textura del texto (igual que en CalleDorada)

def masks(k, root="out/full"):
    im = cv2.imread(f"{root}/{k:03d}.png")
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    Y = ((hsv[..., 0] > 14) & (hsv[..., 0] < 36) & (hsv[..., 1] > 110) & (hsv[..., 2] > 110)).astype(np.uint8)
    Yc = cv2.morphologyEx(Y, cv2.MORPH_CLOSE, np.ones((41, 41), np.uint8))
    white = ((hsv[..., 1] < 70) & (hsv[..., 2] > 185)).astype(np.uint8)
    T = cv2.morphologyEx(white & Yc, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return im, Y, Yc, T

def render_text(lines, size=420, spacing=6, font="/tmp/bebas.ttf"):
    """Texto en la textura (blanco sobre negro, L). Mismo diseño que CalleEscena: centrado, interlineado 0,9, tracking 6 px."""
    f = ImageFont.truetype(font, size)
    img = Image.new("L", (TEX_W, TEX_H), 0)
    d = ImageDraw.Draw(img)
    lh = size * 0.9
    top = TEX_H / 2 - lh * len(lines) / 2
    widths = []
    for i, line in enumerate(lines):
        w = sum(f.getlength(c) + spacing for c in line) - spacing
        widths.append(w)
        x = TEX_W / 2 - w / 2
        # y de la línea: caja de línea [top+i*lh, top+(i+1)*lh], glifo centrado en la caja
        asc, desc = f.getmetrics()
        y = top + i * lh + (lh - (asc + desc)) / 2
        for c in line:
            d.text((x, y), c, font=f, fill=255)
            x += f.getlength(c) + spacing
    return np.asarray(img), widths
