"""SFX del CTA de SOLAIA: teclas (24,1–25,5 s), clic (26,2 s) y campanita (26,25 s). Salida: public/solaia/sfx_cta.wav"""
import numpy as np, wave
SR = 44100
rng = np.random.default_rng(335)
out = np.zeros(int(27.34 * SR))

def lp(x, fc):
    a = 1 - np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s += a * (x[i] - s); y[i] = s
    return y

def tick(t0, amp, ms=14):
    n = int(ms / 1000 * SR); x = rng.standard_normal(n) * np.exp(-np.arange(n) / (n / 4)); x = x - lp(x, 900)
    i0 = int(t0 * SR); out[i0:i0 + n] += x / (np.abs(x).max() + 1e-9) * amp

N = 21
for k in range(N):
    tick(24.1 + k * (1.4 / N), 0.028)
tick(26.2, 0.07, 22)
n = int(0.5 * SR); t = np.arange(n) / SR
camp = (np.sin(2 * np.pi * 1320 * t) + 0.5 * np.sin(2 * np.pi * 1980 * t)) * np.exp(-t * 7)
i0 = int(26.25 * SR); out[i0:i0 + n] += camp / 1.5 * 0.035
out = np.clip(out, -0.9, 0.9)
with wave.open("public/solaia/sfx_cta.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype("<i2").tobytes())
print("ok")
