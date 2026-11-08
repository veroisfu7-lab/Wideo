# Звук «Мафиозника на одну минуту»: оригинальная «мафиозная» музыка (вальс-тема, джаз, саспенс), SFX и реплики → public/mix.wav
import json, wave, os
import numpy as np
from scipy import signal

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(f"{ROOT}/src/timeline.json", encoding="utf-8")); E = TL["ev"]
VOD = json.load(open(f"{ROOT}/tools/vo_durations.json"))
TOTAL = TL["total"]; N = int(TOTAL * SR) + SR * 3
rng = np.random.default_rng(5)
bus = {k: np.zeros((2, N)) for k in ("vo", "sfx", "mus")}

def tt(sec): return np.arange(int(sec * SR)) / SR
def nz(n): return rng.standard_normal(int(n))
def nzs(sec): return nz(int(sec * SR))
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, hi], "bandpass", fs=SR, output="sos"), x)
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, "lowpass", fs=SR, output="sos"), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, "highpass", fs=SR, output="sos"), x)
def env(n, a, d): x = np.arange(int(n)) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def norm(x, p=0.9): return x / (np.max(np.abs(x)) + 1e-9) * p
def fade(x, fi=0.01, fo=0.05):
    n = len(x); e = np.ones(n); a, b = int(fi * SR), int(fo * SR)
    if a: e[:a] = np.linspace(0, 1, a)
    if b: e[-b:] *= np.linspace(1, 0, b)
    return x * e
def reverb(x, sec=1.6, mix=0.25, damp=5000):
    ir = nzs(sec) * np.exp(-tt(sec) * (6.9 / sec)); ir = lp(ir, damp); ir /= np.sqrt(np.sum(ir ** 2))
    w = signal.fftconvolve(x, ir)[: len(x)]
    return x * (1 - mix) + w * mix
def put(b, sig, t, db=0.0, pan=0.0):
    i = int(t * SR); g = 10 ** (db / 20)
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
        sig = np.vstack([sig * l, sig * r])
    n = min(sig.shape[1], N - i)
    if n > 0 and i >= 0: bus[b][:, i:i + n] += sig[:, :n] * g
def hz(name):  # 'A4' → Гц
    notes = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    n, o = name[:-1], int(name[-1]); return 440 * 2 ** ((notes[n] + (o - 4) * 12) / 12)

# ------------------------------------------------------------------ инструменты
def pluck(f, sec, bright=1.0):
    t = tt(sec); s = sum(np.sin(2 * np.pi * f * k * t) * (0.7 ** k) * np.exp(-t * (3 + k * 2.5)) for k in range(1, 7))
    return s * env(len(t), 0.002, sec) * bright
def mandolin(f, sec, rate=0.065):  # тремоло-щипки
    out = np.zeros(int(sec * SR)); k = 0
    while k * rate < sec - 0.02:
        p = pluck(f, min(0.25, sec - k * rate)) * (0.75 + 0.25 * (k % 2)); i = int(k * rate * SR); out[i:i + len(p)] += p[: len(out) - i]; k += 1
    return fade(out, 0.005, 0.04)
def pad(freqs, sec, bright=1500, att=0.25):
    t = tt(sec); s = np.zeros(len(t))
    for f in freqs:
        for d in (-0.005, 0.005): s += signal.sawtooth(2 * np.pi * f * (1 + d) * t + rng.uniform(0, 6)) * 0.15
    s = lp(s, bright, 2) * np.minimum(1, t / att)
    return fade(s, 0.01, 0.15)
def accordion(freqs, sec):
    t = tt(sec); vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t); s = np.zeros(len(t))
    for f in freqs: s += (signal.square(2 * np.pi * f * vib * t) * 0.5 + signal.sawtooth(2 * np.pi * f * 1.003 * t) * 0.5) * 0.12
    return fade(lp(s, 2200, 2) * np.minimum(1, t / 0.04), 0.01, 0.06)
def pizz(f, sec=0.35):
    t = tt(sec); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t)) * env(len(t), 0.003, 0.12)
def piano_chord(freqs, sec=3.0):
    t = tt(sec); s = sum(sum(np.sin(2 * np.pi * f * k * t) * (0.5 ** k) * np.exp(-t * (0.8 + k)) for k in range(1, 6)) for f in freqs)
    return norm(reverb(s * env(len(t), 0.003, 2.5), 2.5, 0.35), 0.9)
def ride():
    t = tt(0.4); return hp(nzs(0.4), 6000) * env(len(t), 0.001, 0.12) * 0.5 + np.sin(2 * np.pi * 5200 * t) * env(len(t), 0.001, 0.2) * 0.1
