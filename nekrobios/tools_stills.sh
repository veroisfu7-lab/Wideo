#!/bin/sh
# Листы кадров: tools_stills.sh "<кадры через запятую>" <выход.jpg> [scale]
LIST="$1"; OUT="$2"; SC="${3:-0.3}"
N=$(echo "$LIST" | tr ',' '\n' | wc -l)
rm -rf out/frames && mkdir -p out/frames
npx remotion render src/index.ts Nekrobios out/frames --sequence --image-format=jpeg --jpeg-quality=85 --scale=$SC --frames=0-$((N-1)) --props="{\"list\":[$LIST]}" --log=error --concurrency=1 --timeout=600000
python3 - "$OUT" <<'PY'
import sys, glob, cv2, numpy as np
fs = sorted(glob.glob("out/frames/*.jpeg"))
ims = [cv2.imread(f) for f in fs]
h, w = ims[0].shape[:2]
cols = min(6, len(ims)); rows = (len(ims) + cols - 1) // cols
sheet = np.zeros((rows * h, cols * w, 3), np.uint8)
for i, im in enumerate(ims):
    r, c = divmod(i, cols); sheet[r*h:(r+1)*h, c*w:(c+1)*w] = im
cv2.imwrite(sys.argv[1], sheet)
print("sheet", sheet.shape)
PY
