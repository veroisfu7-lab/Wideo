# Звук «Некробиоса»: синтез партитуры (дроны, пульсы, бреймы) и шумовых эффектов по таймингу сценария, сведение в out/audio.wav.
# Всё кодом (numpy), 48 кГц стерео. Шёпот — espeak-ng (голос ru+whisper) с обработкой.
import numpy as np, subprocess, wave, os, json, sys

SR = 48000
DUR = 90.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
os.makedirs(OUT, exist_ok=True)

def T(d): return np.arange(int(SR * d)) / SR
def S(*xs):
    n = max(len(x) for x in xs); out = np.zeros(n)
    for x in xs: out[: len(x)] += x
    return out
def db(x): return 10 ** (x / 20)
def env_adsr(n, a, d, s, r):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n); e[:na] = np.linspace(0, 1, na) if na else e[:na]
    nd = min(nd, n - na); e[na:na + nd] = np.linspace(1, s, nd) if nd else e[na:na + nd]
    nr = min(nr, n)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
def expdec(n, tau): return np.exp(-np.arange(n) / (tau * SR))
def noise(n): return rng.standard_normal(n)

# --- фильтры (1-й/2-й порядок, IIR через scipy)
from scipy.signal import butter, sosfilt, fftconvolve
def lp(x, f, o=2): return sosfilt(butter(o, min(f, SR / 2 - 100) / (SR / 2), "low", output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f / (SR / 2), "high", output="sos"), x)
def bp(x, f1, f2, o=2): return sosfilt(butter(o, [f1 / (SR / 2), min(f2, SR / 2 - 100) / (SR / 2)], "band", output="sos"), x)

# --- реверберация: стерео-IR из затухающего шума
def make_ir(tail, damp=6000, pre=0.012):
    n = int(tail * SR)
    irs = []
    for s in (1, 2):
        r = np.random.default_rng(s).standard_normal(n) * np.exp(-np.arange(n) / (tail / 6.9 * SR))
        r = lp(r, damp, 1)
        r = np.concatenate([np.zeros(int(pre * SR)), r])
        irs.append(r / np.sqrt(np.sum(r ** 2)))
    return irs
IR_ROOM = make_ir(1.1, 5000)
IR_BIG = make_ir(3.5, 3500, 0.03)
def reverb(x, ir, wet=0.3):
    L = fftconvolve(x, ir[0])[: len(x)]; R = fftconvolve(x, ir[1])[: len(x)]
    return np.stack([x * (1 - wet) + L * wet, x * (1 - wet) + R * wet])

class Bus:
    def __init__(self): self.buf = np.zeros((2, N))
    def put(self, sig, t, gain_db=0.0, pan=0.0):
        if sig.ndim == 1: sig = np.stack([sig * np.sqrt(0.5 * (1 - pan)) * 1.414, sig * np.sqrt(0.5 * (1 + pan)) * 1.414])
        i = int(t * SR)
        if i >= N: return
        j = min(N, i + sig.shape[1])
        if i < 0: sig = sig[:, -i:]; j = min(N, sig.shape[1]); i = 0
        self.buf[:, i:j] += sig[:, : j - i] * db(gain_db)
music = Bus(); fx = Bus(); amb = Bus()
EVENTS = []
def ev(name, t, g=0.0): EVENTS.append((round(t, 3), name, g))

EV = dict(plate=0.6, polishStart=6.0, ragToss=11.35, ragLand=11.85, desyncHud=12.2, headBack=12.6, dblHead=14.2,
          phoneUp=16.3, phoneOn=17.6, track=18.2, trackLabel=19.0, focusPull=25.0, redFrame=25.6, silhouette=26.6, errorWin=28.6,
          dashTable=33.0, toolsSweep=33.7, folderSlap=34.6, ties=35.6, coverOpen=37.6, diagram=40.3, finger=44.2,
          dblArms=48.6, dblTilt=50.3, step1=51.4, step2=52.6, step3=53.7, metal=55.6, eyes=57.0, grin=58.6, palm=62.4, critical=63.2,
          jumpBack=66.05, grab=67.4, scream=67.9, swingUp=70.4, impact=72.95, claw=75.0, grabWrist=75.8, pull=76.6,
          calm=81.0, sleeves=81.8, hair=83.4, turn=85.6, glint=86.5, whisper=86.9, cut=87.8, title1=88.0, title2=88.7)

