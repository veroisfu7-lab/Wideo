#!/bin/sh
# Ставит шрифты ролика в систему (Chrome рендера берёт их через fontconfig). Нужны: pip install fonttools brotli
set -e
cd "$(dirname "$0")/.."
mkdir -p ~/.fonts
python3 -c "
from fontTools.ttLib import TTFont
names = {'corm-cyr': 'CicadaCormCyr', 'corm-lat': 'CicadaCormLat', 'osw-cyr': 'CicadaOswCyr', 'osw-lat': 'CicadaOswLat'}
for f, fam in names.items():
    t = TTFont('public/fonts/' + f + '.woff2'); t.flavor = None
    for r in t['name'].names:
        if r.nameID in (1, 4, 16, 21): r.string = fam
        if r.nameID == 6: r.string = fam.replace(' ', '')
    t.save('$HOME/.fonts/' + f + '.ttf')
"
fc-cache -f
