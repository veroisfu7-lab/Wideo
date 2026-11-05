# Звуки «Капсулы»: звук на каждое движение. События — из src/kapsula/plan.ts (checks/kapsula/events.json,
# собирается: sh tools/kapsula_events.sh).   python -I tools/sfx_kapsula.py → public/sfx_kapsula.wav + checks/sfx_kapsula_events.csv
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sfxlib import Mixer, SR

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "src", "kapsula", "timeline.json"), encoding="utf-8"))
EV = json.load(open(os.path.join(ROOT, "checks", "kapsula", "events.json"), encoding="utf-8"))
TURN = T["turn"]

class KM(Mixer):
    def ring(self, parts, dur=0.6):
        n = int(SR * dur); x = self.t(n)
        return sum(a * np.sin(2 * np.pi * f * x + self.rng.random() * 6) * np.exp(-x / d) for f, a, d in parts)
    def step(self):                  # босой шаг по гладкому пластику: мягкий глухой удар + лёгкий шлепок
        n = int(SR * 0.14); x = self.t(n)
        body = np.sin(2 * np.pi * 95 * x) * self.env(n, 0.001, 0.03)
        slap = self.bp(self.noise(n), 700, 4000) * self.env(n, 0.0008, 0.012) * 0.5
        return (body + slap) * 0.8
    def creak(self, frames, f0=380):  # скрип лежака
        n = int(SR * frames / self.fps); x = self.t(n)
        f = f0 + 90 * np.sin(2 * np.pi * 2.3 * x) + 30 * self.rng.standard_normal(n).cumsum() / np.sqrt(n)
        saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
        return self.bp(saw, 300, 2400) * np.sin(np.pi * x / x[-1]) ** 0.8 * 0.35
    def knock(self):                 # стук костяшками по металлической двери
        n = int(SR * 0.4); x = self.t(n)
        hit = self.bp(self.noise(n), 300, 3000) * self.env(n, 0.0005, 0.01) * 1.2
        thud = np.sin(2 * np.pi * 140 * x) * self.env(n, 0.0005, 0.05)
        r = self.ring([(310, 0.25, 0.12), (720, 0.15, 0.08), (1380, 0.06, 0.05)], 0.4)
        return np.tanh(hit + thud + r) * 0.85
    def palm(self):                  # ладонь легла на стену
        n = int(SR * 0.1)
        return self.bp(self.noise(n), 400, 3500) * self.env(n, 0.001, 0.02) * 0.8
    def slide(self, frames):         # ладонь скользит по гладкому пластику
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n)
        return self.bp(self.noise(n), 1500, 6000) * np.sin(np.pi * x) * 0.35
    def pneu(self, frames, rise=True):  # пневматика шлюза: шипение со спадом
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n)
        s = self.bp(self.noise(n), 2500, 9000) * (np.exp(-x * 3.5) if rise else np.sin(np.pi * x) ** 0.5 * (1 - x * 0.6))
        return s * np.minimum(1, x * 40) * 0.9
    def latch(self, k=1.0):          # щелчок/удар створки
        n = int(SR * 0.3); x = self.t(n)
        c = self.bp(self.noise(n), 1200, 8000) * self.env(n, 0.0002, 0.006) * 1.2
        th = np.sin(2 * np.pi * 120 * x) * self.env(n, 0.0005, 0.04)
        r = self.ring([(880, 0.2, 0.06), (2100, 0.12, 0.04)], 0.3)
        return np.tanh((c + th + r) * k) * 0.8
    def scrape(self, frames, lo=600, hi=3500):   # металл по полу / пластику
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n)
        s = self.bp(self.noise(n), lo, hi) * (0.7 + 0.3 * np.sin(2 * np.pi * 37 * x))
        return s * np.sin(np.pi * x) ** 0.6 * 0.55
    def bowl_clink(self, k=1.0):     # металлическая миска о пол
        n = int(SR * 0.6); x = self.t(n)
        hit = self.bp(self.noise(n), 900, 7000) * self.env(n, 0.0003, 0.006)
        r = self.ring([(1240, 0.4, 0.25), (2930, 0.25, 0.16), (4700, 0.12, 0.08)], 0.6)
        return np.tanh((hit + r) * k) * 0.7
    def eat(self):                   # глоток/жевание: мягкий влажный щелчок
        n = int(SR * 0.12); x = self.t(n)
        s = self.bp(self.noise(n), 300, 1800) * self.env(n, 0.003, 0.03) + np.sin(2 * np.pi * (180 + 300 * x) * x) * self.env(n, 0.002, 0.03) * 0.5
        return s * 0.7
    def scratch(self, frames):       # ноготь по пластику: сухое скрежетание штрихами
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n)
        g = self.bp(self.noise(n), 2500, 9000) * (0.6 + 0.4 * (np.sin(2 * np.pi * 26 * x * frames / 30) > 0))
        return g * np.sin(np.pi * x) ** 0.4 * 0.5
    def servo(self, frames, f0=520, f1=760):   # сервопривод: тонкий вой с зубчатым треском
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n)
        f = f0 + (f1 - f0) * np.sin(np.pi * x)
        ph = np.cumsum(f) / SR
        tone = np.sin(2 * np.pi * ph) * 0.5 + np.sin(2 * np.pi * 2 * ph) * 0.25 + np.sign(np.sin(2 * np.pi * 3 * ph)) * 0.08
        gear = self.bp(self.noise(n), 2000, 7000) * (np.sin(2 * np.pi * ph * 0.11) > 0.6) * 0.35
        return (tone + gear) * np.minimum(1, np.minimum(x, 1 - x) * 12) * 0.5
    def relay(self):                 # реле: двойной сухой щелчок
        out = np.zeros(int(SR * 0.2))
        for dt, k in [(0.0, 1.0), (0.035, 0.6)]:
            c = self.click(1.3) * k; i = int(dt * SR); m = min(len(c), len(out) - i); out[i:i + m] += c[:m]
        return out
    def grind(self, frames):         # заклинивший привод: рычащий скрежет с биением
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n); tt = self.t(n)
        f = 95 + 25 * np.sin(2 * np.pi * 5.5 * tt)
        saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
        g = self.bp(saw, 80, 1800) * 0.6 + self.bp(self.noise(n), 600, 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * tt)) * 0.4
        return g * np.minimum(1, x * 20) * (1 - 0.4 * x) * 0.75
    def beep(self, frames, period=6, f=2900):   # тревога лампы: бипы в такт миганию (3 вкл / 3 выкл)
        n = int(SR * frames / self.fps); tt = self.t(n)
        on = ((np.floor(tt * self.fps / (period / 2)) % 2) == 0).astype(float)
        on = self.lp(on, 300)
        return np.sin(2 * np.pi * f * tt) * on * 0.2
    def power_down(self, frames):    # привод сдох: тон вниз и тишина
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n)
        f = 160 * np.exp(-x * 2.2) + 30
        ph = np.cumsum(f) / SR
        return (np.sin(2 * np.pi * ph) * 0.6 + self.bp(self.noise(n), 200, 1200) * 0.2) * (1 - x) ** 1.5 * 0.7
    def hum(self, frames):           # вентиляция: ровный низкий гул (подложка весь ролик)
        n = int(SR * frames / self.fps); tt = self.t(n)
        s = np.sin(2 * np.pi * 50 * tt) * 0.4 + np.sin(2 * np.pi * 100 * tt) * 0.15 + self.lp(self.noise(n), 400) * 0.6
        return s * (0.9 + 0.1 * np.sin(2 * np.pi * 0.13 * tt)) * 0.5

