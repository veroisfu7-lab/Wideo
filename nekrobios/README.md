# «Некробиос: человек за зеркалом» — вертикальный хоррор-ролик (1080×1920, 60 fps, 90 с)

Всё собрано кодом, без платных генераций: Remotion + Three.js (свой рендер-конвейер), модели — SDF-скульптинг на Python,
звук — синтез на numpy (+ espeak-ng для шёпота).

## Как устроено
| часть | где |
|---|---|
| модели (голова с мимикой, тело в худи со скелетом, кисти с пальцами, рама зеркала со змеями и лозой, ключ, тряпка, «Объект 02», рука-коготь) | `model/*.py` → `public/assets/*.bin/json` |
| движок кадра: рендерер, отражение «Зазеркалья» отдельным проходом (свой слой, свои источники света), стекло (пыль, полировка, жидкая ртуть, отпечатки), плёночный пост (DOF с овальным боке, размытие краёв, bloom, анаморфный блик, объёмный свет лампы, зерно 35 мм, грейдинг) | `src/engine/` |
| режиссура 12 планов (камеры, позы, отставание двойника, эффекты) | `src/film/director.ts`, тайминг — `src/film/shots.ts` |
| HUD в стиле iOS / Vision Pro (матовое стекло, неон) | `src/hud/HUD.tsx` |
| звук: партитура + эффекты по событиям, сведение | `sound/sfx.py` → `out/audio_pre.wav` → компрессия + нормализация → `out/audio.wav` |

## Команды
```bash
npm install
cd model && python3 build_head.py && python3 build_body.py && python3 build_props.py && python3 build_claw.py && cd ..
python3 sound/sfx.py
ffmpeg -y -i out/audio_pre.wav -af "acompressor=threshold=-34dB:ratio=2.2:attack=25:release=350:makeup=1" out/audio_comp.wav
TARGET=-13.2 sh ../.claude/skills/neuronvisuals-style/scripts/normalize.sh out/audio_comp.wav out/audio.wav
python3 render_final.py 0 5399     # кадры в out/seq (докачка, повтор при сбое), ≈2–2.5 с/кадр на CPU
./assemble.sh                       # → ../Некробиос.mp4
./tools_stills.sh "60,700,1500" checks/sheet.jpg 0.3   # листы контрольных кадров
```
