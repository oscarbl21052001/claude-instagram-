"""Limpia CONSTRUCTORA.mov (grabación de pantalla de una historia): recorte del borde/interfaz y borrado de logos y textos.
Entrada: out/cof/NNN.png (fotogramas originales 1440x2530). Salida: out/cok/NNN.png (1440x2530, ya recortado y reescalado)."""
import cv2, numpy as np, sys, os
CROP = (80, 150, 1360, 2400)          # x0, y0, x1, y1 -> 1280x2250 (misma proporción que 1440x2530)
ESCENA1 = range(1, 32)                 # fotogramas 1..31: oficina; 32..49: hombre junto a la ventana
K = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))

def box(h, w, x0, y0, x1, y1):
    z = np.zeros((h, w), np.uint8); z[y0:y1, x0:x1] = 1
    return z

def mascara(im, k):
    h, w = im.shape[:2]
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    Hh, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    gb = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.int16)
    gold = ((Hh >= 10) & (Hh <= 32) & (S > 90) & (V > 110)).astype(np.uint8)
    m = np.zeros((h, w), np.uint8)
    # 1) logo dorado superior y su contorno hexagonal tenue (crestas finas respecto al entorno)
    m |= cv2.dilate(gold & box(h, w, 540, 0, 900, 500), K(31))
    cres = (np.abs(gb - cv2.medianBlur(gb.astype(np.uint8), 15).astype(np.int16)) > (3 if k in ESCENA1 else 5)).astype(np.uint8)
    m |= cv2.dilate(cres & box(h, w, 340, 0, 1110, 560 if k in ESCENA1 else 700), K(11))
    # 1b) resto del avatar de la cuenta (esquina superior izquierda, asoma tras el recorte)
    m |= box(h, w, 10, 125, 170, 200)
    m |= box(h, w, 140, 125, 620, 185)      # base del texto "J.E vargas · 108 sem"
    m |= box(h, w, 1060, 125, 1420, 185)    # base de los iconos de silencio/pausa/menú
    # 2) "Atualizações!" (con su brillo)
    t2 = (np.abs(gb - cv2.medianBlur(gb.astype(np.uint8), 21).astype(np.int16)) > 9).astype(np.uint8)
    m |= cv2.dilate(t2 & box(h, w, 380, 2010, 1040, 2150), K(19))
    # 3) logo inferior: zona lisa y oscura, se rellena entera
    m |= box(h, w, 630, 2185, 810, 2400)
    # 4) letrero real de la pared (solo escena 1): letras doradas, contornos pardos y "EMPREENDIMENTOS" verde
    if k in ESCENA1:
        letras = ((Hh >= 12) & (Hh <= 34) & (S > 70) & (V > 70)).astype(np.uint8)
        letras = cv2.morphologyEx(letras, cv2.MORPH_CLOSE, K(5))
        contornos = ((Hh >= 4) & (Hh <= 30) & (S > 40) & (V > 35) & (V < 120)).astype(np.uint8)   # contornos pardos de las letras
        m |= cv2.dilate(letras & box(h, w, 190, 900, 1165, 1180), K(27))
        m |= cv2.dilate(contornos & box(h, w, 190, 900, 880, 1180), K(25))
        green = ((Hh >= 60) & (Hh <= 100) & (S > 60) & (V > 70)).astype(np.uint8)
        m |= cv2.dilate(green & box(h, w, 470, 1150, 1080, 1270), K(27))
    return m

_LAMA = None
def lama():
    global _LAMA
    if _LAMA is None:
        import torch
        from huggingface_hub import hf_hub_download
        _LAMA = torch.jit.load(hf_hub_download("fashn-ai/LaMa", "big-lama.pt"), map_location="cpu").eval()
    return _LAMA

def rellenar(im, m, zona, esc=0.5):
    """LaMa (big-lama, TorchScript) sobre un recorte; pega el resultado solo donde hay máscara (borde suave)."""
    import torch
    x0, y0, x1, y1 = zona
    crop = cv2.cvtColor(im[y0:y1, x0:x1], cv2.COLOR_BGR2RGB); mk = (m[y0:y1, x0:x1] > 0).astype(np.uint8)
    if mk.sum() == 0:
        return im
    h0, w0 = crop.shape[:2]
    crop = cv2.resize(crop, (int(w0 * esc), int(h0 * esc)), interpolation=cv2.INTER_AREA)        # LaMa a media resolución (la imagen ya es blanda)
    mk_full = mk
    mk = (cv2.resize(mk.astype(np.float32), (crop.shape[1], crop.shape[0]), interpolation=cv2.INTER_AREA) > 0.2).astype(np.uint8)
    h, w = crop.shape[:2]; H, W = (h + 7) // 8 * 8, (w + 7) // 8 * 8
    cr = np.pad(crop, ((0, H - h), (0, W - w), (0, 0)), mode="reflect"); mm = np.pad(mk, ((0, H - h), (0, W - w)), mode="reflect")
    t = torch.from_numpy(cr).permute(2, 0, 1)[None].float() / 255; mt = torch.from_numpy(mm.astype(np.float32))[None, None]
    with torch.no_grad():
        o = lama()(t, mt)
    o = (o[0].permute(1, 2, 0).numpy() * 255).clip(0, 255).astype(np.uint8)[:h, :w]
    o = cv2.cvtColor(cv2.resize(o, (w0, h0), interpolation=cv2.INTER_CUBIC), cv2.COLOR_RGB2BGR)
    a = cv2.GaussianBlur(mk_full.astype(np.float32), (0, 0), 2.0)[..., None]
    res = im.copy(); res[y0:y1, x0:x1] = (im[y0:y1, x0:x1] * (1 - a) + o * a).astype(np.uint8)
    return res

ZONAS = [(0, 100, 260, 260), (100, 100, 700, 260), (1040, 100, 1440, 260), (300, 0, 1140, 760), (360, 1990, 1060, 2170), (600, 2170, 840, 2420)]
ZONA_LETRERO = (120, 840, 1240, 1280)

def procesar(k):
    im = cv2.imread(f"out/cof/{k:03d}.png")
    m = mascara(im, k)
    x0, y0, x1, y1 = CROP
    out = im
    for z in ZONAS + ([ZONA_LETRERO] if k in ESCENA1 else []):
        out = rellenar(out, m, z)
    out = cv2.resize(out[y0:y1, x0:x1], (1440, 2530), interpolation=cv2.INTER_LANCZOS4)
    return out, m

if __name__ == "__main__":
    os.makedirs("out/cok", exist_ok=True)
    ks = [int(a) for a in sys.argv[1:]] or range(1, 50)
    for k in ks:
        o, m = procesar(k)
        cv2.imwrite(f"out/cok/{k:03d}.png", o)
        cv2.imwrite(f"out/cok/m{k:03d}.png", m * 255)
        print(k, int(m.sum()), end=" | ", flush=True)
