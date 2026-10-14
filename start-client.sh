#!/usr/bin/env bash
# Starts the client page on http://localhost:3100 (override with PORT=...).
exec "$(dirname "$0")/scripts/start-page.sh" client site-client "${PORT:-3100}" "$0"
