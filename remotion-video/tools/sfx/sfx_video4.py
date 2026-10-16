"""Efectos de sonido sintéticos (sin archivos de terceros) para el Edit "VIDEO 4" (Video4Edit, 44 s).

Uso: python tools/sfx/sfx_video4.py <salida.wav>
Genera un WAV estéreo de 44,1 kHz y 44 s con los sonidos colocados en los segundos de cada animación (ver EVENTOS; son los mismos
tiempos que usan Receta.tsx, Esquema.tsx y Video4.tsx). Volumen bajo a propósito (pico ≈ -16 dBFS) frente a una voz de -26 dB de media.
Solo requiere numpy (filtros por FFT).
"""
import sys, wave
import numpy as np

SR = 44100
DUR = 44.0
rng = np.random.default_rng(11)
L = np.zeros(int(SR * DUR))
R = np.zeros(int(SR * DUR))


def add(t0, x, pan=0.0):
    """pan -1..1; x puede ser mono o (n, 2)."""
    i = int(t0 * SR)
    if x.ndim == 1:
        gl, gr = np.sqrt((1 - pan) / 2) * 1.414, np.sqrt((1 + pan) / 2) * 1.414
        xl, xr = x * gl, x * gr
    else:
        xl, xr = x[:, 0], x[:, 1]
    n = min(len(xl), len(L) - i)
    if n > 0:
        L[i : i + n] += xl[:n]
        R[i : i + n] += xr[:n]


def band_noise(n, lo, hi):
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    w = np.exp(-0.5 * ((np.log(np.maximum(f, 1)) - np.log(np.sqrt(lo * hi))) / (0.5 * np.log(hi / lo) + 1e-9)) ** 2)
    y = np.fft.irfft(spec * w, n)
    return y / (np.abs(y).max() + 1e-9)


def whoosh(t0, dur, f0, f1, amp=0.1, shape="rise", pan=0.0):
    """Ruido que barre de f0 a f1; 'rise' crece hacia el final, 'fall' decae, 'bell' sube y baja."""
    n = int(dur * SR)
    p = np.linspace(0, 1, n)
    centers = np.geomspace(f0, f1, 7)
    chans = []
    for _ in range(2):
        y = np.zeros(n)
        for k, c in enumerate(centers):
            pos = k / 6
            g = np.exp(-0.5 * ((p - pos) / 0.22) ** 2)
            y += band_noise(n, c * 0.7, c * 1.4) * g
        chans.append(y)
    env = {"rise": p**1.5 * (1 - 0.12 * p), "fall": (1 - p) ** 1.4 * np.minimum(1, p * 30), "bell": np.sin(np.pi * p) ** 2}[shape]
    st = np.stack(chans, 1)
    st = st / (np.abs(st).max() + 1e-9) * env[:, None] * amp
    add(t0, st if pan == 0 else st * np.array([np.sqrt((1 - pan) / 2) * 1.414, np.sqrt((1 + pan) / 2) * 1.414]))


def tick(t0, f=1500, amp=0.1, pan=0.0):
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 85) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 130)
    add(t0, amp * x, pan)


def click(t0, amp=0.1, f=2600, pan=0.0):
    """clic de ratón/tecla: ráfaga corta de ruido + golpecito grave."""
    n = int(0.035 * SR)
    t = np.arange(n) / SR
    x = band_noise(n, f * 0.6, f * 1.6) * np.exp(-t * 160) + 0.5 * np.sin(2 * np.pi * 180 * t) * np.exp(-t * 120)
    add(t0, amp * x, pan)


def thud(t0, amp=0.2, f=75, dur=0.32):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fr = f * np.exp(-t * 4) + 38
    add(t0, amp * np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 11))


def ding(t0, amp=0.08, f=1318.5):
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2 * t) + 0.25 * np.sin(2 * np.pi * f * 3 * t)
    add(t0, amp * x * np.exp(-t * 7) * np.minimum(1, t * 500))


def chime(t0, amp=0.07):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 880 * t) + 0.6 * np.sin(2 * np.pi * 1318.5 * t) + 0.3 * np.sin(2 * np.pi * 1760 * t)
    add(t0, amp * x * np.exp(-t * 5.5) * np.minimum(1, t * 400))


def clink(t0, amp=0.1, f=3150):
    """moneda de metal: parciales inarmónicos con caída rápida."""
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for a, r, d in [(1, 1, 14), (0.7, 2.76, 22), (0.5, 5.4, 34), (0.3, 8.93, 50)])
    add(t0, amp * x * np.minimum(1, t * 800))


def pop(t0, amp=0.1, f=520):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    fr = f * (1 + 1.6 * np.exp(-t * 40))
    add(t0, amp * np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 32))


def glide(t0, dur, f0, f1, amp=0.05):
    n = int(dur * SR)
    p = np.linspace(0, 1, n)
    fr = f0 * (f1 / f0) ** p
    env = np.sin(np.pi * p) ** 1.5
    add(t0, amp * np.sin(2 * np.pi * np.cumsum(fr) / SR) * env)