# ============================================================== ПАРТИТУРА
t = np.arange(N) / SR
def seg(x, a, b): return np.clip((x - a) / (b - a), 0, 1)
# 1) низкий дрон D (36.7 Гц) с расстроенными пилами, медленно растёт к кульминации
def saw(f, ph=0.0): return 2 * ((f * t + ph) % 1) - 1
f0 = 36.71
drone = sum(saw(f0 * m * (1 + d), p) for m, d, p in [(1, 0, 0), (1, 0.004, 0.3), (2, -0.003, 0.6), (3, 0.002, 0.1), (1.5, 0.003, 0.8)]) / 5
drone_cut = 120 + 380 * seg(t, 48, 66) + 200 * np.sin(t * 0.21) ** 2
# медленно меняющийся НЧ-фильтр: кусками
dr = np.zeros(N); blk = SR // 10
for i in range(0, N, blk):
    c = drone_cut[i]
    dr[i:i + blk] = lp(drone[max(0, i - 4800):i + blk], c, 2)[-(min(N, i + blk) - i):]
drone_lvl = (0.25 + 0.35 * seg(t, 11, 16) + 0.15 * seg(t, 24, 33) - 0.25 * seg(t, 33, 34) * (1 - seg(t, 40, 48))
             + 0.45 * seg(t, 48, 66)) * (1 - 0.85 * seg(t, 81, 81.6)) * (1 - seg(t, 87.75, 87.8))
music.put(dr * drone_lvl * 0.5, 0, -6)
# суб-слой
sub = np.sin(2 * np.pi * f0 * t + 0.3 * np.sin(2 * np.pi * 0.07 * t)) * (0.2 + 0.4 * seg(t, 55, 66)) * (1 - seg(t, 81, 81.5)) * (1 - seg(t, 87.75, 87.8))
music.put(sub, 0, -8)
# 2) стеклянная тема зеркала: редкие «стеклянные» тоны (неармонические парциалы)
def glass_tone(f, d=3.0, bright=1.0):
    tt = T(d); s = 0
    for k, (m, a) in enumerate([(1, 1), (2.76, 0.5), (5.4, 0.25 * bright), (8.93, 0.12 * bright)]):
        s = s + a * np.sin(2 * np.pi * f * m * tt + k) * np.exp(-tt * (1.2 + k * 0.8))
    return s * (1 - np.exp(-tt * 80))
for tt0, f in [(1.0, 587.3), (3.4, 440.0), (5.2, 466.2), (8.0, 587.3), (9.9, 554.4), (40.6, 440), (42.2, 466.2), (44.0, 392), (46.0, 349.2), (81.8, 587.3), (84.0, 554.4)]:
    music.put(reverb(glass_tone(f), IR_BIG, 0.55) * 0.18, tt0, -4, 0)
# 3) пульс тревоги (сцены 2 и 4): глухие удары-сердцебиение
def heartbeat():
    tt = T(0.5)
    a = np.sin(2 * np.pi * 52 * tt) * np.exp(-tt * 18); b = np.sin(2 * np.pi * 46 * tt) * np.exp(-tt * 14)
    return a + 0.7 * np.concatenate([np.zeros(int(0.17 * SR)), b[: len(tt) - int(0.17 * SR)]])
hb = heartbeat()
for i, x in enumerate(np.arange(12.4, 24.0, 0.86)):
    music.put(hb, x, -6 + 3 * (i / 14))
for x in np.arange(48.4, 55.0, 0.72): music.put(hb, x, -4)
for x in np.arange(76.8, 81.0, 1.5): music.put(lp(hb, 200), x, -2)  # замедленное в слоумо
# 4) тиканье напряжения (сцена 2), секундная пульсация
def tick():
    tt = T(0.05); return bp(noise(len(tt)), 2500, 6000) * np.exp(-tt * 120)
