# Звук ролика целиком синтезом: джазовый контрабас + щётки + райд, колокол, храп, зевок, «блуп»,
# хруст суставов, стон «AWOOO», «BOOM», пружины, медь (чуть фальшивая), свисток, щелчок лампового ТВ.
#   python3 -I tools/audio.py  → public/audio.wav (48 кГц, стерео) + checks/audio_events.csv
import json, os, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "src", "timeline.json"), encoding="utf-8"))
SR, FPS = 48000, T["fps"]
DUR = T["total"] / FPS
N = int(DUR * SR) + SR
MUS = np.zeros((N, 2)); FX = np.zeros((N, 2))
rng = np.random.default_rng(11)
events = []

def ts(n): return np.arange(int(n)) / SR
def env(n, a=0.003, d=0.2):
    x = ts(n); return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def hp(x, fc): return x - lp(x, fc)
def bp(x, lo, hi): return lp(hp(x, lo), hi)
def reson(x, f, bw):  # двухполюсный резонатор, f и bw — числа или массивы
    n = len(x); f = np.broadcast_to(f, (n,)); bw = np.broadcast_to(bw, (n,))
    r = np.exp(-np.pi * bw / SR); a1 = -2 * r * np.cos(2 * np.pi * f / SR); a2 = r * r; g = 1 - r
    y = np.zeros(n); y1 = y2 = 0.0
    for i in range(n):
        v = g[i] * x[i] - a1[i] * y1 - a2[i] * y2; y2 = y1; y1 = v; y[i] = v
    return y
def mx(*sigs):  # сумма сигналов разной длины
    n = max(len(x) for x in sigs); o = np.zeros(n)
    for x in sigs: o[:len(x)] += x
    return o
def put(buf, sig, t, db=0.0, pan=0.0, name=""):
    i = int(round(t * SR)); g = 10 ** (db / 20)
    pl, pr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    n = min(len(sig), N - i)
    if n <= 0: return
    buf[i:i + n, 0] += sig[:n] * g * pl * 1.414; buf[i:i + n, 1] += sig[:n] * g * pr * 1.414
    if name: events.append((round(t * FPS), name, db))
def fr(frame): return frame / FPS
def norm(x): return x / (np.abs(x).max() + 1e-9)

# ================================================================ инструменты
def pluck_bass(f0, dur=0.5):  # контрабас: Karplus-Strong + «тело»
    n = int(SR * dur); p = int(SR / f0)
    buf = lp(rng.standard_normal(p), 900); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.994
    body = np.sin(2 * np.pi * f0 * ts(n)) * env(n, 0.004, 0.25) * 0.6
    thump = lp(rng.standard_normal(n), 300) * env(n, 0.001, 0.02) * 2
    return norm(lp(out, 1400) + body + thump) * np.minimum(1, (n - np.arange(n)) / 1200)

def ride(accent=1.0):
    n = int(SR * 0.6); x = ts(n)
    metal = sum(np.sin(2 * np.pi * f * x + rng.random() * 6) for f in (3120, 4470, 5310, 6880, 8170))
    s = (metal * 0.15 + hp(rng.standard_normal(n), 6000) * 0.5) * env(n, 0.001, 0.22)
    ping = np.sin(2 * np.pi * 2350 * x) * env(n, 0.001, 0.3) * 0.12
    return (s + ping) * accent * 0.5

def brush(n_s=0.22):
    n = int(SR * n_s); x = np.linspace(0, 1, n)
    return bp(rng.standard_normal(n), 1500, 7000) * np.sin(np.pi * x) ** 0.7 * 0.5

def kick(f0=110, f1=45, d=0.35):
    n = int(SR * d); x = ts(n)
    fr_ = f1 + (f0 - f1) * np.exp(-x * 30)
    return np.sin(2 * np.pi * np.cumsum(fr_) / SR) * env(n, 0.001, d * 0.5)

def vibe(freqs, d=0.9):
    n = int(SR * d); x = ts(n)
    s = sum(np.sin(2 * np.pi * f * x) + 0.15 * np.sin(2 * np.pi * 4 * f * x) * np.exp(-x * 8) for f in freqs)
    return s / len(freqs) * env(n, 0.002, 0.45) * (1 + 0.25 * np.sin(2 * np.pi * 5.5 * x))

def bell(f0=520, d=3.0):
    n = int(SR * d); x = ts(n)
    s = sum(a * np.sin(2 * np.pi * f0 * r * x) * np.exp(-x / (d * k)) for r, a, k in
            [(0.5, 0.5, 0.6), (1, 1, 0.45), (1.19, 0.5, 0.3), (1.56, 0.4, 0.25), (2.0, 0.35, 0.2), (2.74, 0.25, 0.12), (3.76, 0.15, 0.08)])
    return s * np.minimum(1, x / 0.002)

