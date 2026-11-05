# Звуки «Ведро и труба»: звук на каждое движение. События берутся из src/well/plan.ts (checks/well/events.json,
# собирается: npx esbuild src/well/plan.ts --bundle --platform=node --format=cjs --outfile=checks/well/plan.cjs).
#   python -I tools/sfx_well.py → public/sfx_well.wav + checks/sfx_well_events.csv
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sfxlib import Mixer, SR

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "src", "well", "timeline.json"), encoding="utf-8"))
EV = json.load(open(os.path.join(ROOT, "checks", "well", "events.json"), encoding="utf-8"))
K = T["total"] / 420                      # растяжка раскадровки до длины ролика
TURN = round(T["turn"] * K)
D = lambda n: int(round(n * K))           # длительность действия в кадрах ролика

class WM(Mixer):
    def soil_step(self, hard=1.0):   # шаг по утоптанной земле: глухой низ + короткий хруст
        n = int(SR * 0.16); x = self.t(n)
        body = np.sin(2 * np.pi * 85 * x) * self.env(n, 0.001, 0.035)
        crunch = self.bp(self.noise(n), 500, 3500) * self.env(n, 0.001, 0.03) * 0.7 * hard
        grit = self.bp(self.noise(n), 2500, 8000) * (self.rng.random(n) < 0.04) * 1.5 * self.env(n, 0.002, 0.05)
        return (body + crunch + grit) * 0.85
    def ring(self, parts, dur=0.6):
        n = int(SR * dur); x = self.t(n)
        return sum(a * np.sin(2 * np.pi * f * x + self.rng.random() * 6) * np.exp(-x / d) for f, a, d in parts)
    def clank(self, k=1.0):          # ведро о землю / о край
        n = int(SR * 0.6)
        thud = np.sin(2 * np.pi * 110 * self.t(n)) * self.env(n, 0.001, 0.04)
        hit = self.bp(self.noise(n), 800, 6000) * self.env(n, 0.0003, 0.008)
        r = self.ring([(540, 0.45, 0.22), (1310, 0.3, 0.14), (2470, 0.18, 0.08), (3900, 0.08, 0.05)], 0.6)
        return np.tanh((thud * 0.8 + hit + r) * 1.1 * k) * 0.8
    def bucket_drop(self):           # упало, подпрыгнуло, перекатилось
        out = np.zeros(int(SR * 0.9))
        for dt, k in [(0.0, 1.2), (0.13, 0.55), (0.22, 0.3)]:
            s = self.clank(k); i = int(dt * SR); m = min(len(s), len(out) - i); out[i:i + m] += s[:m] * k
        return out * 0.75
    def handle_squeak(self):         # дужка ведра качнулась
        n = int(SR * 0.12); x = self.t(n)
        return np.sin(2 * np.pi * (1900 + 300 * np.sin(2 * np.pi * 18 * x)) * x) * np.sin(np.pi * x / x[-1]) * 0.18
    def pour(self, frames):          # вода льётся из ведра: шум + бульки
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n)
        s = self.bp(self.noise(n), 400, 4000) * 0.6
        for _ in range(int(frames * 1.2)):
            i = int(self.rng.random() * (n - 3000)); m = 2400; tt = self.t(m)
            f = 350 + 600 * self.rng.random()
            s[i:i + m] += np.sin(2 * np.pi * f * (1 + 1.5 * tt) * tt) * np.exp(-tt / 0.02) * 0.5
        return s * np.sin(np.pi * np.minimum(1, x * 1.3)) ** 0.6 * 0.8
    def splash(self, k=1.0):
        n = int(SR * 0.45); x = self.t(n)
        s = self.bp(self.noise(n), 600, 7000) * self.env(n, 0.002, 0.09)
        for _ in range(12):
            i = int(self.rng.random() * n * 0.6); m = 1800; tt = self.t(m)
            s[i:i + m] += np.sin(2 * np.pi * (700 + 900 * self.rng.random()) * (1 + 2 * tt) * tt) * np.exp(-tt / 0.012) * 0.4
        return s * k
    def dig(self):                   # лопата входит в землю: удар + скрежет
        n = int(SR * 0.25); x = self.t(n)
        thunk = np.sin(2 * np.pi * 120 * x) * self.env(n, 0.001, 0.05)
        scrape = self.bp(self.noise(n), 700, 3000) * self.env(n, 0.002, 0.07) * 0.9
        metal = self.ring([(1650, 0.12, 0.05), (2950, 0.06, 0.03)], 0.25)
        return np.tanh(thunk + scrape + metal) * 0.85
    def toss(self):                  # бросок земли: взмах + россыпь комьев
        n = int(SR * 0.6); x = self.t(n)
        sw = np.zeros(n); w = self.whoosh(6, 400, 3000); sw[:len(w)] += w * 0.6
        patter = self.bp(self.noise(n), 400, 2500) * (self.rng.random(n) < 0.015) * 3.0 * np.exp(-np.maximum(0, x - 0.22) / 0.12) * (x > 0.2)
        return sw + self.lp(patter, 3000) * 0.8
    def wood_clatter(self):          # лопата упала
        out = np.zeros(int(SR * 0.6))
        for dt, k in [(0.0, 1.0), (0.09, 0.6), (0.16, 0.35)]:
            n = int(SR * 0.2); s = np.sin(2 * np.pi * (230 + 60 * k) * self.t(n)) * self.env(n, 0.0005, 0.03) + self.bp(self.noise(n), 900, 5000) * self.env(n, 0.0003, 0.01)
            i = int(dt * SR); out[i:i + n] += s * k
        return out * 0.8
    def pipe_thud(self):             # тяжёлая труба падает в траншею
        b = self.boom(150, 48, 9, 0.35)
        r = self.ring([(185, 0.35, 0.3), (470, 0.25, 0.2), (880, 0.12, 0.12)], len(b) / SR)
        return np.tanh(b + r[:len(b)] * 0.8) * 0.85
    def creak(self, frames):         # рычаг крана: скрип
        n = int(SR * frames / self.fps); x = self.t(n)
        f = 520 + 140 * np.sin(2 * np.pi * 3 * x) + 40 * self.rng.standard_normal(n).cumsum() / np.sqrt(n)
        saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
        return self.bp(saw, 400, 3000) * np.sin(np.pi * x / x[-1]) ** 0.7 * 0.5
    def rush(self, frames):          # вода рванула по трубе: нарастающий шум потока
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n)
        s = self.bp(self.noise(n), 250, 2500) * (0.3 + 0.7 * x) + self.bp(self.noise(n), 2000, 7000) * 0.3 * x
        return s * np.minimum(1, x * 6) * 0.9
    def flow(self, frames):          # ровный поток воды (подложка)
        n = int(SR * frames / self.fps); x = self.t(n)
        s = self.bp(self.noise(n), 300, 2200) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.9 * x)) + self.bp(self.noise(n), 2500, 7000) * 0.25
        for _ in range(int(frames / 3)):
            i = int(self.rng.random() * (n - 2400)); m = 2400; tt = self.t(m)
            s[i:i + m] += np.sin(2 * np.pi * (250 + 350 * self.rng.random()) * (1 + 1.2 * tt) * tt) * np.exp(-tt / 0.025) * 0.35
        return s * 0.55
    def ha(self, f0=210):            # «ха»: придыхание + гласная «а» на импульсах голосовой щели
        n = int(SR * 0.17); x = self.t(n)
        f = f0 * (1 - 0.18 * x / x[-1]); ph = np.cumsum(f) / SR
        pulses = (np.sin(2 * np.pi * ph) > 0.92).astype(float) * 1.0 + 0.0
        src = pulses + self.noise(n) * 0.08
        vowel = self.bp(src, 600, 900) * 1.0 + self.bp(src, 1050, 1350) * 0.6 + self.bp(src, 2400, 2800) * 0.25
        h = self.bp(self.noise(n), 900, 4000) * np.exp(-x / 0.03) * 0.35
        e = np.minimum(1, x / 0.02) * np.exp(-np.maximum(0, x - 0.06) / 0.05)
        return np.tanh((vowel * 3.0 + h) * e) * 0.8