mx = KM(T["total"], T["fps"])
pan = lambda x: float(np.clip((x if x is not None else 0.0) / 2.0, -0.8, 0.8))
F = lambda n: n   # кадры

# вентиляция под всем роликом (эмбиент, тихо)
mx.put(mx.hum(T["total"]), 0, -16, 0.0, "vent_hum")
for e in EV:
    f, k, x = e["f"], e["kind"], e.get("x")
    p = pan(x)
    if k == "step": mx.put(mx.step(), f, 2, p, f"step_{f}")
    elif k == "cotCreak": mx.put(mx.creak(14), f, 10, p, f"cot_creak_{f}")
    elif k == "cloth": mx.put(mx.cloth(9), f, 0, p, f"cloth_{f}")
    elif k == "palm": mx.put(mx.palm(), f, 11, p, "palm_wall")
    elif k == "slide": mx.put(mx.slide(14), f, 13, p, "palm_slide")
    elif k == "knock": mx.put(mx.knock(), f, 3, p, f"knock_{f}")
    elif k == "lampOn": mx.put(mx.click(0.6), f, 8, p, f"lamp_on_{f}")
    elif k == "hiss": mx.put(mx.pneu(14), f, 3, p, f"hiss_{f}")
    elif k == "flapUp": mx.put(mx.latch(0.8), f, 2, p, f"flap_up_{f}")
    elif k == "flapDown": mx.put(mx.latch(1.0), f, 3, p, f"flap_down_{f}")
    elif k == "bowlSlide": mx.put(mx.scrape(12, 500, 3000), f, 0, p, f"bowl_slide_{f}")
    elif k == "bowlSwap":
        mx.put(mx.scrape(8, 500, 3000), f - 4, -2, p, f"bowl_swap_out_{f}")
        mx.put(mx.bowl_clink(0.6), f + 2, 0, p, f"bowl_swap_in_{f}")
    elif k == "kneel": mx.put(mx.step()[: int(SR * 0.1)] * 1.2, f, 2, p, f"kneel_{f}")
    elif k == "bowlGrab": mx.put(mx.bowl_clink(0.5), f, 7 + (9 if f > TURN else 0), p, f"bowl_grab_{f}")
    elif k == "bowlPut": mx.put(mx.bowl_clink(0.9), f, 9, p, f"bowl_put_{f}")
    elif k == "eat": mx.put(mx.eat(), f, 10, p, f"eat_{f}")
    elif k == "scratch": mx.put(mx.scratch(12), f, 13, p, f"scratch_{f}")
    elif k == "scratchShort": mx.put(mx.scratch(6), f, 9, p, f"scratch_{f}")
    elif k == "pushup": mx.put(mx.cloth(6), f - 2, 3, p, f"pushup_{f}"); mx.put(mx.step()[: int(SR * 0.08)], f, -4, p, f"pushup_hands_{f}")
    elif k == "timeWhoosh": mx.put(mx.whoosh(10, 300, 2500), f - 3, -6, 0.0, f"time_{f}")
    elif k == "servo": mx.put(mx.servo(16) if f < TURN else mx.servo(12), f, 7 if f < TURN else 8, p, f"servo_{f}")
    elif k == "servoShort": mx.put(mx.servo(8, 640, 900), f + 4, -6, p, f"servo_look_{f}")
    elif k == "relay": mx.put(mx.relay(), f, 6, p, "relay_click")
    elif k == "boom":
        mx.put(mx.boom(110, 48, 3, 0.55), f, 6, 0.0, "turn_boom")
        mx.put(mx.boom(240, 70, 4, 0.2), f, 3, 0.0, "turn_thud")
    elif k == "bowlSlot": mx.put(mx.bowl_clink(0.8), f, 7, p, "bowl_in_slot")
    elif k == "hissClose": mx.put(mx.pneu(18, rise=False), f, 14, p, "hiss_close")
    elif k == "jamClank":
        mx.put(mx.latch(1.6), f, 6, p, "jam_clank")
        mx.put(mx.bowl_clink(1.3), f, 3, p, "jam_bowl_ring")
        mx.put(mx.boom(180, 50, 8, 0.35), f, -2, p, "jam_low")
    elif k == "grind": mx.put(mx.grind(48), f, 3, p, "grind")
    elif k == "alarm": mx.put(mx.beep(48), f, -4, pan(1.34), "alarm_beeps")
    elif k == "jamClank2": mx.put(mx.latch(1.2), f, 7, p, "jam_shove"); mx.put(mx.bowl_clink(0.9), f, 0, p, "jam_shove_ring")
    elif k == "powerDown": mx.put(mx.power_down(18), f, 10, p, "power_down")

n, dur = mx.save(os.path.join(ROOT, "public", "sfx_kapsula.wav"), os.path.join(ROOT, "checks", "sfx_kapsula_events.csv"))
print(n, "событий,", dur, "с")