def voice(f0, formants, dur, breath=0.15, vib=0.0, shimmer=0.0):
    """Формантный голос: f0 и форманты — функции времени 0..1 (массивы)."""
    n = int(SR * dur); u = np.linspace(0, 1, n)
    f = f0(u) * (1 + vib * np.sin(2 * np.pi * 5.2 * ts(n)) + shimmer * lp(rng.standard_normal(n), 8) * 3)
    ph = np.cumsum(f) / SR
    src = (2 * (ph % 1) - 1) + breath * rng.standard_normal(n)
    src = lp(src, 3500)
    out = np.zeros(n)
    for (ff, bw, g) in formants:
        out += reson(src, ff(u), bw) * g
    return norm(out)

def whoosh(d, lo=400, hi=5000, rise=True):
    n = int(SR * d); x = np.linspace(0, 1, n); no = rng.standard_normal(n)
    a, b = bp(no, lo, hi * 0.5), bp(no, lo * 2, hi)
    s = (a * (1 - x) + b * x) if rise else (b * (1 - x) + a * x)
    return s * np.sin(np.pi * x) ** 1.5

def pop_snd(f0=900, f1=250, d=0.12):
    n = int(SR * d); x = ts(n)
    fr_ = f1 + (f0 - f1) * np.exp(-x * 40)
    return np.sin(2 * np.pi * np.cumsum(fr_) / SR) * env(n, 0.001, d * 0.35)

def click(bright=1.0, d=0.05):
    n = int(SR * d)
    return (bp(rng.standard_normal(n), 1200, 8000) * env(n, 0.0002, 0.008) + np.sin(2 * np.pi * 1800 * ts(n)) * env(n, 0.0002, 0.012) * 0.4) * bright

def creak(d=0.6, f_lo=35, f_hi=90):  # скрип: рваная пульсация через полосу
    n = int(SR * d); x = np.linspace(0, 1, n)
    rate = f_lo + (f_hi - f_lo) * (0.5 + 0.5 * np.sin(x * 9 + rng.random() * 3)) + lp(rng.standard_normal(n), 20) * 200
    ph = np.cumsum(np.maximum(5, rate)) / SR
    pulses = (np.diff(np.floor(ph), prepend=0) > 0).astype(float)
    s = reson(pulses, 1100, 180) * 0.5 + reson(pulses, 2300, 300) * 0.3
    return norm(s) * np.sin(np.pi * x) ** 0.5

# ================================================================ музыка: вкрадчивый джаз 120 bpm (бит = 15 кадров)
BEAT = 0.5
note = lambda m: 440 * 2 ** ((m - 69) / 12)
# F6 | D7 | Gm7 | C7 — шаги баса
walk = [[41, 45, 48, 50], [38, 42, 45, 48], [43, 46, 50, 53], [36, 40, 43, 46]]
chords = [[57, 60, 62, 65], [54, 57, 60, 62], [58, 62, 65, 67], [52, 55, 58, 62]]
bass_start, groove_start, music_end = 0.9, fr(T["captain"]["start"]), fr(T["title"]["start"])
t = bass_start; k = 0
while t < music_end - 0.05:
    bar, beat = divmod(k, 4); m = walk[bar % 4][beat]
    put(MUS, pluck_bass(note(m), 0.55), t, -2 + (1.5 if beat == 0 else 0), -0.1)
    if t >= groove_start:
        put(MUS, ride(1.0 if beat % 2 else 0.8), t, -10, 0.35)
        if beat % 2 == 1:
            put(MUS, ride(0.6), t + BEAT * 0.66, -13, 0.35)  # свинговая «да»
            put(MUS, brush(), t - 0.05, -9, -0.25)
        if beat == 1:
            put(MUS, vibe([note(c) for c in chords[bar % 4]], 0.9), t + BEAT * 0.66, -11, 0.2)
    t += BEAT; k += 1
# барабанный брейк на ударе Robo-Chuck: бас стихает на мгновение
# финал: победный, но чуть фальшивый медный аккорд
def brass(freqs, d, detune_cents):
    n = int(SR * d); x = ts(n); out = np.zeros(n)
    for i, f in enumerate(freqs):
        cents = detune_cents if i == 2 else 0
        ff = f * 2 ** (cents / 1200) * (1 + 0.006 * np.sin(2 * np.pi * 5.5 * x + i) * np.minimum(1, x / 0.4))
        ff = ff * (1 - 0.03 * np.exp(-x * 12))  # подъезд к ноте
        ph = np.cumsum(ff) / SR
        saw = 2 * (ph % 1) - 1
        out += saw
    a = np.minimum(1, x / 0.05) * np.minimum(1, (d - x) / 0.25)
    bright = lp(out, 2600) * 0.7 + lp(out, 900) * 0.6
    return norm(bright) * a
