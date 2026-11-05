# REVIEW_CHECKLIST — проверки перед сдачей

«Похоже» не считается: каждая проверка — замер или номер кадра. Не прошло → исправить → прогнать всё заново (правки дают регрессии). До 4 кругов на этап; если не сходится — честно написать сэру: какая проверка, какие числа, какие есть варианты.

## A. Автоматические замеры (сам, после каждого рендера)
```bash
python -I <skill>/scripts/selfcheck.py out/<ролик>.mp4 --timeline src/<имя>/timeline.json --hero-frame <кадр со средним планом героя>
python -I <skill>/scripts/levels.py <SFX_dB> <MUS_dB> <трек> <OFF> <стем.wav> <events.csv> <total/30>
python -I <skill>/scripts/contact_sheet.py out/<ролик>.mp4 checks/sheet.jpg --step 6 --cols 10 --width 160
```
| проверка | норма | откуда |
|---|---|---|
| склейки | нет (cut_candidates пуст) — если рефы не оговаривают иное | selfcheck |
| затемнение в конце | 10–17 кадров, последний кадр luma 0 | selfcheck fade_frames |
| пустые/чёрные кадры | только в затемнении | средняя яркость по кадрам |
| фон | `#010002` (±5 % яркости) | selfcheck bg_darkest2pct_hex, кропы |
| голова героя | 7–9.5 % W на среднем плане, круг (std радиуса < 2 %) | selfcheck hero_head |
| зазор голова–корпус | ≈0.12·D тёмный | selfcheck head_body_gap |
| свечение белого | +≈30 у края при 1080, спад к фону за ~20 px (класс A) | glow_profile |
| камера | без тряски; пик скорости ≤ ~15 px/кадр при 1080 | selfcheck camera_px_per_frame (глобальный сдвиг; движение героев тоже влияет — пик сверять по кадрам) |
| текст | заглавные ≈24–25 px; в шаблоне строки 332–355 и 376–399 px (17–21 % H; в рефах допустимо 15–23 %); шаг знака ≈24 px; печать ≈1.45 зн/кадр; 1-я строка тускнеет до 65 % | selfcheck text_rows, line2_typing_frames |
| подпись не режется | в полосе y 300–420 px нет ярких объектов поверх букв (струя, луч, тело) | кропы 4–6 кадров |
| вотермарк рефа | отсутствует | selfcheck watermark_zone_max + кроп |
| громкость | −14 LUFS ±1, true peak ≤ −1 dBFS, без провалов (RMS по 0.1 с без ям > 4 dB на кульминации) | selfcheck loudness, RMS-кривая |
| SFX | каждый удар/падение/касание на кадре контакта ±1; уровни +2…+9 dB над музыкой, ни одного > +13 | levels.py, онсеты против кадров |

## B. Визуальные баги (сам, по листам кадров и кропам)
- конечности сквозь стекло/стены/предметы; ступни висят над опорой или тонут в ней;
- голова закрыта руками, предметом, объёмом;
- частицы вне сцены (за стеклом, сквозь пол);
- сюжетный предмет не виден (телефон без свечения, фонарь за спиной);
- линия сюжета (луч, струя) проходит сквозь героя или указывает «не туда» (мораль переворачивается);
- персонажи у края кадра (< 10 % W), голова наезжает на подпись;
- разворот героя складывает фигуру в палку; рывки движения (framediff-выбросы вне событий).

## C. Независимый ревьюер (обязательно перед сдачей)
Отдельный агент (`general-purpose`, фоновый). Даёшь ему ТОЛЬКО: путь к рендеру, пути к рефам, `STYLE_RULES.md`, одобренный бриф идеи (как его видел сэр) и стемы для анализа звука. Никакого кода и своих объяснений, что и почему сделано. Он смотрит минимум три прохода: (1) история и читаемость целиком, (2) детали покадрово, (3) звук по спектру/онсетам/RMS.

### Шаблон брифа ревьюера
```
You are an independent QA reviewer for a short vertical video. You did NOT make it; be skeptical and concrete. Report in RUSSIAN.
Do NOT edit project files.
VIDEO: <путь> (<W>×<H>, <fps> fps, <кадров>, <сек>, with audio).
APPROVED BRIEF (quoted from the pitch to the client): <таблица битов, подписи, требования к звуку>.
STYLE REFERENCE: <STYLE_RULES.md> (px for 720×1280, ×1.5 for 1080). Reference videos: <папка>. Audio stems: music = <ffmpeg ...
atrim/volume>, SFX = <стем> at <dB>; the sum is normalised to −14 LUFS. Licensing of music is known — not a finding.
TOOLS: ffmpeg, Python cv2/numpy/matplotlib (-I), scratchpad <папка>; you cannot listen — use spectrograms/onsets/RMS;
cv2.imwrite fails on Cyrillic paths (use imencode().tofile()).
WATCH AT LEAST 3 PASSES: (1) story readability at phone size; (2) frame-level details; (3) audio.
CHECK with frame numbers: story beats readable; animation bugs (limbs through objects, floating/sinking feet, popping, occluded heads,
particles outside scene, framing, captions overlapped); style vs STYLE_RULES (bg, flat unlit chars + outline + head gap, head %W,
glow, rim edges, single accent, camera easing/speed, caption font/size/position/typewriter/dimming, fade, no cuts); exact Russian text;
audio (event per movement synced ±1 frame, SFX +2…+9 dB over bed, max +13, music from frame 0, −14 LUFS, TP ≤ −1, no dips);
technical (duration, fps, A/V match, blank frames).
SCORE each area 1–10 (story, animation, style, text, audio, technical); threshold 9.
DELIVER ≤600 words: verdict (готово к сдаче / нужны правки), scores, numbered problems by severity (критично/заметно/мелочь) with
frames + concrete fix, short list of what is good, evidence image paths.
```

### Работа с отчётом ревьюера
1. Каждую находку **сначала подтвердить самому** по кадрам (ревьюер тоже ошибается).
2. Исправить, перерендерить, прогнать раздел A целиком.
3. Повторная проверка — тому же ревьюеру через SendMessage (у него контекст прошлых находок): «вот новая версия, перечисленные изменения; перепроверь каждую старую находку и ищи регрессии». Если менялась музыка — сообщить, какой стем теперь.
4. Порог: все оценки ≥ 9 и вердикт «готово к сдаче». Оставшиеся мелочи перечислить сэру.
