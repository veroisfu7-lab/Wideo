#!/bin/sh
# Сведение: картинка (out/video.mp4) + звук (out/mix.wav, нормализация −14 LUFS) → ../Цикада_3301.mp4
#   npx remotion render src/index.ts Cicada out/video.mp4 --concurrency=1 --gl=angle --crf=17 --muted --timeout=120000
#   python3 -I tools/sound.py && sh tools/mux.sh
set -e
cd "$(dirname "$0")/.."
ffmpeg -y -loglevel error -i out/video.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.0:LRA=11" -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart "../Цикада_3301.mp4"
ls -la "../Цикада_3301.mp4"