ch = fr(T["title"]["start"] + T["title"]["chord"])
put(MUS, brass([note(m) for m in (53, 57, 60, 62, 65)], fr(T["title"]["tvoff"] - T["title"]["chord"]) + 0.1, 38), ch, -3, 0, "brass_chord_detuned")
put(MUS, brass([note(m) for m in (41, 48)], fr(T["title"]["tvoff"] - T["title"]["chord"]) + 0.1, 0), ch, -6, 0)
put(MUS, kick(90, 40, 0.5), ch, 0, 0)
put(MUS, ride(1.4), ch, -6, 0.3)

# ================================================================ эффекты
G, CP, NA, TP, RB, TI = T["gates"], T["captain"], T["nana"], T["tempest"], T["robo"], T["title"]
# 1. ворота
put(FX, lp(bell(430, 3.5), 2500), fr(G["bell"]), -9, 0.3, "distant_bell")
put(FX, creak(1.0, 25, 60), fr(G["creak"]), -12, -0.5, "gate_creak_L")
put(FX, creak(1.0, 30, 70), fr(G["creak"] + 4), -13, 0.5, "gate_creak_R")
put(FX, whoosh(fr(G["irisEnd"] - G["iris"]) + 0.1, 300, 4000, rise=False), fr(G["iris"]), -4, 0, "iris_whoosh")
put(FX, pop_snd(1400, 500, 0.08), fr(G["irisEnd"] - 1), -8, 0, "iris_close_pop")
# 2. капитан
c0 = CP["start"]
def snore(d=0.9):
    n = int(SR * d); x = np.linspace(0, 1, n)
    rate = 55 + 25 * x
    ph = np.cumsum(rate) / SR
    puls = (np.diff(np.floor(ph), prepend=0) > 0).astype(float)
    s = reson(puls, 450, 200) + reson(puls, 900, 300) * 0.5 + lp(rng.standard_normal(n), 900) * 0.04
    return norm(s) * np.sin(np.pi * np.clip(x * 1.1, 0, 1)) ** 1.5
for s_ in CP["snores"]:
    put(FX, snore(0.75), fr(c0 + s_), -6, 0.25, "snore")
    put(FX, lp(rng.standard_normal(int(SR * 0.5)), 1500) * np.sin(np.linspace(0, np.pi, int(SR * 0.5))) * 0.3, fr(c0 + s_ + 13), -10, 0.25, "snore_exhale")
put(FX, creak(0.45, 40, 110), fr(c0 + CP["wake"]), -4, 0.2, "chair_creak")
put(FX, pop_snd(300, 120, 0.15), fr(c0 + CP["wake"]), -6, 0.2, "wake_jolt")
yd = fr(CP["yawnEnd"] - CP["yawn"]) + 0.2
yawn = voice(lambda u: 210 - 60 * u + 25 * np.sin(np.pi * u) - 50 * np.clip(u - 0.75, 0, 1) * 4,
             [(lambda u: 750 - 300 * u, 120, 1.0), (lambda u: 1250 - 500 * u, 160, 0.6), (lambda u: 2600 - 300 * u, 250, 0.25)],
             yd, breath=0.5, vib=0.02)
put(FX, yawn * np.minimum(1, ts(len(yawn)) / 0.08) * np.minimum(1, (yd - ts(len(yawn))) / 0.3), fr(c0 + CP["yawn"]), -1, 0.15, "yawn_voice")
put(FX, mx(pop_snd(1500, 400, 0.1), kick(160, 60, 0.2) * 0.7), fr(c0 + CP["word"]), -4, -0.3, "YAWN_pop")
put(FX, whoosh(0.3, 800, 6000), fr(c0 + CP["lower"] - 2), -14, -0.6, "lower_third")
put(FX, click(0.7), fr(c0 + CP["ecu"]), -8, -0.6, "ecu_panel_pop")
# переходы-волны
for w in T["wipes"]:
    put(FX, whoosh(0.6, 300, 6000), fr(w - 10), -5, 0, f"wave_wipe_{w}")
# 3. Нана
n0 = NA["start"]
for i in range(26):  # бульканье
    tt = n0 + 2 + i * 3.3 + rng.random() * 2
    put(FX, pop_snd(300 + rng.random() * 400, 120, 0.07), fr(tt), -15 - rng.random() * 5, -0.3 + rng.random() * 0.2)
