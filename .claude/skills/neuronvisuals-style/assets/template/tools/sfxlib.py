# Библиотека синтеза SFX серии (audio.md §3.2): суб-«бум», свисты, щелчки, шаги, ткань, песок, стекло.
# Mixer собирает стерео-дорожку по кадрам, save() пишет WAV и CSV событий для проверки уровней.
import os, wave
import numpy as np
import sys as _sys; _sys.stdout.reconfigure(encoding="utf-8", errors="replace")   # консоль Windows (cp1251)

SR = 48000

class Mixer:
    def __init__(self, total_frames, fps=30, seed=7):
        self.fps = fps; self.n = int(total_frames / fps * SR)
        self.L = np.zeros(self.n + SR); self.R = np.zeros(self.n + SR)
        self.rng = np.random.default_rng(seed); self.events = []

    # ------------------------------------------------------------ утилиты
    def t(self, n): return np.arange(int(n)) / SR
    def env(self, n, a=0.002, d=0.2):
        x = self.t(n); return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
    def lp(self, x, fc):
        a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
        for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
        return y
    def bp(self, x, lo, hi): return self.lp(x, hi) - self.lp(x, lo)
    def noise(self, n): return self.rng.standard_normal(int(n))

    def put(self, sig, frame, gain_db=0.0, pan=0.0, name=""):
        i = int(round(frame / self.fps * SR)); g = 10 ** (gain_db / 20)
        pl, pr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        n = min(len(sig), len(self.L) - i)
        if n <= 0: return
        self.L[i:i + n] += sig[:n] * g * pl * 1.414; self.R[i:i + n] += sig[:n] * g * pr * 1.414
        self.events.append((round(frame, 1), name, round(gain_db, 1), round(pan, 2)))

    # ------------------------------------------------------------ генераторы
    def boom(self, f0=240, f1=62, frames=9, tail=0.33):   # фирменный суб-удар с падением тона
        n = int(SR * (tail + 0.1)); x = self.t(n)
        k = np.log(f1 / f0) / (frames / self.fps)
        ph = 2 * np.pi * np.cumsum(np.maximum(f1, f0 * np.exp(k * x))) / SR
        s = np.sin(ph) * self.env(n, 0.001, tail) + 0.25 * np.sin(2 * ph) * self.env(n, 0.001, tail * 0.4)
        click = self.bp(self.noise(n), 800, 4000) * self.env(n, 0.0005, 0.006) * 0.6
        return np.tanh(1.4 * (s + click)) * 0.8
    def whoosh(self, frames, lo=500, hi=6000):
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n); nz = self.noise(n)
        return np.where(x < 0.5, self.bp(nz, lo, hi), self.bp(nz, lo * 2, hi * 1.5)) * np.sin(np.pi * x) ** 1.5 * 0.9
    def cloth(self, frames=8):
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n)
        return self.bp(self.noise(n), 900, 6000) * np.sin(np.pi * x) ** 2 * 0.7
    def click(self, bright=1.0):
        n = int(SR * 0.08)
        a = self.bp(self.noise(n), 1500, 9000) * self.env(n, 0.0002, 0.012)
        b = np.sin(2 * np.pi * 2200 * self.t(n)) * self.env(n, 0.0002, 0.02) * 0.5
        c = np.sin(2 * np.pi * 180 * self.t(n)) * self.env(n, 0.001, 0.025) * 0.6
        return (a + b + c) * bright
    def tap(self):   # тап по экрану: короткий сухой щелчок
        n = int(SR * 0.03)
        return (self.bp(self.noise(n), 2500, 8000) * self.env(n, 0.0002, 0.004) + np.sin(2 * np.pi * 1400 * self.t(n)) * self.env(n, 0.0002, 0.006) * 0.4) * 0.8
    def sand_step(self, hard=1.0):   # шаг по песку: хруст из мелких зёрен + глухой низ
        n = int(SR * 0.2); x = self.t(n)
        grains = self.bp(self.noise(n), 1200, 7000) * (self.rng.random(n) < 0.06) * 3.0
        crunch = self.bp(self.noise(n), 400, 3000) * self.env(n, 0.002, 0.05)
        body = np.sin(2 * np.pi * 95 * x) * self.env(n, 0.001, 0.04) * 0.7
        return (self.lp(grains, 6000) * self.env(n, 0.003, 0.08) + crunch * 0.8 * hard + body) * 0.8
    def sand_slide(self, frames=14):   # осыпь: шорох с понижением полосы + россыпь зёрен
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n); nz = self.noise(n)
        hi = self.bp(nz, 1500, 7000) * (1 - x) + self.bp(nz, 500, 2500) * x
        grains = self.bp(self.noise(n), 2000, 8000) * (self.rng.random(n) < 0.03) * 2.5
        return (hi * np.sin(np.pi * np.minimum(1, x * 1.6)) ** 0.8 + grains * (1 - x)) * 0.9
    def sand_spray(self, frames=20):   # песок сыплется на тело: плотный зернистый шум
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n)
        g = self.bp(self.noise(n), 1500, 9000) * (self.rng.random(n) < 0.12) * 2.2 + self.bp(self.noise(n), 600, 3000) * 0.35
        return g * np.sin(np.pi * x) ** 0.6 * 0.9
    def glass_grab(self):   # ладони бьют по краю стеклянного горлышка: звон + шлепок
        n = int(SR * 0.6); x = self.t(n)
        ring = sum(a * np.sin(2 * np.pi * f * x) * np.exp(-x / d) for f, a, d in [(1180, 0.5, 0.25), (2390, 0.3, 0.16), (3720, 0.18, 0.1), (5210, 0.1, 0.06)])
        slap = self.bp(self.noise(n), 300, 4000) * self.env(n, 0.0005, 0.015) * 1.2
        return np.tanh(ring * 0.9 + slap) * 0.85
    def hiss(self, frames, lo=1800, hi=8000):   # шипение струи (непрерывное), с лёгким «дыханием»
        n = int(SR * frames / self.fps); x = self.t(n)
        s = self.bp(self.noise(n), lo, hi) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.7 * x)) + self.bp(self.noise(n), 200, 900) * 0.25
        return s * 0.6
    def swell(self, frames):
        n = int(SR * frames / self.fps); x = np.linspace(0, 1, n)
        return self.bp(self.noise(n), 200, 2500) * (np.sin(np.pi * x) ** 1.2) * 0.8

    # ------------------------------------------------------------ сохранение
    def save(self, wav_path, csv_path):
        os.makedirs(os.path.dirname(wav_path), exist_ok=True)
        out = np.stack([self.L, self.R], 1)[: self.n]
        out = out / max(np.abs(out).max(), 1e-9) * 0.89
        with wave.open(wav_path, "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
        os.makedirs(os.path.dirname(csv_path), exist_ok=True)
        with open(csv_path, "w", encoding="utf-8") as fh:
            fh.write("frame,sound,gain_db,pan\n")
            for e in sorted(self.events): fh.write(",".join(map(str, e)) + "\n")
        return len(self.events), round(len(out) / SR, 2)