for x in np.arange(16.0, 24.0, 0.5): music.put(tick(), x, -24, 0.2)
# 5) бреймы и подъёмы
def braam(d=2.5, f=55.0):
    tt = T(d); s = sum(saw(f * m)[: len(tt)] for m in (1, 1.005, 2, 2.01, 3)) if False else 0
    s = sum(2 * ((f * m * tt + p) % 1) - 1 for m, p in [(1, 0), (1.006, 0.3), (2, 0.1), (2.012, 0.7), (1.5, 0.5)]) / 5
    s = lp(s, 900) * env_adsr(len(tt), 0.03, 0.3, 0.7, 1.4)
    return s + 0.5 * np.sin(2 * np.pi * f / 2 * tt) * np.exp(-tt * 1.2)
def riser(d, f1=80, f2=1600, noise_amt=0.6):
    tt = T(d); ph = 2 * np.pi * np.cumsum(f1 * (f2 / f1) ** (tt / d)) / SR
    s = np.sin(ph) * 0.4 + noise_amt * bp(noise(len(tt)), 300, 6000) * (tt / d) ** 2
    return s * (tt / d) ** 2.2
music.put(reverb(braam(3.0, 49.0), IR_BIG, 0.4), EV["redFrame"], -2)
music.put(reverb(riser(3.5), IR_BIG, 0.3), EV["critical"] - 3.5, -6)
music.put(reverb(braam(3.5, 41.2), IR_BIG, 0.45), EV["critical"], 0)
music.put(riser(2.4, 60, 2400, 0.8), EV["impact"] - 2.4, -4)
music.put(reverb(braam(2.0, 36.7), IR_BIG, 0.5), EV["cut"], 2)
# 6) диссонансные струнные кластеры (аддитивные синусы с вибрато) в сценах 4–5
def cluster(d, freqs, lvl=1.0):
    tt = T(d); s = 0
    for k, f in enumerate(freqs):
        vib = 1 + 0.004 * np.sin(2 * np.pi * (5 + k * 0.3) * tt + k)
        s = s + sum(np.sin(2 * np.pi * f * h * np.cumsum(vib) / SR) / h for h in (1, 2, 3))
    return s / len(freqs) * env_adsr(len(tt), d * 0.4, 0.1, 1, d * 0.3) * lvl
music.put(reverb(cluster(7.0, [146.8, 155.6, 220.0, 233.1]), IR_BIG, 0.5), 48.0, -14)
music.put(reverb(cluster(11.0, [146.8, 155.6, 207.7, 220.0, 311.1]), IR_BIG, 0.5), 55.0, -11)
music.put(reverb(cluster(6.0, [110.0, 116.5, 164.8, 174.6]), IR_BIG, 0.5), 66.0, -12)
music.put(reverb(lp(cluster(8.0, [73.4, 77.8, 110.0, 116.5]), 1200), IR_BIG, 0.6), 73.0, -9)
# 7) «папка»: напряжённый ритм ударов (сцена 3)
def drum(f=60, d=0.6, click=0.4):
    tt = T(d); ph = 2 * np.pi * np.cumsum(f * (1 + 2.5 * np.exp(-tt * 30))) / SR
    return np.sin(ph) * np.exp(-tt * 6) + click * bp(noise(len(tt)), 800, 5000) * np.exp(-tt * 60)
for i, x in enumerate(np.arange(33.0, 40.0, 0.5)):
    if i % 4 in (0, 3): music.put(drum(58, 0.6), x, -6 - (2 if i % 4 == 3 else 0))
# 8) моушн-схема: электронные пульсы
for i, x in enumerate(np.arange(40.3, 47.8, 0.25)):
    tt = T(0.12); s = np.sin(2 * np.pi * (880 if i % 4 == 0 else 660) * tt) * np.exp(-tt * 40)
    music.put(s, x, -26, 0.4 * np.sin(i))
music.put(reverb(lp(noise(int(SR * 7.5)), 400) * 0.3 * env_adsr(int(SR * 7.5), 1.5, 0.5, 1, 2), IR_BIG, 0.4), 40.2, -14)

