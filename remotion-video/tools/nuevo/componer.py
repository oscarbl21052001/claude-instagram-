"""NUEVO.mov: compone el texto nuevo ("CUOTAS PERSONALIZADAS" / "ANTICIPO 10%") sobre los fotogramas rellenados (222..378).
Mismo efecto que el original: perspectiva 3D + zoom seguidos (H2.json, plano P.npy) y mismo viraje de color de la transición
(el color de cada categoría se mide en el texto viejo, fotograma a fotograma). Uso: componer.py <dir> [desde hasta]  -> <dir>/out/f_NNNN.jpg"""
import sys, os, json, cv2, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from mascara import mascara
import plano
S = sys.argv[1]
A, B = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (222, 378)
P = np.load(f"{S}/P.npy"); cfg = json.load(open(f"{S}/plano.json"))
H2 = {int(k): np.array(v) for k, v in json.load(open(f"{S}/H2.json")).items()}
for k in range(374, 379): H2[k] = np.eye(3)
SS = 2
# --- diseño del texto nuevo (coordenadas planas) ---
L_OLD, V_OLD, G = cfg["L"], cfg["V"], cfg["G"]
LIN_OLD = [("CUOTAS", "e"), ("$500", "v"), ("ANTICIPO", "e"), ("$10.000", "v")]
_, cajas_old = plano.render(LIN_OLD, L_OLD, V_OLD, G, cfg["align"])
old_top, old_bot = cajas_old[0][1], cajas_old[-1][3]
W_OLD = max(c[2] - c[0] for c in cajas_old)
L_NEW = float(os.environ.get("L_NEW", 75)); WMAX = float(os.environ.get("WMAX", 900)); G_NEW = float(os.environ.get("G_NEW", 16))
def ancho(t, sz): b = plano.fuente(sz).getbbox(t, anchor="ls"); return b[2] - b[0]
def alto(t, sz): b = plano.fuente(sz).getbbox(t, anchor="ls"); return b[3] - b[1]
V1 = V_OLD * WMAX / ancho("PERSONALIZADAS", V_OLD)
# "10%" lo más grande posible para que el bloque nuevo ocupe el mismo alto que el viejo (mismo reparto de pesos: valores grandes, etiquetas pequeñas)
H_OLD = old_bot - old_top
lo, hi = 40.0, 400.0
for _ in range(30):
    V2 = (lo + hi) / 2
    h = alto("CUOTAS", L_NEW) + alto("PERSONALIZADAS", V1) + alto("ANTICIPO", L_NEW) + alto("10%", V2) + 3 * G_NEW
    lo, hi = (V2, hi) if h < H_OLD else (lo, V2)
V2 = float(os.environ.get("V2", min(V2, 330)))
print("tamaños planos: etiquetas", L_NEW, "PERSONALIZADAS", round(V1, 1), "10%", round(V2, 1), "ancho 10%", round(ancho("10%", V2)), "alto bloque", round(H_OLD), flush=True)
LIN_NEW = [("CUOTAS", "e", L_NEW), ("PERSONALIZADAS", "v", V1), ("ANTICIPO", "e", L_NEW), ("10%", "v", V2)]
def capa(tipo, ss):
    """alfa (float 0..1) de las líneas de un tipo ('e' etiquetas / 'v' valores), plano, a ss x."""
    # alturas de cajas para apilar y centrar el bloque donde estaba el viejo
    from PIL import Image, ImageDraw
    d0 = ImageDraw.Draw(Image.new("L", (10, 10)))
    cajas = []
    for t, tp, sz in LIN_NEW:
        x0, y0, x1, y1 = d0.textbbox((0, 0), t, font=plano.fuente(sz * ss), anchor="ls"); cajas.append((x0, y0, x1, y1))
    alt = sum((c[3] - c[1]) for c in cajas) + G_NEW * ss * (len(cajas) - 1)
    y = (old_top + old_bot) / 2 * ss - alt / 2
    im = Image.new("L", (1080 * ss, 1920 * ss), 0); d = ImageDraw.Draw(im)
    for (t, tp, sz), (x0, y0, x1, y1) in zip(LIN_NEW, cajas):
        if tp == tipo: d.text((plano.OX * ss - x0, y - y0), t, font=plano.fuente(sz * ss), fill=255, anchor="ls")
        y += (y1 - y0) + G_NEW * ss
    return np.asarray(im).astype(np.float32) / 255
def aplicar(capa_ss, M):
    S2 = np.diag([2.0, 2.0, 1.0]); Sd = np.diag([1.0 / SS, 1.0 / SS, 1.0])
    big = cv2.warpPerspective(capa_ss, S2 @ M @ Sd, (1080 * 2, 1920 * 2), flags=cv2.INTER_CUBIC)
    return cv2.GaussianBlur(cv2.resize(big, (1080, 1920), interpolation=cv2.INTER_AREA), (0, 0), 0.6).clip(0, 1)
# --- categorías del texto viejo en el fotograma de referencia (para medir el color en cada fotograma) ---
ref_im = cv2.imread(f"{S}/frj/f_0373.jpg"); _, core = mascara(ref_im)
rgb = cv2.cvtColor(ref_im, cv2.COLOR_BGR2RGB).astype(np.int16)
dark_ref = ((np.abs(rgb - np.array([7, 42, 2])).sum(2) < 70) & (core > 0)).astype(np.uint8); bright_ref = ((core > 0) & (dark_ref == 0)).astype(np.uint8)
E7 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
dark_ref, bright_ref = cv2.erode(dark_ref, E7), cv2.erode(bright_ref, E7)
LAYER_E, LAYER_V = capa("e", SS), capa("v", SS)
def color(im_rgb, ref_mask, Hk):
    w = cv2.warpPerspective(ref_mask, Hk, (1080, 1920), flags=cv2.INTER_NEAREST) > 0
    if w.sum() < 50: return None
    return im_rgb[w].mean(0)
if __name__ == "__main__":
    os.makedirs(f"{S}/out", exist_ok=True)
    prev = None
    for k in range(A, B + 1):
        orig = cv2.cvtColor(cv2.imread(f"{S}/frj/f_{k:04d}.jpg"), cv2.COLOR_BGR2RGB).astype(np.float32)
        base = cv2.cvtColor(cv2.imread(f"{S}/inp/f_{k:04d}.jpg"), cv2.COLOR_BGR2RGB).astype(np.float32)
        M = H2[k] @ P
        ce, cv_ = color(orig, dark_ref, H2[k]), color(orig, bright_ref, H2[k])
        ce = ce if ce is not None else prev[0]; cv_ = cv_ if cv_ is not None else prev[1]
        prev = (ce, cv_)
        ae, av = aplicar(LAYER_E, M)[..., None], aplicar(LAYER_V, M)[..., None]
        out = base * (1 - ae) + ce * ae; out = out * (1 - av) + cv_ * av
        cv2.imwrite(f"{S}/out/f_{k:04d}.jpg", cv2.cvtColor(out.clip(0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 96])
        if k % 20 == 0: print(k, ce.round(), cv_.round(), flush=True)
    print("COMP_DONE", flush=True)
