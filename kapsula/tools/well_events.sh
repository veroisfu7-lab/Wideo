#!/bin/sh
# События для звука из постановки (plan.ts — чистые функции): собрать в cjs и выгрузить в checks/well/events.json.
# Запуск из корня проекта:  sh tools/well_events.sh && python -I tools/sfx_well.py
set -e
mkdir -p checks/well
npx esbuild src/well/plan.ts --bundle --platform=node --format=cjs --outfile=checks/well/plan.cjs --log-level=error
node -e "require('fs').writeFileSync('checks/well/events.json', JSON.stringify(require('./checks/well/plan.cjs').events()))"
echo "events: $(node -e "console.log(require('./checks/well/events.json').length)")"
