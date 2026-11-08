# Импорт реплик Speko / Google Gemini TTS: декодирует ответы audio.synthesize, режет паузы, ускоряет → public/vo/<id>.wav
import json, base64, subprocess, sys, glob, wave, os
files = sorted(glob.glob(sys.argv[1] + "/mcp-Speko-audio_synthesize-179413*.txt"))
ids = ["n1", "n2", "goon1", "guy", "n3", "goon2", "n4", "fbi", "goons", "n5", "mom", "n6"]
TEMPO = {"guy": 1.08, "mom": 1.1}  # рассказчик и громилы — 1.18
assert len(files) == len(ids), len(files)
os.makedirs("out/gem", exist_ok=True); d = {}
for k, fn in zip(ids, files):
    j = json.load(open(fn)); raw = f"out/gem/{k}.wav"
    open(raw, "wb").write(base64.b64decode(j["audio_base64"]))
    out = f"public/vo/{k}.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af",
        "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03:stop_periods=-1:stop_duration=0.25:stop_threshold=-42dB:stop_silence=0.16,"
        "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,"
        f"atempo={TEMPO.get(k, 1.18)},highpass=f=60,acompressor=threshold=-20dB:ratio=2.5:attack=5:release=80,loudnorm=I=-16:TP=-1.5",
        "-ar", "48000", "-ac", "1", out], check=True)
    with wave.open(out) as w: d[k] = round(w.getnframes() / w.getframerate(), 2)
    print(k, j["voice"] if "voice" in j else "", j["duration_seconds"], "->", d[k])
json.dump(d, open("tools/vo_durations.json", "w"), indent=1)
print("total", round(sum(d.values()), 2))
