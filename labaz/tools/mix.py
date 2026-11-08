# Звуковая дорожка ролика: синтез SFX и эмбиента по раскадровке + голос, сведение в public/mix.wav
# Время событий — в кадрах шота (30 fps); константы совпадают с src/shots*.tsx
import json, wave, os
import numpy as np
from scipy import signal

SR = 48000; FPS = 30
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
shots = json.load(open(f"{ROOT}/src/shots.json", encoding="utf-8"))
vod = json.load(open(f"{ROOT}/tools/vo_durations.json"))
START, LEN = {}, {}
acc = 0
for s in shots:
    START[s["id"]] = acc; LEN[s["id"]] = round(s["dur"] * FPS); acc += LEN[s["id"]]
TOTAL = acc
N = int(TOTAL / FPS * SR) + SR * 2
rng = np.random.default_rng(11)

# шины: голос, sfx, эмбиент, музыка
bus = {k: np.zeros((2, N)) for k in ("vo", "sfx", "amb", "mus")}

def at(shot, fr): return (START[shot] + fr) / FPS
def put(b, sig, t, db=0.0, pan=0.0):
    i = int(t * SR); g = 10 ** (db / 20)
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
        sig = np.vstack([sig * l, sig * r])
    n = min(sig.shape[1], N - i)
    if n > 0: bus[b][:, i:i + n] += sig[:, :n] * g

def tt(sec): return np.arange(int(sec * SR)) / SR
def nz(sec): return rng.standard_normal(int(sec * SR))
def nzs(n): return rng.standard_normal(int(n))
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, hi], "bandpass", fs=SR, output="sos"), x)
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, "lowpass", fs=SR, output="sos"), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, "highpass", fs=SR, output="sos"), x)
def env(n, a, d): x = np.arange(n) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def fade(x, fi=0.05, fo=0.2):
    n = len(x); e = np.ones(n); a = int(fi * SR); b = int(fo * SR)
    if a: e[:a] = np.linspace(0, 1, a)
    if b: e[-b:] *= np.linspace(1, 0, b)
    return x * e
def norm(x, p=0.9): m = np.max(np.abs(x)) + 1e-9; return x / m * p
def reverb(x, sec=2.0, mix=0.3, damp=4000):
    ir = nz(sec) * np.exp(-np.arange(int(sec * SR)) / SR * (6.9 / sec)); ir = lp(ir, damp); ir /= np.sqrt(np.sum(ir ** 2))
    w = signal.fftconvolve(x, ir)[: len(x) + int(sec * SR)]
    out = np.zeros(len(w)); out[: len(x)] = x * (1 - mix)
    return out + w * mix

# ------------------------------------------------------------------ генераторы
def boom(f0=110, f1=38, sec=2.2, drive=1.6):
    t = tt(sec); f = f1 + (f0 - f1) * np.exp(-t * 7)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, sec * 0.35)
    s += lp(nz(sec), 300) * env(len(t), 0.001, 0.08) * 0.8
    return norm(np.tanh(drive * s))
def taiko(sec=3.0):
    t = tt(sec); f = 55 + 70 * np.exp(-t * 18)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.6)
    skin = bp(nz(sec), 100, 900) * env(len(t), 0.0005, 0.05) * 1.2
    return norm(reverb(np.tanh(1.8 * (body + skin)), 3.0, 0.35, 2500))
def whoosh(sec=0.6, lo=300, hi=5000, up=True):
    n = int(sec * SR); x = np.linspace(0, 1, n)
    s = bp(nz(sec), lo, hi) * np.sin(np.pi * x) ** 2
    return norm(s, 0.7)
def glitch(sec=0.35):
    n = int(sec * SR); s = np.zeros(n); i = 0
    while i < n:
        L = int(rng.uniform(0.008, 0.04) * SR); k = rng.integers(3)
        seg = np.sign(np.sin(2 * np.pi * rng.uniform(200, 2500) * np.arange(L) / SR)) if k == 0 else (nzs(L) if k == 1 else np.sin(2 * np.pi * rng.uniform(60, 120) * np.arange(L) / SR))
        m = max(0, min(L, n - i)); s[i:i + m] = seg[:m] * rng.uniform(0.3, 1); i += L
    return norm(bp(s, 80, 9000), 0.7)
