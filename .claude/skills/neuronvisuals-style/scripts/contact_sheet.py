# Контакт-лист кадров с номерами — для разбора рефов и для проверки своего рендера.
#   python -I contact_sheet.py <видео> <out.jpg> [--start 0] [--end -1] [--step 6] [--cols 8] [--width 200]
# Для покадрового разбора: --step 1 --cols 6 по 30 кадров (одна секунда на лист).
import argparse, cv2, numpy as np
import sys as _sys; _sys.stdout.reconfigure(encoding="utf-8", errors="replace")   # консоль Windows (cp1251)

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("out")
ap.add_argument("--start", type=int, default=0); ap.add_argument("--end", type=int, default=-1)
ap.add_argument("--step", type=int, default=6); ap.add_argument("--cols", type=int, default=8); ap.add_argument("--width", type=int, default=200)
a = ap.parse_args()
cap = cv2.VideoCapture(a.video); n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); end = n - 1 if a.end < 0 else min(a.end, n - 1)
tiles = []
for i in range(a.start, end + 1, a.step):
    cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, f = cap.read()
    if not ok: break
    t = cv2.resize(f, (a.width, int(a.width * f.shape[0] / f.shape[1])))
    cv2.putText(t, str(i), (4, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 1); tiles.append(t)
while len(tiles) % a.cols: tiles.append(np.zeros_like(tiles[0]))
img = np.vstack([np.hstack(tiles[r * a.cols:(r + 1) * a.cols]) for r in range(len(tiles) // a.cols)])
cv2.imencode(".jpg", img)[1].tofile(a.out)   # cv2.imwrite не пишет в пути с кириллицей
print(a.out, len(tiles), "кадров")
