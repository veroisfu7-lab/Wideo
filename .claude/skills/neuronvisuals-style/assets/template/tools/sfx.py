# Синтез звуковой дорожки эффектов по timeline.json: звук на каждое движение.
# Классы по audio.md §3.2: суб-«бум» с падением тона (фирменный), свист, щелчок, шаги, шорох ткани, гул.
#   python -I tools/sfx.py  → public/sfx_stem.wav (48 кГц, стерео) + checks/sfx_events.csv
import json, os, sys, wave
import numpy as np
import sys as _sys; _sys.stdout.reconfigure(encoding="utf-8", errors="replace")   # консоль Windows (cp1251)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "src", "path", "timeline.json"), encoding="utf-8"))
SR, FPS = 48000, T["fps"]
N = int(T["total"] / FPS * SR) + SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
events = []

def t(n):  # длительность в отсчётах
    return np.arange(int(n)) / SR

def env(n, a=0.002, d=0.2):
    x = t(n); return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)

def lp(x, fc):  # однополюсный ФНЧ
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y

def bp(x, lo, hi):
    return lp(x, hi) - lp(x, lo)

def put(sig, frame, gain_db=0.0, pan=0.0, name=""):
    i = int(round(frame / FPS * SR)); g = 10 ** (gain_db / 20)
    pl, pr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    n = min(len(sig), N - i)
    if n <= 0: return
    L[i:i + n] += sig[:n] * g * pl * 1.414; R[i:i + n] += sig[:n] * g * pr * 1.414
    events.append((frame, name, round(gain_db, 1), round(pan, 2)))

# ---------------------------------------------------------------- генераторы
def boom(f0=240, f1=62, frames=9, tail=0.33):
    n = int(SR * (tail + 0.1)); x = t(n)
    k = np.log(f1 / f0) / (frames / FPS)
    fr = np.maximum(f1, f0 * np.exp(k * x))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    s = np.sin(ph) * env(n, 0.001, tail) + 0.25 * np.sin(2 * ph) * env(n, 0.001, tail * 0.4)
    click = bp(rng.standard_normal(n), 800, 4000) * env(n, 0.0005, 0.006) * 0.6
    return np.tanh(1.4 * (s + click)) * 0.8

def whoosh(frames, lo=500, hi=6000):  # свист взмаха: полоса шума, огибающая-горб
    n = int(SR * frames / FPS); x = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    a = bp(noise, lo, hi); b = bp(noise, lo * 2, hi * 1.5)
    return np.where(x < 0.5, a, b) * np.sin(np.pi * x) ** 1.5 * 0.9

def rise_swoosh(frames):  # плита выезжает снизу: шум с подъёмом полосы + низкий гул
    n = int(SR * frames / FPS); x = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    lo_part = bp(noise, 150, 900); hi_part = bp(noise, 900, 5000)
    s = (lo_part * (1 - x) + hi_part * x) * (x ** 1.2) * 1.4
    rum = np.sin(2 * np.pi * np.cumsum(70 + 60 * x) / SR) * x * 0.35
    return s + rum

def step_tap(hard=1.0):  # шаг по каменной плите: глухой стук + короткий щелчок
    n = int(SR * 0.16)
    body = np.sin(2 * np.pi * 110 * t(n)) * env(n, 0.001, 0.035)
    noise = bp(rng.standard_normal(n), 300, 2500) * env(n, 0.0005, 0.02)
    return (body * 0.8 + noise * 0.7 * hard) * 0.8

def cloth(frames=8):  # шорох ткани: шире полоса и громче, чтобы читался под музыкой
    n = int(SR * frames / FPS); x = np.linspace(0, 1, n)
    return bp(rng.standard_normal(n), 900, 6000) * np.sin(np.pi * x) ** 2 * 0.7

def click(bright=1.0):  # щелчок кнопки: транзиент + короткое «тело», чтобы читался под музыкой
    n = int(SR * 0.08)
    a = bp(rng.standard_normal(n), 1500, 9000) * env(n, 0.0002, 0.012)
    b = np.sin(2 * np.pi * 2200 * t(n)) * env(n, 0.0002, 0.02) * 0.5
    c = np.sin(2 * np.pi * 180 * t(n)) * env(n, 0.001, 0.025) * 0.6
    return (a + b + c) * bright

def buzz(frames, f=120):
    n = int(SR * frames / FPS); x = t(n)
    s = np.sign(np.sin(2 * np.pi * f * x)) * 0.25 + bp(rng.standard_normal(n), 2000, 6000) * 0.15
    return lp(s, 3000) * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.3

def power_down():
    n = int(SR * 0.35); x = t(n)
    fr = 900 * np.exp(-x * 9) + 80
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, 0.001, 0.12) * 0.5