def brass(freqs, sec=0.25):
    t = tt(sec); s = sum(signal.sawtooth(2 * np.pi * f * t) for f in freqs) * 0.25
    return lp(s, 2500, 2) * env(len(t), 0.01, 0.12)
def kick():
    t = tt(0.3); return np.sin(2 * np.pi * np.cumsum(50 + 100 * np.exp(-t * 30)) / SR) * env(len(t), 0.001, 0.12)

CH = {"Am": ["A3", "C4", "E4"], "Dm": ["D3", "F3", "A3"], "E7": ["E3", "G#3", "B3", "D4"], "Am/E": ["E3", "A3", "C4"]}
MEL = [("E5", 1), ("A5", 1), ("C6", 1), ("B5", 1.5), ("A5", .5), ("G#5", 1), ("F5", 1), ("A5", 1), ("D6", 1), ("C6", 2), ("B5", 1),
       ("B5", 1), ("G#5", 1), ("E5", 1), ("D6", 1.5), ("C6", .5), ("B5", 1), ("C6", 1), ("B5", 1), ("A5", 1), ("A5", 3)]
BARS = ["Am", "Am/E", "Dm", "Dm", "E7", "E7", "Am", "Am"]

def waltz(t0, t1, bpm=138, mel=True, db=0.0, oct_down=False):
    """Вальс-тема: бас на 1, аккорд на 2-3 (аккордеон), мандолина ведёт мелодию."""
    beat = 60 / bpm; bar = 3 * beat; tt0 = t0; i = 0
    while tt0 < t1 - 0.1:
        ch = BARS[i % 8]; fr = [hz(n) for n in CH[ch]]
        put("mus", pizz(fr[0] / 2), tt0, db - 2)
        for b in (1, 2):
            if tt0 + b * beat < t1: put("mus", accordion(fr, beat * 0.55), tt0 + b * beat, db - 8)
        tt0 += bar; i += 1
    if mel:
        tm = t0; k = 0
        while tm < t1 - 0.2:
            n, d = MEL[k % len(MEL)]; f = hz(n) / (2 if oct_down else 1)
            dur = min(d * beat, t1 - tm)
            put("mus", mandolin(f, dur * 0.95), tm, db - 6, 0.15); tm += d * beat; k += 1
    put("mus", pad([hz("A2"), hz("E3")], t1 - t0, 700, 0.8), t0, db - 14)