def scrape(sec=0.8):
    t = tt(sec); s = np.zeros(len(t))
    for fr in (1830, 2470, 3510, 5120): s += np.sin(2 * np.pi * fr * t * (1 + 0.02 * np.sin(t * 40))) * rng.uniform(0.3, 1)
    s *= bp(nz(sec), 500, 4000) * 0.5 + 0.5
    return norm(s * np.sin(np.pi * np.linspace(0, 1, len(t))) ** 0.7, 0.5)
def beep(fr=1400, sec=0.12, dec=0.06):
    t = tt(sec); return np.sin(2 * np.pi * fr * t) * env(len(t), 0.002, dec) * 0.6
def click(bright=1.0):
    n = int(0.05 * SR); return (bp(nz(0.05), 1500, 9000) * env(n, 0.0002, 0.006) + np.sin(2 * np.pi * 1800 * np.arange(n) / SR) * env(n, 0.0002, 0.01) * 0.4) * bright
def pop():
    t = tt(0.12); f = 300 + 900 * np.exp(-t * 40)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.04) * 0.6 + click(0.4)[: len(t)] if False else np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.04) * 0.6
def crackle(sec, dens=40, lo=1500, hi=8000, amp=1.0):
    n = int(sec * SR); s = np.zeros(n)
    for _ in range(int(dens * sec)):
        i = rng.integers(n - 2000); L = rng.integers(60, 1200)
        s[i:i + L] += bp(nzs(L), lo, hi) * env(L, 0.0001, rng.uniform(0.001, 0.008)) * rng.uniform(0.2, 1)
    return s * amp
def fire_bed(sec, amp=1.0):
    roar = lp(nz(sec), 400) * (0.6 + 0.4 * lp(np.abs(nz(sec)), 3)) * 0.8
    return fade(roar * 0.5 + crackle(sec, 30) * 1.4, 0.3, 0.3) * amp
def wind(sec, lo=300, hi=2500, amp=1.0):
    m = lp(nz(sec), 0.3); m = (m - m.min()) / (np.ptp(m) + 1e-9)
    return fade(bp(nz(sec), lo, hi) * (0.3 + 0.7 * m), 1.0, 1.0) * amp
def breath(sec=1.6, inhale=True):
    n = int(sec * SR); x = np.linspace(0, 1, n)
    e = np.sin(np.pi * x) ** (1.5 if inhale else 0.8)
    return norm(bp(nz(sec), 400 if inhale else 250, 3000 if inhale else 1800) * e, 0.5)
def heartbeat():
    def th(f0, sec, a):
        t = tt(sec); return np.sin(2 * np.pi * np.cumsum(f0 * np.exp(-t * 6) + 35) / SR) * env(len(t), 0.003, 0.09) * a
    s = np.zeros(int(0.6 * SR)); a = th(60, 0.35, 1.0); b = th(52, 0.35, 0.7)
    s[: len(a)] += a; s[int(0.16 * SR): int(0.16 * SR) + len(b)] += b
    return np.tanh(s * 1.5)
def tok(fr=1500):
    t = tt(0.25); s = np.zeros(len(t))
    for k, (m, d) in enumerate([(1, 0.03), (2.31, 0.02), (3.9, 0.012)]): s += np.sin(2 * np.pi * fr * m * t) * np.exp(-t / d) / (k + 1)
    s += bp(nz(0.25), 2000, 8000) * env(len(t), 0.0002, 0.004) * 0.8
    s += np.sin(2 * np.pi * 220 * t) * np.exp(-t / 0.04) * 0.5
    return norm(reverb(s, 1.2, 0.25), 0.9)
def khang():
    t = tt(4.0); s = np.zeros(len(t))
    for m, d, a in [(1, 1.6, 1), (1.183, 1.1, 0.7), (2.41, 0.7, 0.5), (3.92, 0.4, 0.35), (5.3, 0.25, 0.25), (0.5, 0.9, 0.4)]:
        s += np.sin(2 * np.pi * 420 * m * t * (1 + 0.003 * np.sin(2 * np.pi * 5 * t))) * np.exp(-t / d) * a
    s += bp(nz(4.0), 300, 3000) * env(len(t), 0.0005, 0.02) * 2
    s = lp(s, 3500)
    return norm(reverb(s, 3.5, 0.55, 2500), 0.9)
