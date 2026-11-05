#!/bin/sh
# Статическая нормализация до −14 LUFS: одно постоянное усиление + лимитер только на пиках.
# (loudnorm linear=true молча уходит в динамический режим, если не влезает в TP, — получается «дакинг».)
#   sh normalize.sh in.wav out.wav            (TARGET= по умолчанию −13.2: AAC 192k при муксе в mp4 снимает ≈0.5–0.6 LUFS,
#                                              в готовом mp4 выходит ≈ −14; true peak после AAC ≈ −2 dBFS при limit −3.8)
IN="$1"; OUT="$2"; TARGET=${TARGET:--13.2}
I=$(ffmpeg -hide_banner -i "$IN" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G=$(python -I -c "print(round($TARGET - ($I), 2))")
ffmpeg -v error -y -i "$IN" -af "volume=${G}dB,alimiter=limit=-3.8dB:attack=1:release=60:level=disabled" -ar 48000 "$OUT"
# лимитер мог чуть снизить громкость — один корректирующий проход
I2=$(ffmpeg -hide_banner -i "$OUT" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G2=$(python -I -c "print(round($TARGET - ($I2), 2))")
ffmpeg -v error -y -i "$IN" -af "volume=$(python -I -c "print($G + $G2)")dB,alimiter=limit=-3.8dB:attack=1:release=60:level=disabled" -ar 48000 "$OUT"
ffmpeg -hide_banner -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|LRA:|Peak:)"
