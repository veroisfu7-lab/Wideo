# Финальный рендер с докачкой: находит недостающие кадры в out/seq, рендерит их кусками ≤300, повторяет при сбое.
import os, re, subprocess, sys, time
os.chdir(os.path.dirname(os.path.abspath(__file__)))
D = "out/seq"; os.makedirs(D, exist_ok=True)
A, B = int(sys.argv[1]) if len(sys.argv) > 1 else 0, int(sys.argv[2]) if len(sys.argv) > 2 else 5399
def normalize():
    have = set()
    for f in os.listdir(D):
        m = re.match(r"element-(\d+)\.jpeg$", f)
        if not m: continue
        n = int(m.group(1)); want = "element-%04d.jpeg" % n
        if f != want: os.replace(os.path.join(D, f), os.path.join(D, want))
        have.add(n)
    return have
def runs(missing):
    out = []; 
    for n in sorted(missing):
        if out and n == out[-1][1] + 1 and n - out[-1][0] < 300: out[-1][1] = n
        else: out.append([n, n])
    return out
for attempt in range(6):
    have = normalize()
    missing = [n for n in range(A, B + 1) if n not in have]
    if not missing: break
    for s, e in runs(missing):
        print(time.strftime("%H:%M:%S"), "render", s, e, "attempt", attempt, flush=True)
        r = subprocess.run(["npx", "remotion", "render", "src/index.ts", "Nekrobios", D, "--sequence", "--image-format=jpeg", "--jpeg-quality=95",
                            f"--frames={s}-{e}", "--concurrency=1", "--timeout=900000", "--log=error"], capture_output=True, text=True)
        if r.returncode != 0: print("  failed:", (r.stdout + r.stderr)[-400:].replace("\n", " "), flush=True)
        normalize()
have = normalize()
print("DONE", len([n for n in range(A, B + 1) if n in have]), "of", B - A + 1, time.strftime("%H:%M:%S"), flush=True)
