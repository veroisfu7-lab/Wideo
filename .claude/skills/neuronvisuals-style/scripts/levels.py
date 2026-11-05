# Уровень эффектов над музыкой в момент каждого события (макс. RMS 40 мс в окне события − RMS музыки ±0.5 с).
#   python -I levels.py <sfx_dB> <music_dB> <трек.mp3> <OFF_сек> <стем.wav> <events.csv> [длительность_сек=13]
# Норма: удары/касания +2…+9 дБ над музыкой, максимум +13; шорохи и тапы ≥ 0; эмбиент −6…−8.
import sys, wave, csv, subprocess, numpy as np
import sys as _sys; _sys.stdout.reconfigure(encoding="utf-8", errors="replace")   # консоль Windows (cp1251)
sg, mg = float(sys.argv[1]), float(sys.argv[2])
MUS, OFF, STEM, CSV = sys.argv[3:7]
DUR = sys.argv[7] if len(sys.argv) > 7 else "13"
def load(args):
    raw = subprocess.run(["ffmpeg", "-v", "error"] + args + ["-ac", "1", "-ar", "48000", "-f", "s16le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(float) / 32768
m = load(["-i", MUS, "-af", f"atrim=start={OFF}:duration={DUR},asetpts=PTS-STARTPTS,volume={mg}dB"])
s = load(["-i", STEM, "-af", f"volume={sg}dB"])
SR = 48000
db = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
def pk(i, dur):
    seg = s[i:i + int(dur * SR)]; w = int(0.04 * SR)
    return max(db(seg[j:j + w]) for j in range(0, max(1, len(seg) - w), w // 2))
groups = {}
for r in csv.DictReader(open(CSV, encoding="utf-8")):
    f = float(r["frame"]); i = int(f / 30 * SR)
    key = "".join(c for c in r["sound"] if not c.isdigit()).strip("_")
    groups.setdefault(key, []).append((f, round(pk(i, 0.15) - db(m[max(0, i - SR // 2):i + SR // 2]), 1)))
for k, v in groups.items(): print(f"{k:28s}", v[:16])