# ============================================================== ЭМБИЕНТ
# гул лампы накаливания (50 Гц + гармоники), шорох комнаты
hum = sum(np.sin(2 * np.pi * 50 * k * t + k) / k ** 1.5 for k in range(1, 7)) * 0.05
room = lp(noise(N), 900) * 0.035
crackle = (rng.random(N) > 0.99993) * rng.standard_normal(N)
crackle = bp(crackle, 1500, 8000) * 0.6
amb_lvl = np.ones(N) * (1 - 0.6 * seg(t, 24, 24.05) * (1 - seg(t, 33, 33.05))) * (1 - 0.7 * seg(t, 73, 73.05) * (1 - seg(t, 81, 81.3))) * (1 - seg(t, 87.75, 87.8))
amb.put((hum + room + crackle) * amb_lvl, 0, -6)
# цифровой гул телефона в сцене 2b
amb.put(S(bp(noise(len(T(9))), 3000, 9000) * 0.03, np.sin(2 * np.pi * 120 * T(9)) * 0.02), 24.0, -8)

# ============================================================== ЭФФЕКТЫ
def whoosh(d=0.5, f1=300, f2=3000, peak=0.5):
    tt = T(d); x = tt / d; e = np.exp(-((x - peak) / 0.22) ** 2)
    s = noise(len(tt)); out = np.zeros(len(tt)); blk = 480
    for i in range(0, len(tt), blk):
        f = f1 + (f2 - f1) * e[i]; out[i:i + blk] = bp(s[max(0, i - 2000):i + blk], max(80, f * 0.5), f * 1.5)[-len(out[i:i + blk]):]
    return out * e
def cloth(d=0.35): tt = T(d); return bp(noise(len(tt)), 600, 4500) * env_adsr(len(tt), 0.05, 0.1, 0.6, 0.15) * (0.6 + 0.4 * np.abs(np.sin(tt * 37)))
def thud(f=90, d=0.35, bright=1500):
    tt = T(d); return np.sin(2 * np.pi * f * tt * (1 + 0.5 * np.exp(-tt * 25))) * np.exp(-tt * 14) + 0.5 * lp(noise(len(tt)), bright) * np.exp(-tt * 40)
def click(f=3000, d=0.03): tt = T(d); return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 300) + 0.3 * bp(noise(len(tt)), 2000, 8000) * np.exp(-tt * 400)
def ui_chime(f1=1318.5, f2=1760.0):
    tt = T(0.9); a = np.sin(2 * np.pi * f1 * tt) * np.exp(-tt * 6); b = np.sin(2 * np.pi * f2 * tt) * np.exp(-tt * 5)
    b = np.concatenate([np.zeros(int(0.09 * SR)), b[: len(tt) - int(0.09 * SR)]])
    return (a + b) * (1 - np.exp(-tt * 300)) * 0.5
def beep(f, d=0.12): tt = T(d); return np.sin(2 * np.pi * f * tt) * env_adsr(len(tt), 0.004, 0.02, 0.7, 0.03)
def glitch(d=0.3, seed=0):
    r = np.random.default_rng(seed); tt = T(d); s = np.zeros(len(tt)); i = 0
    while i < len(tt):
        L = int(r.uniform(0.008, 0.05) * SR); kind = r.integers(0, 3)
        if kind == 0: seg_ = np.sign(np.sin(2 * np.pi * r.uniform(200, 3000) * np.arange(L) / SR))
        elif kind == 1: seg_ = r.standard_normal(L)
        else: seg_ = np.round(r.standard_normal(L) * 3) / 3
        s[i:i + L] = seg_[: len(s[i:i + L])] * r.uniform(0.3, 1.0); i += L
    return hp(s, 150) * 0.6
def ice_crack():
    tt = T(0.8); s = np.zeros(len(tt))
    for k in range(14):
        p = int(rng.uniform(0, 0.12) * SR); L = int(0.02 * SR)
        s[p:p + L] += bp(noise(L), 2000, 9000) * np.exp(-np.arange(L) / (0.003 * SR)) * rng.uniform(0.3, 1)
    s += 0.8 * bp(noise(len(tt)), 400, 3000) * np.exp(-tt * 18)
    s += np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 10) * 0.9
    return s
