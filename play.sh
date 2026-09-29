#!/bin/sh
# Start Toot-Toot Twenty so an iPad on the same Wi-Fi can play.
# For the chooser (Toot-Toot and Jump-Jump together): npm run build && npm run preview
# For Jump-Jump Bunny alone: npm run dev:jjb
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
if command -v npm >/dev/null 2>&1; then
  PATH_OK=1
else
  NODE_BIN="$HOME/.grok/node/node-v20.19.4-darwin-arm64/bin"
  if [ -x "$NODE_BIN/npm" ]; then
    export PATH="$NODE_BIN:$PATH"
  else
    echo "Node.js 20+ is required. Install from https://nodejs.org then run: npm install && npm run dev"
    exit 1
  fi
fi
cd "$ROOT"
if [ ! -d node_modules ]; then
  npm install
fi
echo "On the iPad, open Safari to the Network URL printed below (not localhost)."
exec npm run dev
