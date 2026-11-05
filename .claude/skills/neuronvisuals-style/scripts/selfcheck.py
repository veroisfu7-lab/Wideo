# Самопроверка готового ролика против STYLE_RULES (числа для 1080×1920 = ×1.5 от 720p). Читает видео потоково.
#   python -I selfcheck.py <ролик.mp4> [--timeline src/<имя>/timeline.json] [--hero-frame 30] [--hero-thresh 235]
# --timeline берёт line2Start и total; --hero-frame — кадр, где герой (белый) виден целиком на среднем плане;
# --hero-thresh — порог яркости героя (белый 235; для серого героя ≈150).
# Начало печати 2-й строки при движущейся камере определяется с точностью ±5 кадров (фон в полосе меняется).
import sys, os, json, argparse, subprocess
import cv2, numpy as np
import sys as _sys; _sys.stdout.reconfigure(encoding="utf-8", errors="replace")   # консоль Windows (cp1251)

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("--timeline"); ap.add_argument("--hero-frame", type=int, default=30); ap.add_argument("--hero-thresh", type=int, default=235)
a = ap.parse_args()
TL = json.load(open(a.timeline, encoding="utf-8")) if a.timeline else {}
line2 = TL.get("text", {}).get("line2Start")

cap = cv2.VideoCapture(a.video)
W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
S = W / 1080.0                                   # масштаб к 1080
keep = {a.hero_frame}
TEXT_F = (line2 + 45) if line2 is not None else None
res = {"size": [W, H]}
luma, hd, cam, band2 = [], [], [], {}
prev_small = prev_hist = None; kept = {}; n = 0
while True:
    ok, f = cap.read()
    if not ok: break
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
    luma.append(float(g.mean()))
    small = cv2.resize(g, (270, 480)).astype(np.float32)
    h = cv2.calcHist([cv2.resize(f, (180, 320))], [0, 1, 2], None, [8, 8, 8], [0, 256] * 3).flatten(); h /= h.sum() + 1e-9
    if prev_small is not None:
        hd.append(float(0.5 * np.abs(h - prev_hist).sum()))
        (dx, dy), resp = cv2.phaseCorrelate(prev_small, small)
        sh = float(np.hypot(dx, dy)) * (W / 270) / S          # глобальный сдвиг картинки, px/кадр при 1080
        cam.append(sh if resp > 0.15 and sh < 0.25 * 1080 else 0.0)   # ненадёжные корреляции отбрасываем
    else:
        hd.append(0.0); cam.append(0.0)
    if line2 is not None and line2 - 5 <= n <= line2 + 35:
        y0, y1 = int(362 / 1920 * H), int(395 / 1920 * H); band2[n] = int((g[y0:y1, :] > 120).sum())
    if n in keep: kept[n] = f.copy()
    if TEXT_F is not None and n == TEXT_F: kept["text"] = f.copy()
    prev_small, prev_hist = small, h; n += 1
mid = kept.get(a.hero_frame)
res["frames"] = n
res["cut_candidates"] = [i for i, v in enumerate(hd) if v > 0.25]
ref = float(np.median(luma[max(0, n - 40):max(1, n - 20)])); fade = [i for i in range(max(0, n - 40), n) if luma[i] < 0.95 * ref]
res["fade_frames"] = [fade[0], n - 1, len(fade)] if fade else None
res["last_frame_luma"] = round(luma[-1], 2)
res["dark_frames_outside_fade"] = [i for i, v in enumerate(luma) if v < 2.0 and (not fade or i < fade[0])][:20]
cs = np.array(cam); res["camera_px_per_frame"] = {"p95": round(float(np.percentile(cs, 95)), 1), "max": round(float(cs.max()), 1),
                                                   "max_frame": int(cs.argmax()), "norm": "≤ ~15 (пик серии)"}