def metal_ring(f=420, d=3.0):
    tt = T(d); s = sum(np.sin(2 * np.pi * f * m * tt + m) * np.exp(-tt * (0.6 + i * 0.5)) / (1 + i) for i, m in enumerate([1, 1.47, 2.09, 2.76, 3.52, 4.3]))
    return s * (1 - np.exp(-tt * 200))
def scrape(d=0.6, f=1800): tt = T(d); return bp(noise(len(tt)), f * 0.6, f * 1.6) * env_adsr(len(tt), 0.02, 0.1, 0.7, 0.2) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * tt))
def gloop(d=1.2, f=120):
    tt = T(d); ph = 2 * np.pi * np.cumsum(f * (1 + 1.2 * np.sin(2 * np.pi * 3 * tt) * np.exp(-tt * 2))) / SR
    return np.sin(ph) * np.exp(-tt * 2.5) + 0.4 * lp(noise(len(tt)), 600) * np.exp(-tt * 4)
def sizzle(d=1.5): tt = T(d); return hp(noise(len(tt)), 3000) * env_adsr(len(tt), 0.01, 0.2, 0.5, 0.8) * (0.5 + 0.5 * (rng.random(len(tt)) > 0.6))
def squeak(d=0.35, f=1500):
    tt = T(d); fr = f * (1 + 0.25 * np.sin(2 * np.pi * 2.3 * tt)); ph = 2 * np.pi * np.cumsum(fr) / SR
    return (np.sin(ph) + 0.3 * np.sin(2 * ph)) * env_adsr(len(tt), 0.04, 0.05, 0.8, 0.12) * (0.5 + 0.5 * (np.sin(2 * np.pi * 47 * tt) > 0))

# --- сцена 1: крючок в первую секунду — обратный «стеклянный» свип в удар под плашку
sw = T(0.65); swell = bp(noise(len(sw)), 2000, 9000) * (sw / 0.65) ** 3
fx.put(reverb(swell, IR_BIG, 0.4), 0.0, -14)
fx.put(reverb(S(np.sin(2 * np.pi * 41 * T(2.0)) * np.exp(-T(2.0) * 2.2), 0.4 * glass_tone(880, 2.0)), IR_BIG, 0.45), 0.6, -6); ev("intro hit", 0.6)
fx.put(reverb(ui_chime(), IR_ROOM, 0.35), EV["plate"], -14); ev("ui plate", EV["plate"])
# полировка: трение тряпки по стеклу, два мазка за оборот + редкий скрип
for k, x in enumerate(np.arange(6.0, 11.3, 1.15 / 2)):
    d = 0.5; tt = T(d)
    s = bp(noise(len(tt)), 900, 5000) * np.sin(np.pi * tt / d) ** 2
    fx.put(s, x, -14, 0.25); ev("rub", x)
    if k % 3 == 1: fx.put(squeak(0.28, 1300 + 200 * (k % 2)), x + 0.12, -22, 0.3); ev("squeak", x + 0.12)
