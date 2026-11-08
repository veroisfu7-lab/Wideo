#!/bin/bash
# Сборка: кадры out/seq/element-N.jpeg (разная разрядность) → 4 цифры → H.264 60 fps + AAC → «Некробиос.mp4» в корне.
cd "$(dirname "$0")"
python3 - <<'PY'
import os, re
d = "out/seq"
for f in os.listdir(d):
    m = re.match(r"element-(\d+)\.jpeg$", f)
    if m and len(m.group(1)) != 4:
        os.rename(os.path.join(d, f), os.path.join(d, "element-%04d.jpeg" % int(m.group(1))))
n = len([f for f in os.listdir(d) if f.endswith(".jpeg")]); print("frames", n)
PY
ffmpeg -v error -y -framerate 60 -i out/seq/element-%04d.jpeg -i out/audio.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -c:a aac -b:a 192k -shortest "../Некробиос.mp4"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of compact "../Некробиос.mp4"
