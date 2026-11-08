# Бумажная фактура (слоновая кость, волокна, пятна) для наложения multiply → public/paper.png
import os, zlib, struct
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1920, 1080
rng = np.random.default_rng(3)
def blur(a, k):
    for ax in (0, 1):
        a = sum(np.roll(a, s, axis=ax) for s in range(-k, k + 1)) / (2 * k + 1)
    return a
fine = rng.standard_normal((H, W)) * 0.035
blot = blur(rng.standard_normal((H // 8, W // 8)), 3)
blot = np.kron(blot, np.ones((8, 8)))[:H, :W]
blot = blur(blot, 4) * 0.25
fib = blur(rng.standard_normal((H, W)), 1) * 0.03
v = 1.0 - np.abs(fine) * 0.6 - np.clip(blot, 0, None) * 0.35 - np.abs(fib) * 0.5
yy, xx = np.mgrid[0:H, 0:W]
vig = 1 - 0.22 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) ** 1.3
v = np.clip(v * vig, 0, 1)
tint = np.array([1.0, 0.975, 0.92])  # тёплая слоновая кость
img = (np.clip(v[..., None] * tint, 0, 1) * 255).astype(np.uint8)
raw = b"".join(b"\x00" + img[y].tobytes() for y in range(H))
def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
open(os.path.join(ROOT, "public", "paper.png"), "wb").write(png)
print("paper.png", len(png))