for i in range(16):  # капсулы стучат в стакане и падают
    tt = n0 + NA["pour"] + 4 + i * 1.6
    put(FX, click(0.5 + rng.random() * 0.5, 0.03), fr(tt), -10, -0.2, "pill" if i == 0 else "")
    put(FX, pop_snd(700 + rng.random() * 300, 200, 0.06), fr(tt + 10), -14, -0.3)
gurg = norm(reson(rng.standard_normal(int(SR * 0.6)) * (np.sin(np.linspace(0, 40, int(SR * 0.6))) > 0.6), np.linspace(200, 500, int(SR * 0.6)), 80))
put(FX, gurg * np.linspace(0.3, 1, len(gurg)), fr(n0 + NA["bubble"]), -10, -0.3, "big_bubble_rise")
bl = mx(pop_snd(700, 140, 0.35) * 0.9, kick(140, 55, 0.3) * 0.5, bp(rng.standard_normal(int(SR * 0.1)), 500, 3000) * env(int(SR * 0.1), 0.001, 0.02) * 0.5)
put(FX, bl, fr(n0 + NA["pop"]), 1, -0.2, "BLOOP")
put(FX, whoosh(0.3, 800, 6000), fr(n0 + NA["lower"] - 2), -14, 0.6, "lower_third")
put(FX, bell(2400, 1.2) * 0.5, fr(n0 + NA["ding"]), -10, 0.5, "kitchen_timer_ding")
# 4. Темпест
p0 = TP["start"]
def crackle(d=0.25, dens=0.25):
    n = int(SR * d); s = np.zeros(n)
    idx = rng.choice(n, int(n * dens / 100), replace=False); s[idx] = rng.standard_normal(len(idx))
    return hp(s, 2500) * 3 + bp(rng.standard_normal(n), 3000, 9000) * 0.1 * env(n, 0.001, d / 2)
for s_ in TP["sparks"]:
    put(FX, crackle(0.25), fr(p0 + s_), -6, 0.0, "pointer_spark")
put(FX, whoosh(0.35, 500, 5000), fr(p0 + TP["raise"]), -10, 0, "arm_raise")
put(FX, mx(click(1.4, 0.06), pop_snd(2200, 900, 0.05)), fr(p0 + TP["crack"]), 0, 0.2, "joint_click")
put(FX, mx(click(1.2, 0.06), pop_snd(1600, 700, 0.05)), fr(p0 + TP["crack"] + 3), -1, 0.25, "joint_clack")
put(FX, crackle(0.12, 0.6), fr(p0 + TP["crack"] + 1), -6, 0.2)
gd = 1.5
groan = voice(lambda u: 135 + 60 * np.sin(np.pi * np.clip(u * 1.6, 0, 1)) - 45 * u,
              [(lambda u: 700 - 380 * u, 130, 1.0), (lambda u: 1150 - 450 * u, 170, 0.55), (lambda u: 2500 - 200 * u, 260, 0.2)],
              gd, breath=0.25, vib=0.045, shimmer=0.02)
put(FX, groan * np.minimum(1, ts(len(groan)) / 0.05) * np.minimum(1, (gd - ts(len(groan))) / 0.4), fr(p0 + TP["word"] - 4), 0, 0.2, "AWOOO_groan")
put(FX, mx(kick(150, 50, 0.3) * 0.8, whoosh(0.25, 1000, 8000, rise=False) * 0.6), fr(p0 + TP["word"]), -5, -0.2, "word_hit")
put(FX, whoosh(0.3, 800, 6000), fr(p0 + TP["lower"] - 2), -14, -0.6, "lower_third")
# 5. Robo-Chuck
r0 = RB["start"]
nw = int(SR * fr(RB["hit"] - RB["wind"]))
servo = norm(lp(2 * ((np.cumsum(np.linspace(180, 520, nw)) / SR) % 1) - 1, 2500)) * np.linspace(0.3, 1, nw) * 0.6
put(FX, servo, fr(r0 + RB["wind"]), -10, 0.3, "servo_windup")
hit_t = fr(r0 + RB["hit"])
crash = hp(rng.standard_normal(int(SR * 1.6)), 3500) * env(int(SR * 1.6), 0.001, 0.55) * 0.7
put(FX, kick(120, 42, 0.9) * 1.2, hit_t, 2, 0, "BOOM_kick")
put(FX, crash, hit_t, -2, 0.35, "cymbal_crash")
put(FX, bp(rng.standard_normal(int(SR * 0.3)), 200, 4000) * env(int(SR * 0.3), 0.001, 0.08), hit_t, -2, -0.3, "snare")
def boing(d=0.7, f0=320):
    n = int(SR * d); x = ts(n)
    f = f0 * (1 + 0.35 * np.sin(2 * np.pi * 14 * x) * np.exp(-x * 3)) * (1 + 0.6 * np.exp(-x * 8))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.25)