def swing(t0, t1, bpm=168, db=0.0):
    beat = 60 / bpm; walk = ["A2", "C3", "E3", "G3", "D3", "F3", "A3", "C4", "G2", "B2", "D3", "F3", "E2", "G#2", "B2", "D3"]
    stabs = [["A3", "C4", "E4", "G4"], ["D4", "F4", "A4", "C5"], ["G3", "B3", "D4", "F4"], ["E3", "G#3", "B3", "D4"]]
    k = 0; tm = t0
    while tm < t1 - 0.05:
        put("mus", pizz(hz(walk[k % 16]), beat * 0.9) * 1.4, tm, db - 3)
        put("mus", ride(), tm, db - 14, 0.4)
        if k % 2 == 1: put("mus", ride()[: int(0.15 * SR)], tm + beat * 0.66, db - 18, 0.4)
        if k % 4 in (1, 3): put("mus", brass([hz(n) for n in stabs[(k // 4) % 4]], 0.22), tm + beat * 0.66, db - 7, -0.2)
        if k % 4 == 0: put("mus", kick(), tm, db - 6)
        tm += beat; k += 1

def suspense(t0, t1, db=0.0):
    tm = t0; k = 0
    while tm < t1:
        prog = (tm - t0) / (t1 - t0); bpm = 150 + 70 * prog; beat = 60 / bpm
        f = hz("A2") * 2 ** ((k // 8 % 2) / 12)
        put("mus", (signal.sawtooth(2 * np.pi * f * tt(beat * 0.45)) * env(int(beat * 0.45 * SR), 0.003, 0.08)) * 0.5, tm, db - 4)
        put("mus", (signal.sawtooth(2 * np.pi * f * 2 * tt(beat * 0.3)) * env(int(beat * 0.3 * SR), 0.003, 0.05)) * 0.3, tm + beat / 2, db - 8)
        if k % 2 == 0: put("mus", kick(), tm, db - 4)
        tm += beat; k += 1
    put("mus", pad([hz("A3"), hz("A#3"), hz("E4")], t1 - t0, 1800, 2.0), t0, db - 10)

# ------------------------------------------------------------------ SFX
def snap():
    s = bp(nzs(0.2), 1500, 7000) * env(int(0.2 * SR), 0.0003, 0.012) * 3 + np.sin(2 * np.pi * 2500 * tt(0.2)) * env(int(0.2 * SR), 0.0003, 0.008)
    return norm(s, 0.9)
def boom(f0=120, f1=35, sec=1.8):
    t = tt(sec); f = f1 + (f0 - f1) * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, sec * 0.3)
    return norm(reverb(np.tanh(1.5 * s), 2.0, 0.35), 0.95)
def coins(n=10, sec=1.2):
    out = np.zeros(int(sec * SR))
    for k in range(n):
        i = int(rng.uniform(0, sec * 0.7) * SR); t = tt(0.4)
        c = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.12) for f in rng.uniform(3000, 7000, 3)) * rng.uniform(0.3, 1)
        out[i:i + len(c)] += c[: len(out) - i]
    return norm(reverb(out, 1.0, 0.2), 0.6)
def tick(hi=True):
    t = tt(0.06); return (bp(nzs(0.06), 2500 if hi else 1500, 8000) * env(len(t), 0.0003, 0.006) * 2 + np.sin(2 * np.pi * (3200 if hi else 2100) * t) * env(len(t), 0.0003, 0.01)) * 0.5
def clock_tick():
    t = tt(0.12); return norm(bp(nzs(0.12), 800, 4000) * env(len(t), 0.0003, 0.01) + np.sin(2 * np.pi * 900 * t) * env(len(t), 0.0003, 0.03), 0.6)
def beep(f=1600, sec=0.09): t = tt(sec); return np.sin(2 * np.pi * f * t) * env(len(t), 0.002, sec / 2) * 0.6
def whoosh(sec=0.35, lo=400, hi=6000):
    x = np.linspace(0, 1, int(sec * SR)); return norm(bp(nzs(sec), lo, hi) * np.sin(np.pi * x) ** 2, 0.6)
def shimmer(sec=1.2):
    t = tt(sec); s = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f in [1760, 2217, 2637, 3520, 4434]) * 0.2
    return norm(reverb(s * np.minimum(1, t / 0.3) * np.exp(-t * 1.5), 1.5, 0.4), 0.5)
def door_crash():
    s = lp(nzs(1.5), 400) * env(int(1.5 * SR), 0.001, 0.15) * 3 + bp(nzs(1.5), 800, 5000) * env(int(1.5 * SR), 0.001, 0.06) * 2
    for k in range(25):
        i = int(rng.uniform(0.02, 0.6) * SR); L = rng.integers(200, 2000); s[i:i + L] += bp(nz(L), 1000, 6000) * env(L, 0.0001, 0.01) * rng.uniform(0.3, 1)
    return norm(reverb(np.tanh(2 * s), 1.2, 0.2), 0.98)
def knock():
    t = tt(0.25); return norm(lp(nzs(0.25), 600) * env(len(t), 0.001, 0.03) * 2 + np.sin(2 * np.pi * 140 * t) * env(len(t), 0.001, 0.06), 0.9)
def cock():
    s = np.zeros(int(0.35 * SR))
    for d in (0, 0.13):
        t = tt(0.1); c = bp(nzs(0.1), 1500, 8000) * env(len(t), 0.0002, 0.01) * 2 + np.sin(2 * np.pi * 1200 * t) * env(len(t), 0.0002, 0.015)
        i = int(d * SR); s[i:i + len(c)] += c
    return norm(s, 0.8)
def step():
    t = tt(0.15); return norm(bp(nzs(0.15), 1200, 6000) * env(len(t), 0.0005, 0.012) + lp(nzs(0.15), 300) * env(len(t), 0.001, 0.03), 0.6)
def kiss():
    t = tt(0.12); f = 900 + 1800 * t / 0.12
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.03) + bp(nzs(0.12), 1000, 4000) * env(len(t), 0.001, 0.01), 0.6)
def thud():
    t = tt(0.6); return norm(np.sin(2 * np.pi * np.cumsum(70 + 80 * np.exp(-t * 25)) / SR) * env(len(t), 0.001, 0.15) + bp(nzs(0.6), 1500, 5000) * env(len(t), 0.0005, 0.02), 0.95)
def kaching():
    t = tt(1.2); bell = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.4) for f in (2093, 2637, 3136)) * 0.3
    s = np.zeros(len(t)); m = cock()[: int(0.2 * SR)]; s[: len(m)] += m * 0.6; s[int(0.12 * SR):] += bell[: len(t) - int(0.12 * SR)]
    return norm(s, 0.8)
