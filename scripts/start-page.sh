#!/usr/bin/env bash
# Installs what is missing, compiles one page, and serves it with `next dev`.
# Usage: scripts/start-page.sh <page-name> <output-folder> <port> <command-name>
set -euo pipefail

page="$1"
out="$2"
port="$3"
caller="$4"

cd "$(dirname "$0")/.."

fail() {
  echo "error: $1" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Install Node 24 or later from https://nodejs.org."
node_major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$node_major" -ge 24 ] || fail "Node 24 or later is required; this is Node $(node -v)."

command -v pnpm >/dev/null 2>&1 || fail "pnpm is not installed. Run 'corepack enable' or 'npm install -g pnpm'."

[ -f "pages/$page.json" ] || fail "pages/$page.json does not exist."

if ! node -e 'const s = require("node:net").createServer(); s.once("error", () => process.exit(1)); s.listen(Number(process.argv[1]), () => s.close());' "$port"; then
  fail "port $port is already in use. Stop whatever is using it, or pick another port: PORT=4100 $caller"
fi

echo "==> Installing dependencies"
pnpm install

echo "==> Compiling pages/$page.json into $out/, then serving it on http://localhost:$port"
exec node compiler/src/cli.ts serve --page "pages/$page.json" --out "$out" --port "$port"