fx.put(whoosh(0.45, 400, 3500, 0.35), EV["ragToss"] - 0.1, -8, 0.5); ev("rag whoosh", EV["ragToss"])
fx.put(cloth(0.25), EV["ragLand"], -12, 0.7); fx.put(thud(140, 0.2, 800), EV["ragLand"], -16, 0.7); ev("rag land", EV["ragLand"])
# эхо отражения: тот же взмах на 0.48 с позже, «сквозь воду»
fx.put(reverb(lp(whoosh(0.7, 200, 1500, 0.4), 700), IR_BIG, 0.5), EV["ragToss"] + 0.48, -8, -0.3); ev("reflection whoosh (lagged)", EV["ragToss"] + 0.48)
fx.put(reverb(np.sin(2 * np.pi * 60 * T(1.2)) * np.exp(-T(1.2) * 3) * 0.8, IR_BIG, 0.5), EV["ragToss"] + 0.48, -4); ev("sub hit desync", EV["ragToss"] + 0.48)
for x in np.arange(EV["desyncHud"], 16.0, 0.5): fx.put(beep(2200, 0.04), x, -28, -0.5)
fx.put(cloth(0.8) * 0.5, EV["headBack"], -18)
fx.put(reverb(lp(scrape(1.4, 300), 500), IR_BIG, 0.5), EV["dblHead"], -12); ev("reflection head turn creak", EV["dblHead"])
# --- сцена 2
fx.put(cloth(0.5), EV["phoneUp"] - 0.1, -10, 0.3); ev("phone out", EV["phoneUp"])
fx.put(click(4000), EV["phoneOn"], -12); fx.put(reverb(ui_chime(1046.5, 1568), IR_ROOM, 0.3), EV["phoneOn"] + 0.05, -14); ev("phone on", EV["phoneOn"])
for i in range(10): fx.put(beep(1200 + i * 140, 0.03), EV["track"] + i * 0.06, -24, 0.3);
ev("tracking scan", EV["track"])
fx.put(beep(1760, 0.08), EV["trackLabel"], -16); fx.put(beep(2349, 0.1), EV["trackLabel"] + 0.11, -16); ev("match beep", EV["trackLabel"])
fx.put(scrape(0.6, 2600) * 0.4, EV["focusPull"], -18); ev("focus servo", EV["focusPull"])
for i in range(6): fx.put(beep(880 if i % 2 == 0 else 830, 0.09), EV["redFrame"] + i * 0.14, -12)
ev("red frame alarm", EV["redFrame"])
fx.put(glitch(0.6, 1), EV["silhouette"] - 0.1, -8); fx.put(reverb(lp(noise(int(SR * 1.4)), 300) * np.exp(-T(1.4) * 1.5), IR_BIG, 0.5), EV["silhouette"], -6); ev("silhouette noise", EV["silhouette"])
fx.put(glitch(0.55, 2), EV["errorWin"] - 0.1, -6); fx.put(S(beep(587, 0.18), beep(554, 0.18) * 0.8), EV["errorWin"], -10); ev("error alert", EV["errorWin"])
for x in (29.9, 31.3, 32.4): fx.put(glitch(0.12, int(x * 10)), x, -14)
# --- сцена 3
fx.put(reverb(thud(70, 0.5, 2500), IR_ROOM, 0.3), 33.0, -6); ev("dash to bench", 33.0)
fx.put(scrape(0.5, 1200), EV["toolsSweep"], -10, 0.2)
for k in range(6): fx.put(S(click(2500 + k * 400, 0.06), 0.6 * metal_ring(1200 + 300 * k, 0.3)), EV["toolsSweep"] + 0.05 + k * 0.06, -16, 0.4 * np.sin(k));
ev("tools clatter", EV["toolsSweep"])
fx.put(S(thud(110, 0.4, 2000), 0.6 * bp(noise(len(T(0.4))), 300, 2000) * np.exp(-T(0.4) * 20)), EV["folderSlap"], -4); ev("folder slap", EV["folderSlap"])
for x in np.arange(EV["ties"], EV["ties"] + 1.3, 0.22): fx.put(bp(noise(int(0.18 * SR)), 1500, 6000) * np.hanning(int(0.18 * SR)), x, -18, 0.4)
ev("strings untie", EV["ties"])
fx.put(S(scrape(1.2, 700) * 0.6, squeak(1.0, 400) * 0.15), EV["coverOpen"], -12); fx.put(cloth(0.6) * 0.7, EV["coverOpen"] + 0.8, -12); ev("cover open", EV["coverOpen"])
for x in np.arange(EV["finger"], 47.6, 0.6): fx.put(bp(noise(int(0.5 * SR)), 2000, 7000) * np.hanning(int(0.5 * SR)), x, -26)
ev("finger on paper", EV["finger"])
# --- сцена 4
fx.put(reverb(lp(cloth(0.9), 1200), IR_BIG, 0.5), EV["dblArms"], -10); ev("double folds arms (muffled)", EV["dblArms"])
fx.put(reverb(S(scrape(0.5, 250) * 0.8, click(900, 0.05)), IR_BIG, 0.4), EV["dblTilt"] + 0.3, -10); ev("neck creak", EV["dblTilt"])
for x in (EV["step1"], EV["step2"], EV["step3"]): fx.put(reverb(ice_crack(), IR_BIG, 0.45), x, -3); ev("ice step", x)
# --- сцена 4b: металл, ртуть, ухмылка, ладонь, тревога
fx.put(reverb(S(metal_ring(311, 4.0) * 0.7, metal_ring(466, 4.0) * 0.4), IR_BIG, 0.5), EV["metal"], -10); ev("metal shimmer", EV["metal"])
fx.put(reverb(gloop(1.6, 90), IR_BIG, 0.4), EV["eyes"], -8); fx.put(metal_ring(1400, 1.5) * 0.5, EV["eyes"] + 0.3, -16); ev("mercury eyes", EV["eyes"])
for i in range(9):
    x = EV["grin"] + i * 3.2 / 9
    fx.put(S(click(1800, 0.04), 0.5 * scrape(0.12, 400)), x, -12, 0.0); ev("grin ratchet", x)