put(FX, boing(0.7, 300), hit_t + 0.06, -6, 0.4, "spring_boing_1")
put(FX, boing(0.6, 420), hit_t + 0.14, -8, 0.2, "spring_boing_2")
scrape = bp(rng.standard_normal(int(SR * 0.4)), 1800, 6000) * np.abs(np.sin(np.linspace(0, 30, int(SR * 0.4)))) * np.linspace(1, 0, int(SR * 0.4))
put(FX, scrape, hit_t + 0.03, -10, 0.4, "metal_scrape")
put(FX, lp(rng.standard_normal(int(SR * 0.8)), 600) * env(int(SR * 0.8), 0.05, 0.3) * 0.5, hit_t + 0.05, -10, 0.4, "smoke_puff")
put(FX, bell(3100, 0.6) * 0.5, fr(r0 + RB["hit"] + RB["gear"]), -6, 0.5, "gear_ding")
put(FX, bell(3300, 0.4) * 0.3, fr(r0 + RB["hit"] + RB["gear"] + 5), -12, 0.55, "gear_ding_bounce")
put(FX, whoosh(0.3, 800, 6000), fr(r0 + RB["lower"] - 2), -14, 0.6, "lower_third")
# 6. Финал
t0 = TI["start"]
put(FX, whoosh(0.45, 400, 8000), fr(t0 - 12), -4, 0, "flash_whoosh")
put(FX, kick(130, 45, 0.6) * 1.1, fr(t0 + TI["star"]), -1, 0, "star_hit")
for i, l in enumerate(TI["lines"]):
    put(FX, pop_snd(900 + i * 250, 300, 0.12), fr(t0 + l), -7, (i - 1) * 0.3, f"logo_line_{i}")
for i, l in enumerate(TI["portraits"]):
    put(FX, pop_snd(1300 + i * 150, 500, 0.08), fr(t0 + l), -12, -0.7 if i % 2 == 0 else 0.7)
wn = int(SR * 0.55); wx = ts(wn)
whistle = np.sin(2 * np.pi * np.cumsum(2900 + 180 * np.sin(2 * np.pi * 28 * wx) + 400 * np.minimum(1, wx / 0.05) - 300 * (wx > 0.35)) / SR)
whistle = (whistle + bp(rng.standard_normal(wn), 2500, 4000) * 0.15) * np.minimum(1, wx / 0.02) * np.minimum(1, (0.55 - wx) / 0.05)
put(FX, whistle, fr(t0 + TI["whistle"]), -9, 0.2, "whistle")
tv = fr(t0 + TI["tvoff"])
put(FX, mx(click(1.6, 0.08), kick(200, 60, 0.15) * 0.6), tv, -2, 0, "tv_off_click")
nd = int(SR * 0.4); dx = ts(nd)
put(FX, np.sin(2 * np.pi * np.cumsum(15000 * np.exp(-dx * 9) + 200) / SR) * env(nd, 0.001, 0.15) * 0.4, tv, -10, 0, "tv_whine")

# ================================================================ сведение
mus = MUS / (np.abs(MUS).max() + 1e-9) * 0.42
fx = FX / (np.abs(FX).max() + 1e-9) * 0.95
# ducking музыки под громкими эффектами
lvl = np.abs(fx).max(1); k = int(SR * 0.05)
lvl = np.convolve(lvl, np.ones(k) / k, mode="same")
duck = 1 - 0.45 * np.clip(lvl / 0.3, 0, 1)
out = mus * duck[:, None] + fx
out = np.tanh(out * 1.15) / np.tanh(1.15)
n_out = int(DUR * SR)
out = out[:n_out]
fade = int(SR * 0.08); out[-fade:] *= np.linspace(1, 0, fade)[:, None]
out = out / (np.abs(out).max() + 1e-9) * 0.93
with wave.open(os.path.join(ROOT, "public", "audio.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
os.makedirs(os.path.join(ROOT, "checks"), exist_ok=True)
with open(os.path.join(ROOT, "checks", "audio_events.csv"), "w", encoding="utf-8") as fh:
    fh.write("frame,sound,gain_db\n")
    for e in sorted(events): fh.write(",".join(map(str, e)) + "\n")
print(len(events), "named events,", round(n_out / SR, 2), "s")
