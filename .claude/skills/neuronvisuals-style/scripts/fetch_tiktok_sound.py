# Скачать звук (music_info) из ролика TikTok через публичный API tikwm — только кодом, без окон «Сохранить как».
#   python -I fetch_tiktok_sound.py <ссылка_на_видео_tiktok> <папка> [имя_файла.mp3]
# Как найти ссылку на видео с нужным треком (поиск TikTok и поиск tikwm закрыты капчей/Cloudflare — их НЕ обходить):
#   1) WebSearch "tiktok.com/music <трек> <исполнитель>" → страница звука tiktok.com/music/...-<id>
#   2) открыть её во встроенном браузере, JS: [...document.querySelectorAll('a')].map(a=>a.href).filter(h=>h.includes('/video/'))
#   3) любую из ссылок — сюда. Скрипт печатает title/author/original: брать официальный звук (original=False, автор = артист).
# Лимит API: 1 запрос в секунду. Звук в TikTok — клип 30–60 с, не полный трек.
import sys, os, json, time, urllib.request, urllib.parse
import sys as _sys; _sys.stdout.reconfigure(encoding="utf-8", errors="replace")   # консоль Windows (cp1251)

url, out = sys.argv[1], sys.argv[2]; name = sys.argv[3] if len(sys.argv) > 3 else None
os.makedirs(out, exist_ok=True)
api = "https://www.tikwm.com/api/?" + urllib.parse.urlencode({"url": url})
for attempt in range(3):
    d = json.loads(urllib.request.urlopen(urllib.request.Request(api, headers={"User-Agent": "Mozilla/5.0"}), timeout=30).read())
    if d.get("code") == 0: break
    print("tikwm:", d.get("msg")); time.sleep(1.5)
else:
    sys.exit("не удалось получить данные")
m = d["data"]["music_info"]
print(f"title: {m['title']} | author: {m['author']} | duration: {m['duration']} s | original: {m['original']}")
fname = name or ("".join(c for c in m["title"] if c.isalnum() or c in " -_")[:60].strip() or "sound") + ".mp3"
dst = os.path.join(out, fname)
with urllib.request.urlopen(urllib.request.Request(m["play"], headers={"User-Agent": "Mozilla/5.0"}), timeout=60) as r, open(dst, "wb") as fh:
    fh.write(r.read())
print("saved:", dst, os.path.getsize(dst), "bytes")