fx.put(S(thud(80, 0.4, 900), squeak(0.5, 900) * 0.3), EV["palm"], -6); ev("palm on glass", EV["palm"])
for x in np.arange(EV["critical"], 66.0, 0.25): fx.put(S(beep(988, 0.12) * 0.8, beep(1046, 0.12) * 0.6), x, -12)
ev("critical alarm", EV["critical"])
# --- сцена 5
fx.put(whoosh(0.5, 300, 2500), EV["jumpBack"], -8); fx.put(thud(70, 0.4, 600), EV["jumpBack"] + 0.55, -4); ev("jump back + land", EV["jumpBack"] + 0.55)
fx.put(S(scrape(0.4, 1500), 0.7 * metal_ring(700, 0.6)), EV["grab"] + 0.3, -8, 0.4); ev("grab wrench", EV["grab"] + 0.3)
# крик: форманты «А» на пиле с вибрато
def scream(d=0.9):
    tt = T(d); f = 210 * (1 + 0.25 * np.sin(np.pi * tt / d)) * (1 + 0.02 * np.sin(2 * np.pi * 6.5 * tt))
    ph = np.cumsum(f) / SR; src = 2 * (ph % 1) - 1 + 0.25 * noise(len(tt))
    s = sum(a * bp(src, fc * 0.85, fc * 1.15) for fc, a in [(750, 1.0), (1250, 0.6), (2650, 0.35), (3500, 0.15)])
    s = np.tanh(s * 2.5) * env_adsr(len(tt), 0.06, 0.1, 0.9, 0.3)
    return s
