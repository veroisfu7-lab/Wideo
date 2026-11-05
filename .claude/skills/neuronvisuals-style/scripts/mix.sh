#!/bin/sh
# Сведение ролика: музыка (кусок трека с OFF секунд) + стем эффектов → статическая нормализация.
#   TRACK=public/music/x.mp3 OFF=6.23 MUS=-25 SFX=-4 STEM=public/sfx.wav DUR=13 OUT=out/audio.wav sh mix.sh
# Подбор: OFF так, чтобы сильная доля/вступление трека попала на кадр поворота; MUS — так, чтобы удары эффектов
# были на +2…+9 дБ над музыкой (проверять levels.py). Плотный современный трек ≈ −25 дБ, оркестр/пиано ≈ −10…−15 дБ.
# Музыка с кадра 0 без фейд-ина, гаснет вместе с картинкой (последние 0.5 с); дакинга нет (STYLE_RULES §9).
HERE="$(cd "$(dirname "$0")" && pwd)"
: "${TRACK:?TRACK= путь к треку}"; : "${STEM:?STEM= путь к стему эффектов}"
OFF=${OFF:-0}; MUS=${MUS:--15}; SFX=${SFX:--4}; DUR=${DUR:-13}; OUT=${OUT:-out/audio.wav}
FADE=$(python -I -c "print($DUR - 0.5)")
mkdir -p "$(dirname "$OUT")"
ffmpeg -v error -y -i "$TRACK" -i "$STEM" -filter_complex \
"[0:a]atrim=start=$OFF:duration=$DUR,asetpts=PTS-STARTPTS,aresample=48000,volume=${MUS}dB,afade=t=out:st=$FADE:d=0.5[m];\
[1:a]volume=${SFX}dB[s];[m][s]amix=inputs=2:normalize=0:duration=first[x]" -map "[x]" -ac 2 "${OUT%.wav}_pre.wav"
sh "$HERE/normalize.sh" "${OUT%.wav}_pre.wav" "$OUT"