def swell(frames):  # воздух на отъезде камеры
    n = int(SR * frames / FPS); x = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    return bp(noise, 200, 2500) * (np.sin(np.pi * x) ** 1.2) * 0.8

# ---------------------------------------------------------------- позиции на экране → панорама
STEPS = T["steps"]; G = T["grey"]
REVEAL = T["camera"]["revealStart"]
def white_pan(k):  # k с 1
    return float(np.clip(0.08 + 0.03 * k, -1, 0.4))
GREY_PAN = -0.35
OFFSCREEN = 250  # после этого кадра белый за кадром — шаги тише, после 296 не звучат (под мигание фонаря)

# ---------------------------------------------------------------- белый
put(cloth(10), T["white"]["anticipation"][0], -2, white_pan(0), "white_anticipation_cloth")
for k, land in enumerate(STEPS, start=1):
    if land > 296: break
    off = land > OFFSCREEN
    att = -9 - 3 * (land - OFFSCREEN) / 20 if off else 0
    big = 2.5 if k == 1 else (2.0 if 195 <= land <= OFFSCREEN else 0.0)   # в громкой части музыки — чуть громче
    put(rise_swoosh(T["blockRise"]), land - T["blockRise"] - 1, 5 + att + big, white_pan(k), f"slab{k}_rise")
    put(boom(250 if k == 1 else 230, 60, 9, 0.38 if k == 1 else 0.26), land, 4 + att + big - min(1.5, 0.3 * k), white_pan(k), f"slab{k}_lock_boom")
    put(step_tap(), land, 5 + att, white_pan(k), f"white_step{k}")
    put(cloth(7), land - 9, -11 + att, white_pan(k), f"white_swing{k}")

# ---------------------------------------------------------------- серый
put(cloth(12), G["raise"][0], -1, GREY_PAN, "grey_raise_cloth")
put(click(1.0), G["clickOn"], 8, GREY_PAN, "flashlight_on")
put(click(0.5), G["clickOn"] + 2, -5, GREY_PAN, "flashlight_flick")
for a, b in G["sweeps"]:
    put(whoosh(max(6, b - a), 400, 3000), a, -7 if b - a > 15 else -4, GREY_PAN, f"beam_sweep_{a}")
put(whoosh(25, 300, 2500), REVEAL + 4, -8, GREY_PAN, "beam_to_abyss")
put(cloth(8), G["backSteps"][0][0], -4, GREY_PAN, "grey_startle_cloth")
for a, b in G["backSteps"]:
    put(step_tap(0.7), b, 8, GREY_PAN - 0.05, f"grey_backstep_{b}")
s0, s1 = G["shake"]
for i in range(3):
    put(cloth(5), s0 + i * (s1 - s0) / 3, -4, GREY_PAN, f"grey_shake_{i}")
put(cloth(14), G["lookUp"][0], -8, GREY_PAN - 0.1, "grey_lookup_cloth")
put(cloth(20), G["lower"][0], -1, GREY_PAN - 0.15, "grey_lower_arm")
# мигание: на каждом включении — щелчок и треск
FL = [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0]
prev = 1
for i, on in enumerate(FL):
    fr = G["flicker"][0] + i
    if on != prev:
        put(click(0.6), fr, 8, GREY_PAN - 0.2, f"flicker_click_{fr}")
        if on: put(buzz(3 if i < 6 else 2), fr, 1, GREY_PAN - 0.2, f"flicker_buzz_{fr}")
    prev = on
put(click(0.8), G["clickOff"], 8, GREY_PAN - 0.2, "flashlight_off")
put(power_down(), G["clickOff"], -6, GREY_PAN - 0.2, "flashlight_power_down")
put(boom(160, 45, 14, 0.6), G["clickOff"] + 1, -9, -0.2, "darkness_low_boom")

# ---------------------------------------------------------------- камера: раскрытие
put(boom(200, 42, 12, 0.7), REVEAL, 5, 0.0, "reveal_big_boom")
put(swell(40), REVEAL - 2, -6, 0.15, "reveal_air_swell")

# ---------------------------------------------------------------- сохранить
out = np.stack([L, R], 1)[: int(T["total"] / FPS * SR)]
peak = np.abs(out).max(); out = out / max(peak, 1e-9) * 0.89
pcm = (out * 32767).astype(np.int16)
os.makedirs(os.path.join(ROOT, "public"), exist_ok=True)
with wave.open(os.path.join(ROOT, "public", "sfx_stem.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
os.makedirs(os.path.join(ROOT, "checks"), exist_ok=True)
with open(os.path.join(ROOT, "checks", "sfx_events.csv"), "w", encoding="utf-8") as fh:
    fh.write("frame,sound,gain_db,pan\n")
    for e in sorted(events): fh.write(",".join(map(str, e)) + "\n")
print(len(events), "событий, пик нормализован, длительность", round(len(out) / SR, 2), "с")