def scratch(t0, dur, amp=0.04):
    """lápiz sobre papel: ruido agudo con latidos irregulares."""
    n = int(dur * SR)
    p = np.linspace(0, 1, n)
    m = np.interp(np.arange(n), np.linspace(0, n, int(dur * 14)), rng.uniform(0.2, 1, int(dur * 14)))
    y = band_noise(n, 2800, 7500) * m * np.minimum(1, np.minimum(p * 20, (1 - p) * 20))
    add(t0, amp * y)


def hum(t0, dur, amp=0.03, f=95):
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = t / dur
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.03 * np.sin(2 * np.pi * 6 * t))) / SR
    y = (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * np.minimum(1, np.minimum(p * 8, (1 - p) * 8))
    add(t0, amp * y)


# ------------------------------------------------ EVENTOS (segundos; mismos que el código de la animación)
# Ella sube arriba (4,0 s) y aparece "¿CÓMO FUNCIONA?" + el edificio se dibuja
whoosh(4.0, 0.55, 300, 3200, 0.14, "bell")
pop(4.45, 0.09, 600)
scratch(4.4, 0.9, 0.05)
# Paso 1: la constructora te financia (tarjeta 5,4 s; grúa 5,6 s; billete 6,0–6,85 s; sube el nivel 6,8–7,3 s; visto 7,2 s)
click(5.4, 0.1, 2200)
hum(5.6, 0.7, 0.035)
whoosh(5.6, 0.4, 500, 2200, 0.05, "rise")
whoosh(6.3, 0.55, 2400, 500, 0.06, "fall")  # baja el gancho
thud(6.85, 0.14, 70, 0.25)  # el billete cae dentro
glide(6.8, 0.5, 320, 640, 0.045)
ding(7.2, 0.08)
whoosh(7.6, 0.55, 1800, 400, 0.07, "fall", pan=0.4)  # la grúa se retira
# Paso 2: tú inicias con capital mínimo (tarjeta 8,7 s; mano 9,2–9,8 s; suelta 10,3 s; cae 10,3–10,85 s; sube el nivel 10,55–11,05; visto 10,9)
click(8.7, 0.1, 2200)
whoosh(9.2, 0.6, 400, 2400, 0.08, "rise", pan=0.5)
clink(10.3, 0.09)  # suelta la moneda
clink(10.82, 0.07, 2700)  # cae dentro
glide(10.55, 0.5, 340, 700, 0.045)
whoosh(10.75, 0.5, 2400, 500, 0.06, "fall", pan=0.5)  # la mano se retira
ding(10.9, 0.08, 1568)
# El edificio lleno gira, se encoge y abre el iris (gira 13,2 s; iris 14,13–14,73 s)
whoosh(13.2, 0.95, 250, 5000, 0.16, "rise")
glide(13.5, 0.65, 500, 1500, 0.05)
thud(14.13, 0.3, 62, 0.45)
whoosh(14.13, 0.6, 3500, 600, 0.12, "fall")
# Esquema grande tras el iris
pop(14.9, 0.1, 480)
whoosh(14.9, 0.3, 700, 2600, 0.05, "bell")  # placa "COMPRA DE POZO"
scratch(16.4, 5.3, 0.035)  # la curva se dibuja a pluma (16,4–21,7 s)
tick(17.8, 1700, 0.07)  # banda de financiación
pop(18.3, 0.07, 700)  # nota "mayor financiación"
pop(21.4, 0.09, 560)  # marcador de plusvalía
chime(21.5, 0.05)
pop(22.65, 0.1, 480)
whoosh(22.65, 0.3, 700, 2600, 0.05, "bell")  # placa "TRES SALIDAS"
for c in (23.84, 25.3, 28.0, 29.7):
    click(c, 0.12, 2400)
pop(28.5, 0.08, 620)  # chip FINANCIA LA INVERSIÓN
ding(29.72, 0.07, 1568)  # el chip se vuelve dorado
# El iris se cierra y vuelve ella (31,03–31,63 s)
whoosh(31.03, 0.6, 600, 3800, 0.12, "rise")
thud(31.62, 0.16, 70, 0.3)
# Cierre: escribe "APALANCAMIENTO" (41,15 placa; teclas 41,72–42,5; botón 42,5; enviado 42,95)
pop(41.15, 0.09, 480)
whoosh(41.15, 0.3, 700, 2600, 0.05, "bell")
for k in range(14):
    click(41.72 + k * (0.78 / 13), 0.09 + 0.02 * ((k * 7) % 3), 2200 + 150 * (k % 4))
pop(42.5, 0.08, 620)
click(42.95, 0.12, 2000)
ding(43.0, 0.09, 1760)

peak = max(np.abs(L).max(), np.abs(R).max())
g = 0.16 / peak  # pico ≈ -16 dBFS: discreto frente a la voz
st = np.stack([L * g, R * g], 1)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes())
rms = np.sqrt(np.mean(st**2))
print("ok", sys.argv[1], f"pico {20*np.log10(0.16):.1f} dBFS, rms {20*np.log10(rms):.1f} dBFS")