def snap():
    s = bp(nz(1.0), 300, 6000) * env(SR, 0.0003, 0.03) * 2 + crackle(1.0, 60, 800, 5000) * env(SR, 0.01, 0.25)
    s += lp(nz(1.0), 200) * env(SR, 0.001, 0.1) * 2
    return norm(reverb(np.tanh(s * 2), 1.5, 0.3), 0.95)
def hiss_breath(sec=2.2):
    n = int(sec * SR); x = np.linspace(0, 1, n)
    s = bp(nz(sec), 120, 900) * np.sin(np.pi * x) ** 1.2 * (1 + 0.5 * np.sin(2 * np.pi * 9 * x * sec))
    s += np.sin(2 * np.pi * np.cumsum(80 - 30 * x) / SR) * np.sin(np.pi * x) * 0.4
    return norm(s, 0.8)
def step_moss(soft=1.0):
    return norm(bp(nz(0.25), 300, 2500) * env(int(0.25 * SR), 0.01, 0.06) + crackle(0.25, 80, 1500, 6000) * 0.3, 0.6) * soft
def crunch():
    return norm(lp(nz(0.2), 300) * env(int(0.2 * SR), 0.002, 0.05) * 1.5 + crackle(0.3, 150, 1000, 6000)[: int(0.2 * SR)], 0.8)
def gunshot():
    sec = 5.0; t = tt(sec)
    crack = hp(nz(sec), 800) * env(len(t), 0.0001, 0.012) * 3
    body = lp(nz(sec), 900) * env(len(t), 0.0005, 0.12) * 2.5
    lowb = np.sin(2 * np.pi * np.cumsum(30 + 90 * np.exp(-t * 20)) / SR) * env(len(t), 0.001, 0.3) * 1.5
    s = np.tanh(2.5 * (crack + body + lowb))
    out = s.copy()
    for k, (dl, g, fc) in enumerate([(0.35, 0.45, 2500), (0.8, 0.32, 1800), (1.4, 0.22, 1200), (2.2, 0.14, 900), (3.1, 0.08, 700)]):
        i = int(dl * SR); e = lp(s, fc); out[i:] += e[: len(out) - i] * g
    return norm(reverb(out, 3.0, 0.25, 3000), 0.98)
def bolt():
    return norm(bp(nz(0.12), 1500, 7000) * env(int(0.12 * SR), 0.0002, 0.01) + np.sin(2 * np.pi * 900 * tt(0.12)) * env(int(0.12 * SR), 0.0002, 0.02) * 0.5, 0.8)
def tinkle():
    t = tt(1.2); s = np.zeros(len(t))
    for b in (0, 0.09, 0.16, 0.21):
        i = int(b * SR); tt2 = t[: len(t) - i]
        s[i:] += sum(np.sin(2 * np.pi * fr * tt2) * np.exp(-tt2 / 0.18) for fr in (3150, 4870, 6920)) * (0.6 if b else 1)
    return norm(s, 0.5)
def nutcracker():
    out = np.zeros(int(1.2 * SR))
    for k in range(3):
        sec = 0.18; t = tt(sec); f = 1100 + 300 * np.sin(np.pi * t / sec)
        call = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + bp(nz(sec), 1500, 4000)
        call = bp(call, 900, 5000) * np.sin(np.pi * t / sec) ** 0.5
        i = int(k * 0.27 * SR); out[i:i + len(call)] += call
    return norm(reverb(out, 2.0, 0.4), 0.6)
def trill():
    out = np.zeros(int(1.6 * SR)); t0 = 0
    while t0 < 1.3:
        sec = 0.05; t = tt(sec); f = rng.uniform(3500, 6000) + 1500 * np.sin(np.pi * t / sec)
        n = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / sec)
        i = int(t0 * SR); out[i:i + len(n)] += n; t0 += rng.uniform(0.06, 0.09)
    return norm(reverb(out, 2.0, 0.5), 0.4)
def whistle():
    sec = 0.5; t = tt(sec); f = 2600 - 800 * t / sec
    return norm(reverb(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / sec), 2.0, 0.5), 0.35)
