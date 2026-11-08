#!/bin/sh
# Контрольные кадры: sh tools/stills.sh 20 70 110 ... → checks/sheet.png (сетка 3 в ряд)
set -e
cd "$(dirname "$0")/.."
npx remotion bundle src/index.ts --out-dir=checks/bundle --log=error >/dev/null
rm -f checks/f_*.png
for fr in "$@"; do npx remotion still checks/bundle RetiredLeague checks/f_$(printf %03d $fr).png --frame=$fr --scale=0.5 --log=error >/dev/null; done
n=$#; cols=3; rows=$(( (n + cols - 1) / cols ))
ffmpeg -v error -y -pattern_type glob -i 'checks/f_*.png' -vf "tile=${cols}x${rows}:padding=6" -frames:v 1 checks/sheet.png
