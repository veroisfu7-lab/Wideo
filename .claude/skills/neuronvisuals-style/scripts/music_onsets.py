# Структура трека для подбора смещения: громкость по 0.5 с, сильные онсеты, басовые удары, период доли.
#   python -I music_onsets.py <трек.mp3> [кадр_поворота] [fps=30]
# С кадром поворота печатает смещения OFF (для mix.sh), при которых сильный онсет попадает ровно на этот кадр.
import sys, subprocess
import numpy as np
import sys as _sys; _sys.stdout.reconfigure(encoding="utf-8", errors="replace")   # консоль Windows (cp1251)

path = sys.argv[1]; turn = int(sys.argv[2]) if len(sys.argv) > 2 else None; fps = float(sys.argv[3]) if len(sys.argv) > 3 else 30.0
sr = 22050
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"], capture_output=True).stdout
a = np.frombuffer(raw, np.int16).astype(float) / 32768
hop = sr // 2
print("длительность", round(len(a) / sr, 2), "с")
print("RMS dBFS по 0.5 с:", [round(20 * np.log10(np.sqrt(np.mean(a[i:i + hop] ** 2)) + 1e-9), 1) for i in range(0, len(a) - hop, hop)])
n, h = 2048, 512
S = np.abs(np.array([np.fft.rfft(a[i:i + n] * np.hanning(n)) for i in range(0, len(a) - n, h)]))
flux = np.maximum(0, np.diff(np.log1p(S), axis=0)).sum(1); t = np.arange(len(flux)) * h / sr
lo = np.maximum(0, np.diff(np.log1p(S[:, :int(150 / (sr / n))].sum(1))))
on = sorted(round(float(t[i]), 2) for i in np.argsort(-flux)[:24])
print("сильные онсеты, с:", on)
print("басовые удары, с:", sorted(round(float(t[i]), 2) for i in np.argsort(-lo)[:16]))
ac = np.correlate(flux - flux.mean(), flux - flux.mean(), "full")[len(flux) - 1:]; lags = np.arange(len(ac)) * h / sr
m = (lags > 0.3) & (lags < 1.5); print("период доли ~", round(float(lags[m][np.argmax(ac[m])]), 3), "с")
if turn is not None:
    tt = turn / fps
    print(f"кадр поворота {turn} = {tt:.2f} с; смещения OFF, при которых онсет ложится на него:",
          [round(o - tt, 2) for o in on if o - tt >= 0])
