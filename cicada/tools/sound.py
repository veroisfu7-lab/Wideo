# Звук «Цикады 3301»: синтез саунд-дизайна и музыки (numpy/scipy) по событиям timeline.json + закадр, сведение в стерео WAV.
#   python3 -I tools/sound.py → out/mix.wav
import json, os, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "src", "timeline.json"), encoding="utf-8"))
E, SH, VO = T["events"], T["shots"], T["vo"]
DUR = T["total"] / T["fps"]
N = int(SR * DUR)
rng = np.random.default_rng(3301)
t = np.arange(N) / SR

def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def nz(n): return rng.standard_normal(int(n))
def env(n, a, d): x = np.arange(int(n)) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def ramp(a, b): return np.clip((t - a) / max(b - a, 1e-6), 0, 1)
def gate(a, b, fi=0.3, fo=0.3): return ramp(a - fi, a) * (1 - ramp(b, b + fo))
def db(x): return 10 ** (x / 20)

L = np.zeros(N + SR * 4); R = np.zeros(N + SR * 4)
def mixa(*xs):
    out = np.zeros(max(len(x) for x in xs))
    for x in xs: out[:len(x)] += x
    return out
def put(sig, at, g=0.0, pan=0.0):
    i = int(at * SR); n = min(len(sig), len(L) - i)
    if n <= 0 or i < 0: return
    pl, pr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i + n] += sig[:n] * db(g) * pl * 1.414; R[i:i + n] += sig[:n] * db(g) * pr * 1.414
def bed(sig, g=0.0, width=0.0):
    sig = sig[:N]
    other = np.roll(sig, int(SR * 0.013)) if width else sig
    L[:N] += sig * db(g); R[:N] += (sig * (1 - width) + other * width) * db(g)

# ---------------------------------------------------------------- музыка: аналоговый пэд (ре минор), суб, виолончель, гул
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
def saw(f, det=0.0):
    ph = np.cumsum(np.full(N, f) * (1 + det)) / SR
    return 2 * (ph % 1) - 1
def pad_voice(m, amp):
    return sum(saw(hz(m), d) for d in (-0.004, 0.0, 0.0045)) * amp / 3
s1, s5 = SH["rain"][0], SH["zippo"][0]
padA = sum(pad_voice(m, a) for m, a in [(38, 0.5), (45, 0.35), (50, 0.3), (53, 0.22)])        # Dm
padB = sum(pad_voice(m, a) for m, a in [(34, 0.5), (41, 0.35), (46, 0.3), (50, 0.22)])        # Bb
padC = sum(pad_voice(m, a) for m, a in [(36, 0.5), (43, 0.35), (48, 0.3), (51, 0.25)])        # Cm-ish (тревога)
chord = np.where((t > 18) & (t < 34), 1, 0) * 1.0
pad = padA * (gate(0.0, 18.0, 2.5, 1.0) + gate(50, 67, 2.0, 1.0)) + padB * gate(18.0, 34.0, 0.5, 1.0) + padC * gate(34, 50, 0.5, 1.0) + padB * gate(67, 81, 1.0, 1.0)
cut = 500 + 900 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t))      # «дыхание» фильтра
pad = lp(pad, 1100) * 0.6 + lp(pad, 500) * 0.4
pad *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t) ** 2
pad *= (1 - ramp(81.0, 82.0)) * 0.9
bed(pad, -17, 0.6)
# суб-бас: ре, нарастание к переломам
sub = np.sin(2 * np.pi * np.cumsum(np.where(t < 18, hz(26), np.where(t < 34, hz(22), np.where(t < 50, hz(24), hz(26))))) / SR)
sub *= 0.5 + 0.5 * ramp(0, 6)
sub *= 1 - ramp(80.8, 81.2)
bed(sub, -16)
# виолончель (сцена 3): пила с вибрато через формантные полосы + шум смычка, скрипучая атака
def cello(m, a, b, gain):
    f = hz(m) * (1 + 0.006 * np.sin(2 * np.pi * 5.2 * t))
    x = 2 * ((np.cumsum(f) / SR) % 1) - 1
    x = bp(x, 180, 2600) + 0.6 * bp(x, 700, 1300) + 0.4 * bp(x, 2400, 3600)
    bow = bp(nz(N), 1500, 6000) * 0.08 * (1 + 3 * np.exp(-np.clip(t - a, 0, None) / 0.25) * (t > a))
    bed((x + bow) * gate(a, b, 0.15, 1.2) * (0.5 + 0.5 * ramp(a, b)), gain, 0.3)
