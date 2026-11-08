# Импорт озвучки Speko / Google Gemini TTS (gemini-3.8-flash-tts, голос Charon):
# декодирует сохранённые ответы audio.synthesize, режет тишину, нормализует → public/vo/<id>.wav
import json, base64, subprocess, sys, glob, wave, os
files = sorted(glob.glob(sys.argv[1] + "/mcp-Speko-audio_synthesize-*.txt"))
ids = ["end", "cold", "taboo", "sergey", "offer", "boil", "feet", "pecker", "labaz", "dusk", "night", "sound", "under", "fire", "radar", "shot", "dawn", "track"]
assert len(files) == len(ids), len(files)
os.makedirs("out/gem", exist_ok=True); d = {}
for k, fn in zip(ids, files):
    j = json.load(open(fn)); raw = f"out/gem/{k}.wav"
    open(raw, "wb").write(base64.b64decode(j["audio_base64"]))
    out = f"public/vo/{k}.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af",
        "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05:stop_periods=-1:stop_duration=0.3:stop_threshold=-42dB:stop_silence=0.22,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15,areverse,atempo=1.22,"
        "highpass=f=60,equalizer=f=150:t=q:w=1:g=2,acompressor=threshold=-20dB:ratio=2.5:attack=5:release=80,loudnorm=I=-16:TP=-1.5",
        "-ar", "48000", "-ac", "1", out], check=True)
    with wave.open(out) as w: d[k] = round(w.getnframes() / w.getframerate(), 2)
    print(k, j["duration_seconds"], "->", d[k], j["model"])
json.dump({k: d[k] for k in ids[1:] + ["end"]}, open("tools/vo_durations.json", "w"), indent=1)
