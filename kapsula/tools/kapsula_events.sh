#!/bin/sh
# События для звука из постановки (src/kapsula/plan.ts) → checks/kapsula/events.json
#   sh tools/kapsula_events.sh && python -I tools/sfx_kapsula.py
set -e
mkdir -p checks/kapsula
npx esbuild src/kapsula/plan.ts --bundle --platform=node --format=cjs --outfile=checks/kapsula/plan.cjs --log-level=error
node -e "require('fs').writeFileSync('checks/kapsula/events.json', JSON.stringify(require('./checks/kapsula/plan.cjs').events()))"
echo "events: $(node -e "console.log(require('./checks/kapsula/events.json').length)")"
