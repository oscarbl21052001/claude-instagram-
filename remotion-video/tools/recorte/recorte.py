"""Recorte de la persona por fotograma (MODNet, ONNX en CPU) y seguimiento de la cabeza.

Uso: python tools/recorte/recorte.py <carpeta_fotogramas_jpg> <carpeta_salida> <seguimiento.json|.ts>
Entrada: fotogramas f_NNNN.jpg 1080x1920 (el número = fotograma del video a 30 fps).
Salida: m_NNNN.webp (RGBA, 1080x1920) y la posición de la cabeza suavizada por fotograma (JSON, o módulo TypeScript si el destino acaba en .ts).
Modelo: Xenova/modnet (onnx/model.onnx), entrada 480x864. Requiere: onnxruntime pillow numpy huggingface_hub scipy.
"""
import glob, json, os, sys
import numpy as np, onnxruntime as ort
from PIL import Image, ImageFilter
from huggingface_hub import hf_hub_download
from scipy.ndimage import gaussian_filter1d, label, binary_dilation, binary_erosion, binary_closing, binary_fill_holes

src, out, track = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
sess = ort.InferenceSession(hf_hub_download("Xenova/modnet", "onnx/model.onnx"), providers=["CPUExecutionProvider"])
iname = sess.get_inputs()[0].name
files = sorted(glob.glob(os.path.join(src, "f_*.jpg")))
nums = [int(os.path.basename(f)[2:6]) for f in files]


def matte(img):
    w, h = img.size
    x = np.asarray(img.convert("RGB").resize((480, 864), Image.BILINEAR), np.float32)
    x = ((x - 127.5) / 127.5).transpose(2, 0, 1)[None]
    m = sess.run(None, {iname: x})[0][0, 0]
    return np.asarray(Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), np.float32) / 255


ms = [matte(Image.open(f)) for f in files]
heads = []
for i, (f, n) in enumerate(zip(files, nums)):
    a = 0.25 * ms[max(i - 1, 0)] + 0.5 * ms[i] + 0.25 * ms[min(i + 1, len(ms) - 1)]  # suavizado temporal
    lab, k = label(a > 0.5)  # masas grandes (cuerpo, manos); descarta manchas y la silueta fantasma débil
    core = np.zeros(a.shape, bool)
    if k:
        areas = np.bincount(lab.ravel())[1:]
        core = np.isin(lab, 1 + np.where(areas > 0.04 * areas.max())[0])
        core = binary_fill_holes(binary_closing(core, iterations=18))  # tapa huecos (pelo oscuro, camisa)
    soft = np.clip((a - 0.15) / 0.7, 0, 1)
    a = np.where(binary_erosion(core, iterations=7), 1.0, soft * binary_dilation(core, iterations=10))
    a8 = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)))
    rgb = np.asarray(Image.open(f).convert("RGB"))
    Image.fromarray(np.dstack([rgb, a8]), "RGBA").save(os.path.join(out, f"m_{n:04d}.webp"), quality=88, method=4)
    # cabeza: primera fila con masa suficiente; centro horizontal de las 220 filas siguientes
    rows = np.where((a > 0.5).sum(axis=1) > 90)[0]
    top = int(rows[0]) if len(rows) else 700
    band = a[top : top + 220] > 0.5
    xs = np.where(band.any(axis=0))[0]
    heads.append((float(xs.mean()) if len(xs) else 540.0, float(top)))
h = np.array(heads)
hs = gaussian_filter1d(h, sigma=12, axis=0, mode="nearest")
if track.endswith(".ts"):  # módulo para la composición (p. ej. src/Edit/head.ts)
    rows = ",".join(f"[{x:.0f},{y:.0f}]" for x, y in hs)
    open(track, "w").write(
        "// Centro de la cabeza (x, coronilla y) en px del video 1080x1920 por fotograma, suavizado.\n"
        "// Generado por tools/recorte/recorte.py; el PIP lo usa como cámara virtual.\n"
        f"export const HEAD_FIRST = {nums[0]};\nexport const HEAD_LAST = {nums[-1]};\n"
        f"export const HEAD: [number, number][] = [{rows}];\n"
    )
else:
    json.dump({str(n): [round(x, 1), round(y, 1)] for n, (x, y) in zip(nums, hs)}, open(track, "w"))
print("fotogramas:", len(files))