cello(62, 34.4, 42.6, -21)   # D4
cello(63, 42.6, 49.6, -19)   # Eb4 — полутон вверх, тревога
cello(50, 38.0, 49.8, -24)   # нижний голос
# гул серверной стойки (сцена 2) и квантовый гул (сцена 6)
hum = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(50, 0.5), (100, 0.35), (150, 0.2), (300, 0.08)]) + bp(nz(N), 300, 1200) * 0.05
bed(hum * gate(18.4, 34.0, 1.0, 0.4) * (0.3 + 0.7 * ramp(18.4, 33.5)), -24)
qf = 55 * (1 + 1.4 * ramp(81, 89) ** 1.6)
q = np.sin(2 * np.pi * np.cumsum(qf) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(qf * 2.01) / SR) + 0.25 * np.sin(2 * np.pi * np.cumsum(qf * 3.03) / SR)
q += bp(nz(N), 2000, 6000) * 0.04 * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t))
bed(q * gate(81.0, 89.0, 1.0, 0.004) * (0.35 + 0.65 * ramp(81, 89) ** 1.5), -8, 0.5)

# ---------------------------------------------------------------- дождь и улица
rain_raw = nz(N)
rain_out = lp(hp(rain_raw, 400), 7000) * 0.5
rain_in = lp(rain_raw, 900) * 0.6                                      # из комнаты: глухой стук по карнизу
drips = np.zeros(N)
idx = rng.choice(N, 900, replace=False)
drips[idx] = rng.uniform(0.3, 1.0, 900)
drips = bp(drips, 900, 4000) * 6
vol_in = gate(0.0, 18.0, 0.01, 0.5) * 0.9 + gate(18.0, 34.0, 0.5, 0.3) * 0.45
vol_out = gate(34.0, 50.0, 0.25, 0.2) * 1.0 + gate(50.0, 67.0, 0.2, 0.3) * 0.7 * (1 - 0.4 * ramp(58, 66)) + gate(67.0, 81.0, 0.3, 0.6) * 0.3
bed(rain_in * vol_in, -14, 0.8)
bed(drips * vol_in, -24, 0.5)
bed(rain_out * vol_out, -15, 0.9)

# ---------------------------------------------------------------- SFX
def click(bright=1.0, f=2200):
    n = int(SR * 0.08)
    return (bp(nz(n), 1500, 9000) * env(n, 0.0002, 0.012) + np.sin(2 * np.pi * f * np.arange(n) / SR) * env(n, 0.0002, 0.02) * 0.5) * bright
def boom(f0=120, f1=28, dur=2.0):
    n = int(SR * dur); x = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-x * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, dur * 0.4)
    return np.tanh(1.6 * s) * 0.9
def whoosh(dur, lo=300, hi=5000):
    n = int(SR * dur); x = np.linspace(0, 1, n)
    return bp(nz(n), lo, hi) * np.sin(np.pi * x) ** 2
def ring(freqs, dur, amp=1.0):
    n = int(SR * dur); x = np.arange(n) / SR
    return sum(a * np.sin(2 * np.pi * f * x) * np.exp(-x / d) for f, a, d in freqs) * amp
def step_wet(hard=1.0):
    n = int(SR * 0.25); x = np.arange(n) / SR
    body = np.sin(2 * np.pi * 85 * x) * env(n, 0.001, 0.03)
    splash = bp(nz(n), 1200, 8000) * env(n, 0.004, 0.07) * 0.8
    return (body * 0.8 + splash * hard) * 0.9
def heel():
    n = int(SR * 0.35); x = np.arange(n) / SR
    return (bp(nz(n), 800, 5000) * env(n, 0.0005, 0.02) + np.sin(2 * np.pi * 210 * x) * env(n, 0.001, 0.05) * 0.7) + bp(nz(n), 200, 3000) * env(n, 0.005, 0.25) * 0.15
def crackle(dur, dens=0.02):
    n = int(SR * dur); x = np.zeros(n); k = rng.random(n) < dens / 10
    x[k] = rng.uniform(-1, 1, k.sum())
    return hp(x, 1500) * 4 * np.exp(-np.arange(n) / SR / (dur * 0.5))