def creak(sec=0.5, f0=140):
    t = tt(sec); f = f0 * (1 + 0.3 * np.sin(2 * np.pi * 1.5 * t))
    pulses = (np.sin(2 * np.pi * np.cumsum(f) / SR) > 0.97).astype(float)
    s = bp(pulses + nz(sec) * 0.02, 300, 3000)
    return norm(s * np.sin(np.pi * np.linspace(0, 1, len(t))), 0.6)
def bubbles(sec):
    n = int(sec * SR); s = np.zeros(n)
    for _ in range(int(sec * 14)):
        L = int(rng.uniform(0.03, 0.09) * SR); i = rng.integers(n - L); t = np.arange(L) / SR
        f = rng.uniform(150, 600) * (1 + t * 8)
        s[i:i + L] += np.sin(2 * np.pi * np.cumsum(f) / SR) * env(L, 0.003, L / SR / 3) * rng.uniform(0.3, 1)
    return fade(s + lp(nz(sec), 600) * 0.15 + hp(nz(sec), 3000) * 0.04, 0.2, 0.2)
def rewind(sec=0.55):
    t = tt(sec); f = 300 + 3000 * (t / sec) ** 2
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + bp(nz(sec), 2000, 8000) * 0.6
    return norm(s * np.minimum(1, (sec - t) * 20), 0.5)
def moan(sec=4.0):
    t = tt(sec); f = 95 - 35 * t / sec + 6 * np.sin(2 * np.pi * 4 * t)
    src = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) + nz(sec) * 0.3
    s = bp(src, 200, 600) + bp(src, 700, 1100) * 0.5
    s *= np.sin(np.pi * np.minimum(1, t / sec * 1.1)) ** 1.5
    return norm(reverb(lp(s, 1500), 4.0, 0.6, 1800), 0.7)
def tinnitus(sec=3.0):
    t = tt(sec); return np.sin(2 * np.pi * 6200 * t) * np.exp(-t / 1.1) * 0.08
def rustle(sec, lo=1500, hi=7000):
    m = np.abs(lp(nz(sec), 6)); m /= m.max() + 1e-9
    return fade(bp(nz(sec), lo, hi) * m, 0.05, 0.1)
def ui_type(sec, rate=20):
    n = int(sec * SR); s = np.zeros(n)
    for k in range(int(sec * rate)):
        c = click(0.25); i = int(k / rate * SR); s[i:i + len(c)] += c[: max(0, min(len(c), n - i))]
    return s
def drone(sec, f0, amp=1.0, bright=600):
    t = tt(sec); s = np.zeros(len(t))
    for k, (m, d) in enumerate([(1, 0), (1.5, 0.3), (2, -0.2), (1.005, 0.1)]):
        s += signal.sawtooth(2 * np.pi * f0 * m * t + d) * (0.6 if k == 0 else 0.35)
    s = lp(s, bright, 4) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.11 * t))
    return fade(s, 1.5, 1.5) * amp
def pad(sec, notes, amp=1.0, bright=1400):
    t = tt(sec); s = np.zeros(len(t))
    for i, fr in enumerate(notes):
        for dt in (-0.004, 0.004):
            s += signal.sawtooth(2 * np.pi * fr * (1 + dt) * t + i) * 0.2
    s = lp(s, bright, 2) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.07 * t))
    return fade(reverb(s, 3.0, 0.4)[: len(t)], 2.0, 2.0) * amp
def subrise(sec):
    t = tt(sec); f = 40 + 25 * t / sec
    return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / sec) ** 1.5 + lp(nz(sec), 120) * 0.3 * t / sec, 0.5, 0.05)

# ------------------------------------------------------------------ ГОЛОС
for s in shots:
    with wave.open(f"{ROOT}/public/vo/{s['id']}.wav") as w:
        v = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    put("vo", v, (START[s["id"]] + round(s["voAt"] * FPS)) / FPS, 0)