if mid is not None:
    g = cv2.cvtColor(mid, cv2.COLOR_BGR2GRAY)
    px = mid.reshape(-1, 3).astype(int); dark = px[px.sum(1) <= np.percentile(px.sum(1), 2)]
    res["bg_darkest2pct_hex"] = "#%02X%02X%02X" % tuple(int(v) for v in dark.mean(0)[::-1])   # норма ≈ #010002
    _, bw = cv2.threshold(g, a.hero_thresh, 255, cv2.THRESH_BINARY)
    cnts, _ = cv2.findContours(bw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); best = None
    for c in cnts:
        (x, y), r = cv2.minEnclosingCircle(c)
        if r > 12 * S and cv2.contourArea(c) > 0.8 * np.pi * r * r and y < H * 0.75 and (best is None or r > best[2]): best = (x, y, r)   # самый крупный круг = голова героя
    if best:
        x, y, r = best; rad = []
        for k in range(24):
            ang = np.deg2rad(k * 15); d = 0.0
            while d < 3 * r:
                px, py = int(x + np.cos(ang) * d), int(y + np.sin(ang) * d)
                if not (0 <= px < W and 0 <= py < H) or bw[py, px] == 0: break
                d += 0.5
            rad.append(d)
        rad = np.array(rad); e = int(x + rad.mean() + 2)
        res["hero_head"] = {"center": [round(x), round(y)], "diam_px": round(2 * r, 1), "diam_pctW": round(200 * r / W, 2), "radius_std_pct": round(100 * rad.std() / rad.mean(), 1), "norm": "7–9.5 %W"}
        res["glow_from_edge_every4px"] = [int(g[int(y), min(W - 1, e + d)]) for d in range(0, 61, 4)]
        col = g[int(y + r):int(y + r + 40 * S), int(x)]; res["head_body_gap_px"] = int((col < 60).sum())
    tf = kept.get("text")
    g = cv2.cvtColor(tf, cv2.COLOR_BGR2GRAY) if tf is not None else g
    t = g[int(250 / 1920 * H):int(450 / 1920 * H), int(W * 0.15):int(W * 0.85)]; rows = np.where((t > 150).sum(1) > 3)[0] + int(250 / 1920 * H); grp = []
    for r_ in rows:
        if grp and r_ - grp[-1][-1] <= 2: grp[-1].append(r_)
        else: grp.append([r_])
    res["text_rows"] = [[int(q[0]), int(q[-1])] for q in grp if len(q) > 8]   # норма: две строки ≈24 px в полосе 330–400 (если склеилось в одну полосу — фон в полосе текста ярок, смотреть кроп)
if band2:
    base = min(band2[k] for k in sorted(band2)[:4]); band2 = {k: v - base for k, v in band2.items()}   # вычитаем то, что было в полосе до печати
    on = [k for k, v in sorted(band2.items()) if v > 20]
    res["line2_first_pixels_frame"] = on[0] if on else None
    full = max(band2.values()); done = [k for k, v in sorted(band2.items()) if v >= 0.98 * full]
    res["line2_typing_frames"] = [on[0], done[0]] if on and done else None
wm = []
cap = cv2.VideoCapture(a.video); cap.set(cv2.CAP_PROP_POS_FRAMES, min(100, n - 1)); ok, f = cap.read()
if ok: res["watermark_zone_max"] = int(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)[int(H * 0.82):int(H * 0.84), int(W * 0.38):int(W * 0.62)].max())   # >40 → посмотреть кроп: сцена или вотермарк
r = subprocess.run(["ffmpeg", "-hide_banner", "-i", a.video, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, errors="ignore")
res["loudness"] = [l.strip() for l in r.stderr.splitlines() if l.strip().startswith(("I:", "LRA:", "Peak:"))][-3:]
res["loudness_norm"] = "I −14 ±1 LUFS, Peak ≤ −1 dBFS"
print(json.dumps(res, ensure_ascii=False, indent=1))
