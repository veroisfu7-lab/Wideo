# Синтетическая подложка «Капсулы» (вместо трека из TikTok — в облаке нет браузера, чтобы достать звук):
# драма серии (STYLE_RULES §9): медленный минорный пэд Cm add9 без ударных + суб-бас, тихое интро, вход на кадре поворота,
# после поворота — тёмный аккорд Ab и суб с глайдом вниз. Музыка с кадра 0, без фейд-ина, без дакинга.
#   python -I tools/music_kapsula.py → public/music/kapsula_pad.wav (30 с, 48 кГц, стерео)
import json, os, wave
import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "src", "kapsula", "timeline.json"), encoding="utf-8"))
DUR = T["total"] / T["fps"]; TURN = T["turn"] / T["fps"]
n = int(SR * DUR); t = np.arange(n) / SR
rng = np.random.default_rng(3)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)

def voice(midi, amp, det=0.07, phase=0.0):
    out = np.zeros(n)
    for d in (-det, 0.0, det):   # три расстроенных пилы, смягчённых фильтром ниже
        f = hz(midi + d)
        out += np.sin(2 * np.pi * f * t + phase + rng.random() * 6) + 0.35 * np.sin(2 * np.pi * 2 * f * t + rng.random() * 6) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    return out * amp / 3

def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    from itertools import accumulate
    y = np.empty_like(x); s = 0.0
    b = 1 - a
    for i in range(len(x)): s = b * x[i] + a * s; y[i] = s
    return y

ramp = lambda a, b: np.clip((t - a) / max(b - a, 1e-6), 0, 1)
pre = 1 - ramp(TURN - 0.05, TURN + 0.6)          # до поворота
post = ramp(TURN - 0.05, TURN + 0.8)             # после поворота
grow = 0.55 + 0.45 * ramp(0.0, TURN)             # медленное нарастание дней

# пэд: Cm add9 (C3 Eb3 G3 D4) до поворота, Ab add9 (Ab2 C3 Eb3 Bb3) после
padA = sum(voice(m, a) for m, a in [(48, 0.5), (51, 0.42), (55, 0.4), (62, 0.22)])
padB = sum(voice(m, a) for m, a in [(44, 0.5), (48, 0.42), (51, 0.4), (58, 0.25)])
pad = padA * pre * grow + padB * post * 1.15
pad = lp(pad, 900) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * t))
# суб: C1 дрон, на повороте глайд 260 → 55 Гц и дальше Ab0 дрон
sub_f = np.where(t < TURN, hz(36), hz(32))
sub = np.sin(2 * np.pi * np.cumsum(sub_f) / SR) * (0.35 * pre * grow + 0.45 * post)
k = t >= TURN; tt = t[k] - TURN
glide = np.maximum(55, 260 * np.exp(-tt * 5.5))
hit = np.zeros(n); hit[k] = np.sin(2 * np.pi * np.cumsum(glide) / SR) * np.exp(-tt / 0.9) * 0.9
# воздух: тёмный шум, тихо
air = lp(rng.standard_normal(n), 500) * 0.25 * (0.6 + 0.4 * post)
mono = pad * 0.5 + sub + air   # удар поворота — только в SFX (бум), чтобы пик был ровно на кадре 700
# конец: гаснет вместе с картинкой (последние 0.5 с)
mono *= 1 - ramp(DUR - 0.5, DUR)
L = mono + 0.15 * lp(np.roll(pad, 480), 700); R = mono + 0.15 * lp(np.roll(pad, -480), 700)
out = np.stack([L, R], 1); out = out / np.abs(out).max() * 0.7
os.makedirs(os.path.join(ROOT, "public", "music"), exist_ok=True)
p = os.path.join(ROOT, "public", "music", "kapsula_pad.wav")
with wave.open(p, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print("saved", p, round(DUR, 2), "s")