# ------------------------------------------------------------------ СЦЕНА 1
L = lambda sid: LEN[sid] / FPS
put("sfx", boom(140, 34, 2.5), at("cold", 0), -5)
put("sfx", fire_bed(L("cold")), at("cold", 0), -17)
put("sfx", crackle(L("cold"), 12, 800, 5000), at("cold", 0), -12)
put("sfx", lp(boom(70, 30, 2.0, 1.2), 400), at("cold", 22), -8)
put("sfx", whoosh(0.35, 400, 4000), at("cold", 69), -10, -0.6)
put("sfx", glitch(0.3), at("cold", 84), -6); put("sfx", scrape(0.9), at("cold", 84), -12)
put("sfx", rewind(0.55), at("cold", LEN["cold"] - 16), -6)
put("amb", drone(L("cold"), 36.7, 1, 300), at("cold", 0), -16)

put("amb", wind(L("taboo") + L("sergey") + L("offer"), 400, 3000), at("taboo", 0), -19)
put("mus", pad(L("taboo") + L("sergey") + L("offer") + L("boil") + L("feet") + 1.5, [146.8, 220, 293.7, 349.2], 1, 1100), at("taboo", 0), -17)
put("sfx", nutcracker(), at("taboo", 30), -14, 0.6)
put("sfx", rustle(2.5, 800, 4000), at("taboo", 60), -24, -0.2)
put("sfx", beep(1600, 0.1), at("taboo", 36), -14); put("sfx", beep(2100, 0.1), at("taboo", 56), -14)
for k in (92, 96, 100): put("sfx", beep(880, 0.12, 0.08), at("taboo", k), -10)
put("sfx", whoosh(0.25, 1500, 8000), at("taboo", 96), -12)
put("sfx", pop(), at("taboo", 104), -10)

put("sfx", breath(1.4, True), at("sergey", 2), -16); put("sfx", breath(1.8, False), at("sergey", 46), -18); put("sfx", breath(1.4, True), at("sergey", 130), -18); put("sfx", breath(1.8, False), at("sergey", 176), -18)
put("sfx", rustle(1.2, 600, 3000), at("sergey", 16), -16, 0.2)
put("sfx", rustle(1.8, 2000, 8000), at("sergey", 24), -14, 0.5)
put("sfx", lp(bolt(), 2500), at("sergey", 40), -12, -0.4)
put("sfx", click(0.6), at("sergey", 70), -10); put("sfx", pop(), at("sergey", 86), -10)
put("sfx", glitch(0.2), at("sergey", LEN["sergey"] - 13), -6); put("sfx", lp(boom(90, 40, 0.8), 500), at("sergey", LEN["sergey"] - 12), -8)

# ------------------------------------------------------------------ СЦЕНА 2
for k in range(5): put("sfx", step_moss(0.8), at("offer", 2 + k * 7), -16, 0.4)
put("sfx", rustle(0.8, 600, 3000), at("offer", 30), -18); put("sfx", rustle(1.4, 500, 2500), at("offer", 46), -18)
put("sfx", ui_type(2.2, 22), at("offer", 24), -20)
put("sfx", crackle(1.8, 70, 1500, 7000), at("offer", 152), -16, 0.2)
put("sfx", pop(), at("offer", 14), -12)

put("sfx", bubbles(L("boil")), at("boil", 0), -8)
put("sfx", crackle(L("boil"), 18, 800, 5000), at("boil", 0), -12)
put("sfx", hp(nz(L("boil")), 4000) * 0.3, at("boil", 0), -26)
for k in (26, 52, 80): put("sfx", pop(), at("boil", k), -12)
for k in range(12): put("sfx", beep(1800 - k * 90, 0.06, 0.03), at("boil", 90 + k * 8.3), -18)
put("sfx", beep(1320, 0.3, 0.12) + 0, at("boil", 192), -12); put("sfx", beep(1760, 0.3, 0.12), at("boil", 197), -12)

put("sfx", creak(0.9, 160), at("feet", 10), -14); put("sfx", creak(0.9, 190), at("feet", 40), -14)
put("sfx", lp(nz(0.15), 800) * env(int(0.15 * SR), 0.002, 0.04), at("feet", 66), -6)
put("sfx", whoosh(0.5, 200, 1500), at("feet", 92), -20)
put("sfx", step_moss(0.6), at("feet", 118), -14)
put("sfx", lp(boom(120, 60, 0.6, 1.0), 300), at("feet", 118), -18)
put("sfx", pop(), at("feet", 120), -12)
put("sfx", pop(), at("feet", 20), -14)