def rustle(sec):
    m = np.abs(lp(nzs(sec), 8)); m /= m.max() + 1e-9; return fade(bp(nzs(sec), 1500, 8000) * m, 0.05, 0.1)
def siren(sec):
    t = tt(sec); f = np.where((t % 1.4) < 0.7, 960, 770)
    s = signal.square(2 * np.pi * np.cumsum(f) / SR) * 0.3 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4
    return fade(lp(s, 2000), 0.4, 0.3)
def poof():
    t = tt(0.8); s = lp(nzs(0.8), 1500) * env(len(t), 0.005, 0.2) * 1.5
    s += np.sin(2 * np.pi * np.cumsum(500 * np.exp(-t * 5) + 80) / SR) * env(len(t), 0.002, 0.15)
    return norm(s, 0.9)
def scratch():
    t = tt(0.7); sp = np.sin(2 * np.pi * 2.5 * t) * np.exp(-t * 2); ph = np.cumsum(300 + 900 * sp) / SR
    s = bp(np.sin(2 * np.pi * ph * 3) * 0.4 + nzs(0.7), 300, 4000) * (np.abs(sp) + 0.1)
    return norm(s * env(len(t), 0.002, 0.5), 0.9)
def creak():
    t = tt(0.8); f = 220 + 80 * np.sin(2 * np.pi * 1.2 * t); pulses = (np.sin(2 * np.pi * np.cumsum(f) / SR) > 0.96).astype(float)
    return norm(bp(pulses, 400, 3500) * np.sin(np.pi * np.linspace(0, 1, len(t))), 0.6)
def crinkle():
    s = np.zeros(int(0.8 * SR))
    for _ in range(80):
        i = rng.integers(len(s) - 500); L = rng.integers(40, 400); s[i:i + L] += bp(nz(L), 3000, 10000) * env(L, 0.0001, 0.003)
    return norm(s, 0.6)
def ding():
    t = tt(1.0); return norm(sum(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.3) for f in (1318, 1976)) * 0.5, 0.6)

# ------------------------------------------------------------------ РЕПЛИКИ
for v in TL["vo"]:
    with wave.open(f"{ROOT}/public/vo/{v['id']}.wav") as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    pan = {"goon1": -0.25, "goon2": 0.3, "goons": 0.0, "fbi": -0.5, "mom": -0.35}.get(v["id"], 0.0)
    if v["id"] == "fbi": x = lp(hp(x, 300), 3000) * 1.3   # через дверь
    put("vo", x, v["at"], 0, pan)

# ------------------------------------------------------------------ МУЗЫКА
put("mus", pad([hz("A3"), hz("C4"), hz("E4")], 4.4, 900, 1.0), 0.0, -18)          # спокойное начало
waltz(E["SNAP"] + 0.15, E["DOOR"] - 0.05, db=-3)                                   # пафосная тема
put("mus", piano_chord([hz("A1"), hz("A2"), hz("C3"), hz("E3")]), E["DOOR"] + 0.1, -4)
put("mus", pad([hz("A2"), hz("E3")], 6.0, 600, 0.5), 13.0, -12)                  # напряжение под реплики
put("mus", piano_chord([hz("A1"), hz("E2"), hz("A2"), hz("C3")], 4.0), 19.35, -3)
put("mus", pad([hz("D3"), hz("F3"), hz("A3")], 8.0, 700, 1.0), 19.5, -14)
waltz(27.6, 32.3, bpm=150, db=-6)
put("mus", piano_chord([hz("C3"), hz("E3"), hz("G3"), hz("C4")], 2.0), 32.35, -8)
swing(E["CASE_OPEN"] + 0.1, E["SIREN"], db=-6)
suspense(E["SIREN"], E["ZERO"], db=-4)
waltz(58.9, TOTAL - 0.6, bpm=132, db=-9, oct_down=False)                          # тихая реприза на финал
put("mus", piano_chord([hz("A2"), hz("C3"), hz("E3"), hz("A3")], 3.0), TOTAL - 1.4, -6)

# ------------------------------------------------------------------ SFX по таймлайну
put("sfx", shimmer(1.4), E["FLASH"], -6); put("sfx", whoosh(0.5, 800, 8000), E["FLASH"] - 0.2, -10)
put("sfx", beep(1200, 0.12), E["TIMER_ON"], -8)
t = E["TIMER_ON"]; k = 0
while t < E["ZERO"]:
    rate = 0.5 if t < 46 else 0.25
    put("sfx", tick(k % 2 == 0), t, -14 if t < 43 else -12); t += rate; k += 1