mx = WM(T["total"], T["fps"])
pan = lambda x: float(np.clip(x / 2.6, -0.8, 0.8))

for e in EV:
    f, k = e["f"], e["kind"]
    if k == "step":
        hard = 0.8 if e["who"] == "A" else 1.0
        if any(abs(o["f"] - f) <= 2 and o["kind"] == "step" and o is not e and o["who"] != e["who"] for o in EV) and e["who"] == "A":
            continue   # два шага в один кадр не складываем (иначе +6 dB): у первого пропускаем
        mx.put(mx.soil_step(hard), f, 2 if e["who"] == "B" else 1, pan(e["x"]), f"step_{e['who']}_{f}")
    elif k == "pour":
        mx.put(mx.handle_squeak(), f - 5, 6, pan(e.get("x", 0.5)), f"pour_squeak_{f}")
        mx.put(mx.pour(D(13)), f + 2, 6, pan(e.get("x", 0.5)), f"pour_{e['who']}_{f}")
    elif k == "dip":
        mx.put(mx.splash(0.9), f, 5, pan(-1.6), f"dip_splash_{f}")
        mx.put(mx.pour(D(8)), f + 4, -3, pan(-1.6), f"dip_fill_{f}")
    elif k == "laugh":
        mx.put(mx.ha(220 + (f % 3) * 12), f, 7, pan(-1.0), f"ha_{f}")
    elif k == "bucketDown":
        mx.put(mx.clank(0.8), f, 5, pan(e.get("x", 2.0)), "bucket_tossed_land")
    elif k == "toss_bucket":
        mx.put(mx.whoosh(6, 500, 4000), f, 3, pan(1.2), "bucket_toss_whoosh")
        mx.put(mx.handle_squeak(), f - 2, 0, pan(1.1), "bucket_toss_squeak")
    elif k == "pick":
        mx.put(mx.cloth(10), f - 4, 3, pan(-0.9), "pick_effort")
        mx.put(mx.ring([(185, 0.3, 0.2), (470, 0.2, 0.12)], 0.3), f, 2, pan(-0.9), "pick_pipes_clink")
    elif k == "notice":
        mx.put(mx.cloth(8), f, 2, pan(-0.45), "notice_cloth")
    elif k == "grab":
        mx.put(mx.wood_clatter()[: int(SR * 0.08)], f, 2, pan(1.3), "shovel_grab")
        mx.put(mx.cloth(8), f - 3, 2, pan(1.2), "shovel_grab_cloth")
    elif k == "dig":
        mx.put(mx.dig(), f, 6, pan(e.get("x", 0.0)), f"dig_{f}")
    elif k == "toss":
        mx.put(mx.toss(), f, 2, 0.0, f"toss_{f}")
    elif k == "shovelDrop":
        mx.put(mx.wood_clatter(), f, 6, pan(-0.4), "shovel_drop")
    elif k == "pipeThud":
        mx.put(mx.pipe_thud(), f, 4, pan(e.get("x", 0.0)), f"pipe_thud_{f}")
        mx.put(mx.cloth(8), f - 6, 2, pan(e.get("x", 0.0)), f"pipe_place_cloth_{f}")
    elif k == "click":
        mx.put(mx.click(1.2), f, 4, pan(-1.5), f"pipe_click_{f}")
    elif k == "valve":
        mx.put(mx.creak(D(8)), f, 8, pan(1.3), "valve_creak")
    elif k == "flow":
        mx.put(mx.boom(230, 58, 10, 0.5), f, 1, 0.0, "turn_boom")
        mx.put(mx.splash(0.7), f, 0, pan(-1.3), "tank_outlet_burst")
        mx.put(mx.rush(D(14)), f, 3, 0.0, "flow_rush")
        mx.put(mx.flow(T["total"] - f - D(12)), f + D(12), -15, pan(0.6), "flow_bed")
    elif k == "gush":
        mx.put(mx.splash(1.3), f, 4, pan(1.6), "barrel_gush")
        mx.put(mx.boom(170, 50, 10, 0.4), f, 0, pan(1.6), "barrel_gush_low")
        mx.put(mx.swell(D(50)), f - 6, -6, 0.0, "gush_swell")
    elif k == "sit":
        mx.put(mx.soil_step(1.2), f, 4, pan(1.05), "sit_down")
        mx.put(mx.cloth(10), f - 8, 2, pan(1.05), "sit_cloth")
    elif k == "bucketDrop":
        mx.put(mx.bucket_drop(), f, 5, pan(-0.4), "bucket_drop")
        mx.put(mx.splash(1.4), f + 1, -1, pan(-0.4), "bucket_spill")
# повороты корпуса и взмахи — ткань
for e in EV:
    if e["kind"] == "turn": mx.put(mx.cloth(10), e["f"], -1, pan(e.get("x", 0.0)), f"turn_cloth_{e['f']}")
# смех: ещё и ткань от покачиваний
HA0 = min(e["f"] for e in EV if e["kind"] == "laugh")
mx.put(mx.cloth(24), HA0 - 4, -2, pan(-0.9), "laugh_cloth")
# перелив через край бочки: редкие капли
DR0 = next(e["f"] for e in EV if e["kind"] == "dripsStart")
for i, f in enumerate(range(DR0, T["total"] - 15, 14)):
    mx.put(mx.splash(0.25)[: int(SR * 0.15)], f, -6, pan(1.7), f"drip_{f}")
# финал: низкий удар на падении ведра уже есть; на наезде — воздух
mx.put(mx.swell(D(60)), next(e["f"] for e in EV if e["kind"] == "finalSwell"), -11, 0.0, "final_swell")

n, dur = mx.save(os.path.join(ROOT, "public", "sfx_well.wav"), os.path.join(ROOT, "checks", "sfx_well_events.csv"))
print(n, "событий,", dur, "с")