# ------------------------------------------------------------------ СЦЕНА 3
PECKS = [20, 30, 40, 50, 95, 105, 115, 125, 170, 180, 190, 200]
for k in PECKS: put("sfx", tok(1400 + rng.uniform(-60, 60)), at("pecker", k), -6, 0.45)
for k in PECKS: put("sfx", rustle(0.3, 800, 4000), at("pecker", k + 1), -24, -0.2)
put("amb", wind(L("pecker") + L("labaz"), 500, 4000), at("pecker", 0), -19)
put("mus", pad(L("pecker") + L("labaz") + 1, [130.8, 196, 261.6, 311.1], 1, 900), at("pecker", 0), -17)
put("sfx", pop(), at("pecker", 30), -14)

for k in range(8): put("sfx", creak(0.35, 110 + k * 7), at("labaz", 24 + k * 11), -14)
put("sfx", lp(bolt(), 3000), at("labaz", 118), -14)
for k in (60, 132, 150): put("sfx", pop(), at("labaz", k), -13)
put("sfx", whoosh(0.6, 2000, 7000), at("labaz", 120), -22)

put("amb", wind(L("dusk"), 200, 1500), at("dusk", 0), -19)
put("mus", pad(L("dusk") + 1, [110, 164.8, 220, 261.6], 1, 700), at("dusk", 0), -17)
put("sfx", whistle(), at("dusk", 20), -14, -0.5); put("sfx", whistle(), at("dusk", 75), -18, 0.6)
put("sfx", breath(1.8, True), at("dusk", 160), -14); put("sfx", breath(2.2, False), at("dusk", 216), -15)
put("sfx", beep(700, 0.15, 0.1), at("dusk", 150), -12); put("sfx", glitch(0.2), at("dusk", 150), -14)
put("sfx", fade(pad(2.4, [880, 1318, 1975], 1, 4000), 0.5, 0.8), at("dusk", 130), -22)
for k in (40, 70): put("sfx", beep(2400, 0.08, 0.04), at("dusk", k), -16)

# ------------------------------------------------------------------ СЦЕНА 4
for k in range(LEN["night"]):
    if k % 16 == 2: put("sfx", heartbeat(), at("night", k), -9)
put("amb", drone(L("night") + L("sound") + L("under"), 32.7, 1, 220), at("night", 0), -14)
put("sfx", click(1.0), at("night", 96), -8)
KHANG = [40, 84, 128, 172, 216]
for k in KHANG: put("sfx", khang(), at("sound", k), -7, 0.55)
for k in KHANG: put("sfx", glitch(0.1), at("sound", k), -20)
put("sfx", pop(), at("sound", 46), -14)
CRACK = 72
put("sfx", whoosh(0.3, 300, 3000), at("under", 0), -10)
put("sfx", rustle(2.0, 400, 3000), at("under", 24), -14, -0.2)
put("sfx", snap(), at("under", CRACK), 0)
put("sfx", lp(boom(80, 30, 1.2), 300), at("under", CRACK), -6)
put("sfx", hiss_breath(2.2), at("under", 100), -6)
put("sfx", rustle(2.4, 300, 2500), at("under", 92), -12, 0.3)
put("sfx", glitch(0.25), at("under", 96), -12)

# ------------------------------------------------------------------ СЦЕНА 5
STRIKES = [12, 22, 32, 44, 54, 62]; IGNITE = 66
for k in STRIKES: put("sfx", click(1.2) + 0, at("fire", k), -6, 0.2)
put("sfx", whoosh(1.0, 100, 2500), at("fire", IGNITE - 4), -2)
put("sfx", lp(boom(90, 45, 1.0, 1.2), 600), at("fire", IGNITE), -6)
put("sfx", fire_bed(L("fire") - IGNITE / FPS + L("radar") + L("shot")), at("fire", IGNITE), -6)
put("sfx", crackle(L("fire") - IGNITE / FPS, 90, 1500, 8000), at("fire", IGNITE), -11)
put("sfx", bolt(), at("fire", 120), -6, 0.1)
put("sfx", pop(), at("fire", IGNITE + 20), -14)
put("amb", drone(L("fire") + L("radar") + L("shot"), 36.7, 1, 400), at("fire", 0), -15)