for t in np.arange(46.0, E["ZERO"], 0.5): put("sfx", beep(2000, 0.07), t, -12)
put("sfx", snap(), E["SNAP"], -2); put("sfx", boom(100, 35, 2.0), E["SNAP"] + 0.02, -5); put("sfx", coins(14), E["SNAP"] + 0.1, -8)
put("sfx", shimmer(1.0), E["SNAP"] + 0.05, -10)
put("sfx", rustle(1.2), 6.5, -16)
for k in range(5): put("sfx", step(), 8.05 + k * 0.28, -12, 0.2)
put("sfx", shimmer(0.8), E["RING"] + 0.2, -8); put("sfx", whoosh(1.2, 200, 1500), E["GLASSES"], -12)
put("sfx", door_crash(), E["DOOR"], 0); put("sfx", boom(90, 30, 1.2), E["DOOR"], -6)
for k in range(6): put("sfx", step() * 1.4, E["DOOR"] + 0.3 + k * 0.17, -8, -0.3)
put("sfx", cock(), 13.3, -6, -0.3); put("sfx", cock(), 13.55, -6, 0.3)
put("sfx", kiss(), E["KISS"] + 0.25, -6, -0.2); put("sfx", kiss(), E["KISS"] + 0.5, -6, 0.2)
put("sfx", rustle(0.6), 14.9, -14)
put("sfx", whoosh(0.3), 18.6, -10)
for k, t in enumerate(np.arange(28.3, 31.3, 0.7)): put("sfx", beep(900 + k * 150, 0.1), t, -10)
put("sfx", thud(), E["CASE_DOWN"] + 0.2, -2)
put("sfx", cock()[: int(0.12 * SR)], E["CASE_OPEN"] - 0.05, -6); put("sfx", cock()[: int(0.12 * SR)], E["CASE_OPEN"] + 0.1, -6)
put("sfx", shimmer(1.6), E["CASE_OPEN"] + 0.2, -4)
put("sfx", kaching(), E["RAIN"], -4); put("sfx", kaching(), 38.5, -8)
put("sfx", rustle(5.0), E["RAIN"], -10); put("sfx", rustle(2.0), 41.0, -10)
put("sfx", lp(siren(12.0), 1800), E["SIREN"], -15, 0.6)
for k in range(3): put("sfx", knock(), E["KNOCK"] + k * 0.28, -2, -0.5)
for k in range(3): put("sfx", knock(), 49.6 + k * 0.25, -6, -0.5)
put("sfx", cock(), 45.4, -5, -0.3); put("sfx", cock(), 45.6, -5, 0.3)
put("sfx", poof(), E["ZERO"], -2); put("sfx", scratch(), E["ZERO"] + 0.05, -3)
for t in np.arange(E["ZERO"] + 0.5, TOTAL, 1.0): put("sfx", clock_tick(), t, -12, 0.4)
put("sfx", creak(), E["MOM_DOOR"], -8, -0.5)
put("sfx", crinkle(), E["CANDY"] + 0.1, -6)
put("sfx", ding(), 62.4, -6)
# короткие свищи на склейках
SH = [2.2, 3.4, 4.4, 6.4, 8.0, 9.4, 11.8, 13.4, 15.0, 18.6, 19.4, 23.5, 25.0, 27.6, 32.4, 34.2, 36.0, 41.0, 43.0, 45.4, 49.1, 50.3, 51.5, 52.7, 53.6, 56.0, 58.8, 60.6]
for t in SH: put("sfx", whoosh(0.22, 1000, 7000), t - 0.1, -20)

# ------------------------------------------------------------------ сведение
vo = bus["vo"].mean(0); e = lp(np.abs(vo), 6) * 3
duck = 1 - 0.55 * np.clip(e / (e.max() * 0.2 + 1e-9), 0, 1)
mix = bus["vo"] + bus["sfx"] * 0.8 * (1 - 0.3 * (1 - duck)) + bus["mus"] * 0.75 * duck
mix = mix[:, : int(TOTAL * SR)]
mix = np.tanh(mix * 1.05) / np.tanh(1.05); mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.9
with wave.open(f"{ROOT}/public/mix.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
def rms(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
for a, b, nm in [(0, 6.4, "S1"), (6.4, 12.6, "S2"), (12.6, 32.4, "S3"), (32.4, 43, "S4"), (43, 55.2, "S5"), (55.2, TOTAL, "S6")]:
    i, j = int(a * SR), int(b * SR)
    print(nm, "vo", round(rms(bus["vo"][:, i:j]), 1), "sfx", round(rms(bus["sfx"][:, i:j] * 0.8), 1), "mus", round(rms((bus["mus"] * 0.75 * duck)[:, i:j]), 1))
print("ok", TOTAL)