fx.put(reverb(scream(0.9), IR_ROOM, 0.35), EV["scream"], -5); ev("scream", EV["scream"])
for x in (69.1, 69.9): fx.put(thud(75, 0.35, 700), x, -6);
ev("heavy steps", 69.1)
fx.put(whoosh(0.7, 200, 4000, 0.7), EV["impact"] - 0.65, -2); ev("swing", EV["impact"] - 0.65)
# удар: металл о «стекло», которое не бьётся — глухой жидкий удар
imp = S(thud(55, 1.5, 3000) * 1.4, metal_ring(300, 1.5) * 0.5, bp(noise(int(0.05 * SR)), 3000, 12000) * 0.8)
fx.put(reverb(imp, IR_BIG, 0.4), EV["impact"], 2); ev("IMPACT", EV["impact"])
# --- сцена 5b: слоумо (всё ниже и вязче)
fx.put(reverb(gloop(4.0, 45), IR_BIG, 0.6), 73.05, 0); ev("liquid ripple (slow)", 73.05)
fx.put(reverb(lp(noise(int(SR * 6)), 250) * env_adsr(int(SR * 6), 0.5, 0.5, 0.8, 2.0), IR_BIG, 0.5), 73.2, -8)
fx.put(reverb(S(gloop(1.5, 70), 0.6 * bp(noise(len(T(1.5))), 300, 2500) * np.exp(-T(1.5) * 3)), IR_BIG, 0.4), EV["claw"], -2); ev("claw bursts out", EV["claw"])
fx.put(S(thud(60, 0.6, 1500), scrape(0.6, 300) * 0.7), EV["grabWrist"], -2); ev("grab wrist", EV["grabWrist"])
fx.put(reverb(lp(riser(4.4, 40, 200, 0.3), 600), IR_BIG, 0.5), EV["pull"], -4); ev("pull into mirror", EV["pull"])
for k, x in enumerate(np.arange(73.6, 80.5, 0.45)): fx.put(sizzle(1.2), x, -20 + 2 * (k % 3), 0.5 * np.sin(k * 1.7));
ev("mercury hiss on floor", 73.6)
# --- сцена 6
fx.put(cloth(0.6), EV["sleeves"], -14, -0.2); fx.put(cloth(0.5), EV["sleeves"] + 0.6, -14, -0.2); ev("sleeves", EV["sleeves"])
fx.put(bp(noise(int(0.9 * SR)), 2500, 9000) * env_adsr(int(0.9 * SR), 0.1, 0.2, 0.6, 0.3), EV["hair"], -18); ev("hair", EV["hair"])
fx.put(reverb(squeak(2.5, 260) * 0.4, IR_BIG, 0.5), 82.0, -22); ev("prints sliding", 82.0)
fx.put(cloth(0.7) * 0.6, EV["turn"], -16)
fx.put(reverb(metal_ring(2637, 1.2) * 0.6, IR_BIG, 0.5), EV["glint"], -14); ev("glint ting", EV["glint"])
# шёпот «Ты следующий»
wpath = os.path.join(HERE, "whisper.wav")
subprocess.run(["espeak-ng", "-v", "ru+whisper", "-s", "175", "-p", "25", "-w", wpath, "Ты следующий"], check=True)
with wave.open(wpath) as w:
    sr0 = w.getframerate(); raw = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
nz = np.where(np.abs(raw) > 0.01)[0]; raw = raw[nz[0]: nz[-1] + 1]
from scipy.signal import resample
wsp = resample(raw, int(len(raw) * SR / sr0))
low = resample(raw, int(len(raw) * SR / sr0 * 1.12))  # ниже на ~2 полутона
wsp = hp(wsp, 300) + 0.5 * hp(low[: len(wsp)] if len(low) >= len(wsp) else np.pad(low, (0, len(wsp) - len(low))), 200)
wsp = wsp / (np.max(np.abs(wsp)) + 1e-9)
fx.put(reverb(wsp, IR_ROOM, 0.25), EV["whisper"], -6, 0.15); ev("whisper 'Ты следующий'", EV["whisper"])
# жёсткая склейка в чёрное + титры
fx.put(np.sin(2 * np.pi * 32 * T(2.0)) * np.exp(-T(2.0) * 1.2), EV["cut"], -2); ev("hard cut sub", EV["cut"])
fx.put(glitch(0.35, 11), EV["title1"], -8); fx.put(glitch(0.25, 12), EV["title2"], -10); ev("title glitch", EV["title1"])

# ============================================================== сведение
mix = music.buf * db(-3) + fx.buf * db(0) + amb.buf * db(-2)
# жёсткая тишина ровно на склейке (кроме суба/глитча) — уже заложено уровнями
fade_in = np.clip(t / 0.6, 0, 1); mix *= fade_in
fade_out = 1 - np.clip((t - 89.6) / 0.4, 0, 1); mix *= fade_out
# нормализация: статическое усиление по интегральной громкости (через ffmpeg loudnorm-анализ) + мягкий лимитер
def write(path, x):
    y = np.clip(x, -1, 1); y = (y.T * 32767).astype(np.int16)
    with wave.open(path, "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())
pk = np.max(np.abs(mix)); mix = mix / pk * 0.5
write(os.path.join(OUT, "audio_pre.wav"), mix)
for name, b in (("music", music.buf), ("sfx", fx.buf), ("amb", amb.buf)):
    write(os.path.join(OUT, f"stem_{name}.wav"), b / (np.max(np.abs(b)) + 1e-9) * 0.5)
json.dump(EVENTS, open(os.path.join(OUT, "sfx_events.json"), "w"), ensure_ascii=False, indent=0)
print("events", len(EVENTS))