# сцена 1
put(click(1.2, 3100), E["zippoFlick"], -10, 0.2)                                         # щелчок колёсика
put(bp(nz(SR * 0.2), 1500, 7000) * env(SR * 0.2, 0.002, 0.05), E["zippoFlick"] + 0.02, -16, 0.2)
put(whoosh(0.6, 200, 1500) * env(SR * 0.6, 0.02, 0.4), E["zippoFlick"] + 0.05, -18, 0.2)   # огонёк
bz = np.zeros(int(SR * 2.8)); xb = np.arange(len(bz)) / SR
bz = np.sin(2 * np.pi * 165 * xb) * (np.sin(np.pi * xb / 0.9) > 0.3) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 165 * 2 * xb)))
put(lp(bz, 1200) * 0.6, E["buzz"], -14)                                                   # вибрация по дубу
put(boom(70, 18, 3.5), E["screenOn"] + 0.45, -6)                                          # инфразвук при тексте
for i in range(70):
    put(click(0.3, 4000 + 300 * (i % 5)), E["screenOn"] + 0.55 + i / 17, -30, (i % 7 - 3) / 10)   # «высекание»
put(boom(90, 25, 2.0), SH["wings"][0] + 0.2, -10)
put(whoosh(1.2, 100, 900), SH["wings"][0], -18)
# сцена 2
put(click(1.6, 900) + ring([(140, 0.6, 0.05)], 0.08), E["lampOff"], -6, -0.3)            # выключатель лампы
put(crackle(0.9, 0.05), E["lampOff"] + 0.03, -20, -0.3)                                   # треск нити
sand = bp(nz(SR * 3.5), 1500, 9000) * (rng.random(int(SR * 3.5)) < 0.15) * 2.2 + bp(nz(SR * 3.5), 400, 2500) * 0.3
put(sand * np.sin(np.pi * np.linspace(0, 1, len(sand))) ** 0.6, E["palmHeat"], -18)       # сыплющийся песок
put(boom(60, 22, 2.5), E["palmHeat"] + 0.3, -11)
put(boom(110, 30, 1.5), E["pupil"], -9)
# шёпот: формантный шум отдельными «словами» в белом шуме
wh = np.zeros(N)
for k in range(26):
    a = 19.5 + k * 0.55 + rng.uniform(0, 0.3)
    n = int(SR * rng.uniform(0.25, 0.5)); i = int(a * SR)
    f1 = rng.choice([500, 700, 900]); f2 = rng.choice([1200, 1700, 2300])
    w = (bp(nz(n), f1 * 0.8, f1 * 1.2) + bp(nz(n), f2 * 0.85, f2 * 1.15) * 0.7 + bp(nz(n), 3500, 7000) * 0.5) * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
    wh[i:i + n] += w
bed(wh * gate(19.5, 33.5, 0.5, 0.5), -27, 0.9)
bed(bp(nz(N), 2000, 9000) * gate(18.4, 34, 0.6, 0.3), -36, 1.0)                          # белый шум

# сцена 3: шаги по лужам, гром, фонари
walk0 = SH["alleyFront"][0]
k = 0; tt = walk0 + 0.25
while tt < SH["alleyBack"][1] - 0.2:
    put(step_wet(0.8 + 0.4 * rng.random()), tt, -13 + rng.uniform(-1.5, 1.5), 0.1 if k % 2 else -0.1)
    tt += 0.527; k += 1
for a, g in [(36.4, -8), (47.2, -10)]:
    n = int(SR * 4.5)
    th = lp(nz(n), 180, 4) * env(n, 0.25, 1.4) * 3 + lp(nz(n), 900) * env(n, 0.02, 0.4) * 0.6
    put(th, a, g, -0.2)
for i, d in enumerate(E["lampDie"]):
    put(crackle(0.7, 0.2) + bp(nz(SR * 0.7), 3000, 9000) * env(SR * 0.7, 0.001, 0.15), d, -9, -0.5)   # электротреск
    put(mixa(click(2.0, 600), boom(200, 60, 0.4) * 0.6), d + 0.1, -9, -0.5)                                  # хлопок
    put(bp(nz(SR * 1.4), 4000, 10000) * env(SR * 1.4, 0.01, 0.5), d + 0.12, -18, -0.4)                  # шипение искр
# сцена 4
for a in E["apoStep"]:
    put(heel(), a, -10, 0.3)
uvw = np.sin(2 * np.pi * 3800 * np.arange(int(SR * 3.4)) / SR) * 0.15 + bp(nz(SR * 3.4), 6000, 10000) * 0.2
put(uvw * env(SR * 3.4, 0.05, 2.5), E["uvOn"], -26)
put(click(1.0, 1800), E["uvOn"], -16)
put(ring([(1320, 0.5, 0.5), (2710, 0.3, 0.3), (4150, 0.15, 0.2), (620, 0.4, 0.4)], 1.4) + bp(nz(SR * 1.4), 400, 3000) * env(SR * 1.4, 0.0005, 0.02),
    E["medalClank"], -12, 0.2)
