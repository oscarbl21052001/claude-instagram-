"""Efectos de sonido sintéticos (sin archivos de terceros) para la edición "VideoIdeas".

Uso: python tools/sfx/sfx_ideas.py public/audio/sfx_ideas.wav
Genera un WAV estéreo de 44,1 kHz y 7,4 s con clics, "whoosh", un golpe grave y un acorde suave, colocados en los
segundos de las palabras clave (ver EVENTOS). Volumen bajo a propósito: la voz del clip es muy baja (-26,8 dB de media)
y los efectos no deben taparla. Requiere numpy y scipy.
"""
import sys, wave
import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
DUR = 7.4
rng = np.random.default_rng(7)
out = np.zeros(int(SR * DUR))


def add(t0, x):
    i = int(t0 * SR)
    out[i : i + len(x)] += x[: max(0, len(out) - i)]


def tick(t0, f=1500, amp=0.10):
    n = int(0.045 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 90) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 140)
    add(t0, amp * x)


def whoosh(t0, dur, f0, f1, amp=0.10, rise=True):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    y = np.zeros(n)
    chunks = 14
    for k in range(chunks):
        a, b = k * n // chunks, (k + 1) * n // chunks
        fc = f0 * (f1 / f0) ** (k / (chunks - 1))
        bb, aa = butter(2, [max(80, fc * 0.6) / (SR / 2), min(0.95, fc * 1.4 / (SR / 2))], btype="band")
        y[a:b] = lfilter(bb, aa, noise[max(0, a - 400) : b])[-(b - a) :]
    p = np.linspace(0, 1, n)
    env = np.sin(np.pi * p) ** 2 if not rise else p**1.6 * (1 - 0.15 * p)
    add(t0, amp * y / (np.abs(y).max() + 1e-9) * env)


def thud(t0, amp=0.2, f=75):
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    fr = f * np.exp(-t * 4) + 38
    add(t0, amp * np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 11))


def chime(t0, amp=0.07):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 880 * t) + 0.6 * np.sin(2 * np.pi * 1318.5 * t) + 0.3 * np.sin(2 * np.pi * 1760 * t)
    add(t0, amp * x * np.exp(-t * 5.5) * np.minimum(1, t * 400))


def swipe(t0, amp=0.07):
    whoosh(t0, 0.16, 2500, 6000, amp, rise=False)


# --- EVENTOS (segundos, de la transcripción por palabras) ---
# (sin sonidos para las etiquetas: ya no hay etiquetas, solo tarjetas)
thud(2.10, 0.12)  # VALOR
tick(2.10, 900, 0.08)
swipe(2.95)  # línea que tacha VALOR
whoosh(3.00, 0.27, 450, 4200, 0.16)  # zoom hacia delante
thud(3.2667, 0.28)  # corte
whoosh(3.28, 0.40, 3200, 600, 0.10, rise=False)  # el plano se asienta
whoosh(4.48, 0.22, 800, 2400, 0.07, rise=False)
tick(4.50, 1300, 0.10)  # CÓMO
tick(5.15, 2000, 0.08)  # +
whoosh(5.24, 0.22, 800, 2600, 0.07, rise=False)
tick(5.26, 1500, 0.10)  # CUÁNDO
tick(5.55, 2300, 0.08)  # =
thud(5.62, 0.14, 65)
chime(5.64)  # INGRESAR

peak = np.abs(out).max()
out = out / peak * 0.16  # pico ~ -16 dBFS: discreto frente a la voz
st = np.stack([out, out], 1)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
print("ok", sys.argv[1], f"pico {20*np.log10(0.16):.1f} dBFS")