put("sfx", click(1.0), at("radar", 8), -8)
put("sfx", np.sin(2 * np.pi * 9500 * tt(L("radar") - 0.3)) * 0.03, at("radar", 8), -12)
steps = list(range(30, LEN["radar"] - 5, 13))
for i, k in enumerate(steps): put("sfx", crunch(), at("radar", k), -10, float(np.sin(i * 0.9)))
for k in (50, 110, 170): put("sfx", rustle(0.8, 600, 3500), at("radar", k), -14, float(np.cos(k)))
put("sfx", pop(), at("radar", 30), -14)

SHOT_F = 44
put("sfx", gunshot(), at("shot", SHOT_F), 0)
put("sfx", tinnitus(3.0), at("shot", SHOT_F + 4), -6)
put("sfx", bolt(), at("shot", 74), -4); put("sfx", bolt(), at("shot", 92), -5)
put("sfx", tinkle(), at("shot", 112), -8, 0.4)
put("sfx", glitch(0.25), at("shot", SHOT_F + 1), -10)

# ------------------------------------------------------------------ СЦЕНА 6
put("amb", wind(L("dawn"), 200, 1600), at("dawn", 0), -19)
put("sfx", hp(nz(L("dawn")), 5000) * 0.25, at("dawn", 0), -28)
put("sfx", breath(2.4, False), at("dawn", 26), -10)
put("sfx", trill(), at("dawn", 120), -14, 0.6)
put("mus", pad(L("dawn") + 1, [110, 138.6, 164.8, 220], 1, 900), at("dawn", 0), -17)

put("sfx", crunch(), at("track", 2), -10)
put("amb", subrise(L("track") + LEN["end"] / FPS * 0 + 62 / FPS), at("track", 0), -13)
for k in range(10, 70, 12): put("sfx", beep(2600, 0.05, 0.02), at("track", k), -18)
for k in (30, 42, 54): put("sfx", beep(520, 0.12, 0.08), at("track", k), -12)
for k in range(112, LEN["track"], 12): put("sfx", beep(990, 0.1, 0.06), at("track", k), -12)

CUT = 62; TITLES = [CUT + 6, CUT + 34, CUT + 64]
put("sfx", taiko(), at("end", CUT), 0)
put("sfx", boom(120, 30, 3.0), at("end", CUT), -4)
for k in TITLES[1:]: put("sfx", lp(taiko(), 2000), at("end", k), -9)
put("sfx", moan(4.0), at("end", CUT + 16), -6, -0.2)
put("sfx", glitch(0.15), at("end", LEN["end"] - 30), -16)

# ------------------------------------------------------------------ сведение: дакинг музыки/эмбиента под голос
vo = bus["vo"].mean(0)
e = lp(np.abs(vo), 6) * 3; duck = 1 - 0.5 * np.clip(e / (e.max() * 0.25 + 1e-9), 0, 1)
mix = bus["vo"] * 1.0 + bus["sfx"] * 0.9 + (bus["amb"] + bus["mus"]) * duck
mix = mix[:, : int(TOTAL / FPS * SR)]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.93
pcm = (mix.T * 32767).astype(np.int16)
with wave.open(f"{ROOT}/public/mix.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("ok", TOTAL, mix.shape[1] / SR)

# ------------------------------------------------------------------ отчёт по уровням (RMS dBFS по шотам, до общей нормализации)
def rms(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
g = 0.93 / (np.max(np.abs(np.tanh((bus["vo"] + bus["sfx"] * 0.9 + (bus["amb"] + bus["mus"]) * duck) * 1.1) / np.tanh(1.1))) + 1e-9)
for s in shots:
    a = int(START[s["id"]] / FPS * SR); b = int((START[s["id"]] + LEN[s["id"]]) / FPS * SR)
    print(f'{s["id"]:7s} vo {rms(bus["vo"][:, a:b]):6.1f}  sfx {rms(bus["sfx"][:, a:b] * 0.9):6.1f}  bed {rms(((bus["amb"] + bus["mus"]) * duck)[:, a:b]):6.1f}  sfxpeak {20*np.log10(np.max(np.abs(bus["sfx"][:, a:b]))+1e-9):5.1f}')
