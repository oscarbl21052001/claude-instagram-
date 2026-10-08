"""Probabilidad de "calle" por fotograma con SegFormer-B5 (ADE20K, clase "road").

Uso: python tools/calle/segmentar_calle.py <carpeta con f_NNNN.jpg 1080x1920> <salida> [paso]
Salida: road_NNNN.npy (probabilidad de calle, uint8 0-255, 1920x1080) y occ_NNNN.npy (1 = árbol, planta, coche,
persona, camión...: lo que puede tapar la calle; no edificios ni vallas). Con "paso" solo procesa 1 de cada N fotogramas
(más el último); el resto se propaga con la homografía del giro.
Modelo: nvidia/segformer-b5-finetuned-ade-640-640 (Hugging Face). Requiere torch, transformers, pillow, numpy.
Se alimenta con proporción vertical (640x1152) en vez de recortar a cuadrado.
"""
import glob, os, sys
import numpy as np, torch
from PIL import Image
from transformers import SegformerForSemanticSegmentation

src, out = sys.argv[1], sys.argv[2]
step = int(sys.argv[3]) if len(sys.argv) > 3 else 1
os.makedirs(out, exist_ok=True)
m = SegformerForSemanticSegmentation.from_pretrained("nvidia/segformer-b5-finetuned-ade-640-640").eval()
ROAD = [i for i, l in m.config.id2label.items() if l == "road"][0]
OCC_NAMES = ("tree", "plant", "car", "person", "van", "truck", "bus", "bicycle", "boat")  # lo que se mete en la calle; no edificios ni vallas
OCC = [i for i, l in m.config.id2label.items() if l.startswith(OCC_NAMES)]
mean, std = np.array([0.485, 0.456, 0.406], np.float32), np.array([0.229, 0.224, 0.225], np.float32)
torch.set_num_threads(os.cpu_count() or 4)
files = sorted(glob.glob(os.path.join(src, "f_*.jpg")))
for k, f in enumerate(files):
    if k % step and k != len(files) - 1:
        continue
    n = os.path.basename(f)[2:6]
    im = Image.open(f).convert("RGB")
    x = (np.asarray(im.resize((640, 1152), Image.BICUBIC), np.float32) / 255 - mean) / std
    x = torch.from_numpy(x.transpose(2, 0, 1)[None])
    with torch.no_grad():
        lg = m(pixel_values=x).logits
    pr = torch.softmax(torch.nn.functional.interpolate(lg, size=(1920, 1080), mode="bilinear"), 1)[0]
    np.save(os.path.join(out, f"road_{n}.npy"), (pr[ROAD].numpy() * 255).astype(np.uint8))
    np.save(os.path.join(out, f"occ_{n}.npy"), np.isin(pr.argmax(0).numpy(), OCC).astype(np.uint8))
    print(n, flush=True)
