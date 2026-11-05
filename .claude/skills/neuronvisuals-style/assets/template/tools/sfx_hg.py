# Пример: звуки «Песочных часов» по src/hourglass/timeline.json — звук на каждое движение.
#   python -I tools/sfx_hg.py → public/sfx_hg.wav + checks/sfx_hg_events.csv (копируй как основу для нового ролика)
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sfxlib import Mixer
import sys as _sys; _sys.stdout.reconfigure(encoding="utf-8", errors="replace")   # консоль Windows (cp1251)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "src", "hourglass", "timeline.json"), encoding="utf-8"))
W, G, C = T["white"], T["grey"], T["camera"]
mx = Mixer(T["total"], T["fps"])
WP, GP = -0.15, -0.45            # панорама: белый ближе к центру, серый слева

# струя шипит весь ролик; пока белый в горлышке — песок бьёт по нему
mx.put(mx.hiss(T["total"]), 0, -1, 0.05, "stream_hiss")
mx.put(mx.sand_spray(34), W["pullup"][1] - 8, 4, 0.0, "sand_on_white")
# серый: тапы по экрану весь ролик, рывок на 60
for f in range(4, T["total"] - 12, G["taps"]):
    mx.put(mx.tap(), f, 4, GP, f"phone_tap_{f}")
mx.put(mx.cloth(8), G["jerk"][0], 7, GP, "grey_jerk_cloth")
mx.put(mx.whoosh(6, 600, 4000), G["jerk"][0], 3, GP, "grey_jerk_whoosh")
mx.put(mx.sand_slide(10), G["jerk"][0] + 1, -6, GP, "grey_jerk_sand")
# белый внизу
mx.put(mx.cloth(8), W["turn1"][0], 6, WP, "white_turn1")
mx.put(mx.sand_step(), W["step1"][1], 7, WP - 0.1, "white_step_to_grey")
mx.put(mx.cloth(8), W["reach"][0], -2, WP - 0.2, "white_reach")
mx.put(mx.cloth(12), W["pull"][0], 6, WP - 0.2, "white_pull_cloth")
mx.put(mx.sand_slide(12), W["pull"][0] + 2, 4, WP - 0.2, "white_pull_feet_sand")
mx.put(mx.sand_step(0.8), W["back"][1], 7, WP - 0.1, "white_step_back")
mx.put(mx.cloth(8), W["turn2"][0], 6, WP, "white_turn2")
# подъём: шаг каждые 14 кадров (касание на t+10), два срыва
t = W["climb"][0]
while t + 10 <= W["climb"][1]:
    mx.put(mx.sand_step(), t + 10, 8, WP, f"climb_step_{t + 10}")
    mx.put(mx.cloth(6), t + 2, -3, WP, f"climb_swing_{t + 2}")
    t += W["stepEvery"]
for a in W["slips"]:
    mx.put(mx.sand_slide(16), a, 7, WP, f"slip_slide_{a}")
    mx.put(mx.sand_step(1.2), a + 1, 2, WP, f"slip_hands_{a}")
    mx.put(mx.boom(180, 60, 8, 0.2), a + 2, -6, WP, f"slip_thud_{a}")
# прыжок, хват за горлышко (поворот), вис, подтягивание
mx.put(mx.cloth(10), W["crouch"][0], 7, WP, "crouch_cloth")
mx.put(mx.sand_step(1.4), W["jump"][0], 3, WP, "jump_pushoff")
mx.put(mx.sand_slide(14), W["jump"][0] + 1, -2, WP, "jump_sand_burst")
mx.put(mx.whoosh(7, 500, 5000), W["jump"][0], 0, WP, "jump_whoosh")
mx.put(mx.glass_grab(), W["grab"] - 2, 1, WP, "grab_glass")
mx.put(mx.boom(220, 55, 10, 0.45), W["grab"] - 2, 0, 0.0, "grab_turn_boom")
for k, f in enumerate(range(W["pullup"][0], W["pullup"][1], 6)):
    mx.put(mx.cloth(5), f, 2, WP, f"pullup_effort_{k}")
    mx.put(mx.whoosh(5, 400, 3000), f + 3, -2, WP, f"kick_{k}")
# выход наверх: ладони на песок, колено, ноги, встал
mx.put(mx.sand_step(0.7), W["mantle"][0] + 7, 0, 0.1, "hand_on_upper_sand_1")
mx.put(mx.sand_step(0.7), W["mantle"][0] + 13, 0, 0.15, "hand_on_upper_sand_2")
mx.put(mx.cloth(10), 278, -1, 0.15, "mantle_cloth")
mx.put(mx.sand_step(), 289, 5, 0.2, "upper_foot_1")
mx.put(mx.sand_step(), W["stand"], 5, 0.25, "upper_foot_2")
mx.put(mx.sand_slide(10), W["stand"] + 1, -1, 0.25, "upper_settle_sand")
mx.put(mx.cloth(10), W["lookDown"][0], 1, 0.25, "white_lookdown")
# общий план: низкий удар + воздух
mx.put(mx.boom(170, 42, 13, 0.7), C["revealStart"], 1, 0.0, "reveal_boom")
mx.put(mx.swell(40), C["revealStart"] - 2, -5, 0.0, "reveal_swell")

n, dur = mx.save(os.path.join(ROOT, "public", "sfx_hg.wav"), os.path.join(ROOT, "checks", "sfx_hg_events.csv"))
print(n, "событий,", dur, "с")