# сцена 5
put(bp(nz(SR * 1.2), 2500, 8000) * np.sin(np.pi * np.linspace(0, 1, int(SR * 1.2))) * 0.4, E["zippoSeam"], -22)   # ноготь по шву
put(mixa(click(1.5, 5200), ring([(3100, 0.4, 0.06), (5300, 0.2, 0.04)], 0.2)), E["zippoSplit"], -9)                    # пружина
put(ring([(180, 0.5, 0.3)], 0.6) * 0.5 + bp(nz(SR * 0.6), 200, 2000) * env(SR * 0.6, 0.01, 0.15), E["zippoSplit"] + 0.05, -16)
put(boom(80, 25, 2.0), E["zippoSplit"] + 0.3, -14)
put(mixa(ring([(880, 0.5, 1.8), (1763, 0.35, 1.2), (2650, 0.2, 0.8), (440, 0.4, 2.0), (3520, 0.1, 0.5)], 3.0), boom(150, 40, 1.0) * 0.5),
    E["join"], -6)                                                                                               # звон соединения
put(whoosh(1.4, 200, 7000) * env(SR * 1.4, 0.05, 0.7), E["flash"] - 0.3, -12)
n = int(SR * 3.6)
grind = lp(nz(n), 300, 4) * 4 * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * np.arange(n) / SR)) + bp(nz(n), 600, 2500) * 0.3 * (rng.random(n) < 0.2)
grind *= np.sin(np.pi * np.linspace(0, 1, n)) ** 0.5
put(grind, E["wallOpen"], -8)
put(boom(45, 20, 3.5), E["wallOpen"], -7)
# сцена 6
for a in E["stepDown"]:
    put(heel(), a, -14, -0.2)
put(bp(nz(SR * 0.6), 700, 5000) * np.sin(np.pi * np.linspace(0, 1, int(SR * 0.6))) ** 2, E["hood"] - 0.2, -20)   # шорох капюшона
# удар на затемнении и цикада в тишине
imp = boom(140, 30, 3.0) * 1.2 + lp(nz(SR * 3), 2500) * env(SR * 3, 0.001, 0.25) * 0.7 + ring([(55, 0.6, 1.5)], 3.0)
put(np.tanh(imp * 1.4), E["impact"], -1)
n = int(SR * (DUR - E["title"] - 0.1)); x = np.arange(n) / SR
chirp = np.sin(2 * np.pi * 5200 * x) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 120 * x))) * (np.sin(2 * np.pi * 3.2 * x) > 0.2)
chirp = bp(chirp, 3800, 7000) * np.minimum(1, x / 0.8) * np.minimum(1, (n / SR - x) / 0.6)
put(chirp, E["title"] + 0.1, -22, 0.4)

# ---------------------------------------------------------------- закадр, с приглушением подложки
def load(name):
    with wave.open(os.path.join(ROOT, "public", "vo", name + ".wav")) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    return a
vo = np.zeros(len(L))
for name, at in VO.items():
    a = load(name)
    a = a / (np.sqrt(np.mean(a ** 2)) + 1e-9) * 0.12
    if name == "apo": a = lp(a, 7000) * 1.05
    i = int(at * SR); vo[i:i + len(a)] += a
mask = lp((np.abs(vo) > 0.01).astype(float), 3) > 0.05
duck = lp(mask.astype(float), 2)
duck = 1 - 0.45 * np.clip(duck * 3, 0, 1)
L *= duck; R *= duck
# лёгкая «комната» на закадре
rev = np.zeros(len(vo))
for d, g in [(0.031, 0.25), (0.047, 0.2), (0.071, 0.14), (0.113, 0.09)]:
    rev[int(d * SR):] += vo[:-int(d * SR)] * g
L += vo + lp(rev, 4000) * 0.6; R += vo + lp(np.roll(rev, 300), 4000) * 0.6

out = np.stack([L[:N], R[:N]], 1)
out = np.tanh(out / np.abs(out).max() * 1.3) * 0.89
out /= np.abs(out).max() / 0.89
os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
p = os.path.join(ROOT, "out", "mix.wav")
with wave.open(p, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print("saved", p, round(DUR, 2), "s")
