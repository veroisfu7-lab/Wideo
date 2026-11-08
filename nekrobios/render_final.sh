#!/bin/bash
# Финальный рендер кусками по 300 кадров в out/seq/ (JPEG q95), с пропуском готовых и повтором при сбое.
# Использование: ./render_final.sh [кадр_от] [кадр_до] [порядок кусков через пробел]
cd "$(dirname "$0")"
mkdir -p out/seq
FROM=${1:-0}; TO=${2:-5399}; STEP=300
for ((s=FROM; s<=TO; s+=STEP)); do
  e=$((s+STEP-1)); [ $e -gt $TO ] && e=$TO
  missing=0
  for ((f=s; f<=e; f++)); do [ -f "out/seq/element-$(printf %04d $f).jpeg" ] || { missing=1; break; }; done
  [ $missing = 0 ] && { echo "chunk $s-$e done"; continue; }
  for try in 1 2 3; do
    echo "$(date +%T) render $s-$e try $try"
    npx remotion render src/index.ts Nekrobios out/seq --sequence --image-format=jpeg --jpeg-quality=95 \
      --frames=$s-$e --concurrency=1 --timeout=900000 --log=error > out/chunk_$s.log 2>&1 && break
    tail -3 out/chunk_$s.log
  done
done
echo "ALL DONE $(date +%T)"
