"""Recorta al sujeto de un video y genera public/source.mp4 + public/subject/s_NNNN.webp.

Uso (desde remotion-video/):
    pip install onnxruntime pillow numpy huggingface_hub
    python3 tools/make_subject.py public/IMG_8644.MOV

Requiere ffmpeg. Descarga el modelo MODNet (Xenova/modnet) de Hugging Face.
"""
import os, subprocess, sys, tempfile, glob
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter
from huggingface_hub import hf_hub_download

src = sys.argv[1]
out_dir = "public"
os.makedirs(f"{out_dir}/subject", exist_ok=True)
tmp = tempfile.mkdtemp()

# 1) Copia 1080x1920 a 30 fps en H.264 (la rotación del móvil se aplica sola)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf",
                "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p", "-c:v", "libx264",
                "-crf", "20", "-r", "30", "-movflags", "+faststart", "-c:a", "aac",
                f"{out_dir}/source.mp4"], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{out_dir}/source.mp4",
                f"{tmp}/f_%04d.png"], check=True)

# 2) Matte por fotograma con MODNet
sess = ort.InferenceSession(hf_hub_download("Xenova/modnet", "onnx/model.onnx"),
                            providers=["CPUExecutionProvider"])
name = sess.get_inputs()[0].name

def matte(img):
    w, h = img.size
    x = np.asarray(img.convert("RGB").resize((480, 864), Image.BILINEAR), np.float32)
    x = ((x - 127.5) / 127.5).transpose(2, 0, 1)[None]
    m = sess.run(None, {name: x})[0][0, 0]
    m = Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)
    return np.asarray(m, np.float32) / 255

files = sorted(glob.glob(f"{tmp}/f_*.png"))
small = [matte(Image.open(f).resize((540, 960))) for f in files]

# 3) Suavizado temporal, borde más duro y exportación RGBA (webp)
for i, f in enumerate(files):
    a = 0.25 * small[max(i - 1, 0)] + 0.5 * small[i] + 0.25 * small[min(i + 1, len(small) - 1)]
    a = np.clip((a - 0.15) / 0.7, 0, 1)
    a = Image.fromarray((a * 255).astype(np.uint8)).resize((1080, 1920), Image.BICUBIC)
    a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.0))
    im = Image.open(f).convert("RGB"); im.putalpha(a)
    im.save(f"{out_dir}/subject/s_{i + 1:04d}.webp", "WEBP", quality=88, alpha_quality=95, method=4)
print("Listo:", len(files), "fotogramas")
