"""SFX del edit nuevo (SPOT 335 VIDEO): un whoosh por transición + brisa/ola en el cierre. Salida: public/nuevo/sfx.wav (44,1 kHz mono, 34,2 s)."""
import numpy as np, wave
SR = 44100
rng = np.random.default_rng(335)
HOLD = 0 / 30  # segundos que se alarga el edificio (0 = sin alargar); todo lo posterior al corte 1 se desplaza
N = int((34.2 + HOLD) * SR)
out = np.zeros(N)

def pink(n):
    w = rng.standard_normal(n); W = np.fft.rfft(w); f = np.arange(len(W)); f[0] = 1
    return np.fft.irfft(W / np.sqrt(f), n)

def sweep(x, f0, f1):
    """paso bajo de un polo con frecuencia de corte variable f0→f1 (Hz)"""
    fc = np.linspace(f0, f1, len(x)); a = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s += a[i] * (x[i] - s); y[i] = s
    return y

def whoosh(t0, t_peak, t_end, amp, f0=300, f1=5000):
    """sube de t0 a t_peak (corte) y cae hasta t_end"""
    n = int((t_end - t0) * SR); x = pink(n); x = sweep(x, f0, f1)
    t = np.arange(n) / SR; up = t_peak - t0
    env = np.where(t < up, (t / up) ** 2.0, np.exp(-(t - up) * 7.0))
    y = x * env; y /= np.abs(y).max() + 1e-9
    i0 = int((t0 + HOLD) * SR); out[i0:i0 + n] += y * amp

# amp = pico relativo (voz ≈ −21 dB RMS ≈ 0,09; los whoosh quedan ~−12 dB bajo la voz)
whoosh(9.40, 9.80, 10.15, 0.060)                 # 1 edificio → ella (pausa 9,70–9,80)
whoosh(14.28, 14.53, 14.85, 0.045, 400, 4500)    # 2 ella → calle (match cut, más sutil)
whoosh(19.00, 19.27, 19.45, 0.055, 500, 6500)    # 3 calle → ella (whip pan; cae antes de que hable, 19,3)
# 4 ella → dron (22,9 s): corte limpio, sin sonido añadido
whoosh(25.40, 25.83, 25.92, 0.060, 200, 6000)    # 5 dron → ella (crash zoom; hueco 25,6–25,85)
# 6 ola/brisa bajo la voz al entrar en la playa
n = int(1.5 * SR); t = np.arange(n) / SR
ola = sweep(pink(n), 700, 1800) * (np.sin(np.pi * t / 1.5) ** 2); ola /= np.abs(ola).max()
i0 = int((28.55 + HOLD) * SR); out[i0:i0 + n] += ola * 0.030
# impacto sordo corto en el corte 5
n = int(0.25 * SR); t = np.arange(n) / SR
thump = np.sin(2 * np.pi * 60 * t * np.exp(-t * 6)) * np.exp(-t * 14)
i0 = int((25.83 + HOLD) * SR); out[i0:i0 + n] += thump * 0.07
# lecho de aire en la pausa alargada (evita silencio digital)
if HOLD > 0:
  n = int((HOLD + 0.1) * SR); t = np.arange(n) / SR
  lecho = sweep(pink(n), 500, 900) * np.minimum(1, np.minimum(t / 0.1, (n / SR - t) / 0.1)); lecho /= np.abs(lecho).max()
  i0 = int(9.75 * SR); out[i0:i0 + n] += lecho * 0.012
out = np.clip(out, -0.9, 0.9)
with wave.open("public/nuevo/sfx.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype("<i2").tobytes())
print("ok", len(out) / SR)
