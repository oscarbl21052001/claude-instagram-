"""Probabilidad de "calle" por fotograma con SegFormer-B5 (ADE20K, clase "road").

Uso: python tools/calle/segmentar_calle.py <carpeta con f_NNNN.jpg 1080x1920> <salida>
Salida: road_NNNN.npy (uint8 0-255, 1920x1080).
Modelo: nvidia/segformer-b5-finetuned-ade-640-640 (Hugging Face). Requiere torch, transformers, pillow, numpy.
Se alimenta con proporción vertical (640x1152) en vez de recortar a cuadrado.
"""
import glob, os, sys
import numpy as np, torch
from PIL import Image
from transformers import SegformerForSemanticSegmentation

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
m = SegformerForSemanticSegmentation.from_pretrained("nvidia/segformer-b5-finetuned-ade-640-640").eval()
ROAD = [i for i, l in m.config.id2label.items() if l == "road"][0]
mean, std = np.array([0.485, 0.456, 0.406], np.float32), np.array([0.229, 0.224, 0.225], np.float32)
torch.set_num_threads(os.cpu_count() or 4)
for f in sorted(glob.glob(os.path.join(src, "f_*.jpg"))):
    n = os.path.basename(f)[2:6]
    im = Image.open(f).convert("RGB")
    x = (np.asarray(im.resize((640, 1152), Image.BICUBIC), np.float32) / 255 - mean) / std
    x = torch.from_numpy(x.transpose(2, 0, 1)[None])
    with torch.no_grad():
        lg = m(pixel_values=x).logits
    p = torch.softmax(torch.nn.functional.interpolate(lg, size=(1920, 1080), mode="bilinear"), 1)[0, ROAD]
    np.save(os.path.join(out, f"road_{n}.npy"), (p.numpy() * 255).astype(np.uint8))
    print(n, flush=True)
