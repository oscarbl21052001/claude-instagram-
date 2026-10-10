"""Recorte de alta calidad por escena para CAPRI (paso 1 y 2 en un solo script).
 1) MODNet "crudo" (sin rellenos) por fotograma -> out/raw/NNNN.png (alfa 0-255, 1080x1920).
 2) Trimap a partir del MODNet suavizado en el tiempo (±1 fotograma, sin cruzar los cortes) y ViTMatte (hustvl/vitmatte-small-distinctions-646)
    sobre el recuadro de ella -> out/vt/NNNN.png.
Uso: python tools/capri/recorte_hq.py [desde hasta]   (por defecto 290..1049).  Reanuda: salta los fotogramas ya hechos.
Luego: python tools/capri/recorte_post.py  (suavizado temporal, descontaminación de color y corte contra la mesa)."""
import os, sys, glob, time
import numpy as np, cv2, torch
from PIL import Image
import onnxruntime as ort
from huggingface_hub import hf_hub_download
CUT1, CUT2 = 314, 635
def escena(k): return 0 if k < CUT1 else 1 if k < CUT2 else 2
A, B = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (290, 1049)
sess = ort.InferenceSession(hf_hub_download("Xenova/modnet", "onnx/model.onnx"), providers=["CPUExecutionProvider"])
iname = sess.get_inputs()[0].name
def modnet(path):
    img = Image.open(path).convert("RGB"); w, h = img.size
    x = np.asarray(img.resize((480, 864), Image.BILINEAR), np.float32)
    x = ((x - 127.5) / 127.5).transpose(2, 0, 1)[None]
    m = sess.run(None, {iname: x})[0][0, 0]
    return np.asarray(Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC))
t0 = time.time()
for k in range(A, B + 1):
    f = f"out/raw/{k:04d}.png"
    if not os.path.exists(f):
        cv2.imwrite(f, modnet(f"out/e_all/f_{k:04d}.jpg"))
print("MODNet crudo listo", round(time.time() - t0), "s", flush=True)
from transformers import VitMatteForImageMatting, VitMatteImageProcessor
name = "hustvl/vitmatte-small-distinctions-646"
proc = VitMatteImageProcessor.from_pretrained(name); model = VitMatteForImageMatting.from_pretrained(name).eval()
K = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
for k in range(A, B + 1):
    f = f"out/vt/{k:04d}.png"
    if os.path.exists(f): continue
    ks = [j for j in (k - 1, k, k + 1) if A <= j <= B and escena(j) == escena(k)]
    ws = {k: 0.5}; 
    for j in ks:
        if j != k: ws[j] = 0.25
    tot = sum(ws[j] for j in ks)
    raw = sum(ws[j] * cv2.imread(f"out/raw/{j:04d}.png", 0).astype(np.float32) for j in ks) / tot / 255
    fg = cv2.erode((raw > 0.97).astype(np.uint8), K(11))
    bg = 1 - cv2.dilate((raw > 0.04).astype(np.uint8), K(35))
    tri = np.full(raw.shape, 128, np.uint8); tri[fg > 0] = 255; tri[bg > 0] = 0
    ys, xs = np.where(raw > 0.04)
    if len(ys) == 0:
        cv2.imwrite(f, np.zeros(raw.shape, np.uint8)); continue
    y0, y1 = max(ys.min() - 50, 0), min(ys.max() + 40, 1920); x0, x1 = max(xs.min() - 60, 0), min(xs.max() + 60, 1080)
    im = Image.open(f"out/e_all/f_{k:04d}.jpg").convert("RGB")
    crop = im.crop((x0, y0, x1, y1)); tc = Image.fromarray(tri[y0:y1, x0:x1])
    inp = proc(images=crop, trimaps=tc, return_tensors="pt")
    with torch.no_grad():
        al = model(**inp).alphas[0, 0].numpy()[: crop.size[1], : crop.size[0]]
    full = np.zeros(raw.shape, np.float32); full[y0:y1, x0:x1] = al
    full[tri == 255] = 1.0; full[tri == 0] = 0.0
    cv2.imwrite(f, (np.clip(full, 0, 1) * 255).astype(np.uint8))
    if k % 20 == 0: print(k, round(time.time() - t0), "s", flush=True)
print("VT_DONE", flush=True)
