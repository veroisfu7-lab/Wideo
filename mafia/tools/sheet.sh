#!/bin/bash
# tools/sheet.sh out.png a.png b.png c.png d.png  → сетка 2x2 (или меньше)
out=$1; shift; n=$#
args=(); for f in "$@"; do args+=(-i "$f"); done
if [ $n -eq 4 ]; then lay="0_0|w0_0|0_h0|w0_h0"; elif [ $n -eq 3 ]; then lay="0_0|w0_0|w0+w1_0"; elif [ $n -eq 2 ]; then lay="0_0|w0_0"; else cp "$1" "$out"; exit; fi
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "xstack=inputs=$n:layout=$lay" "$out"
