#!/usr/bin/env bash
# Starts the barber page on http://localhost:3200 (override with PORT=...).
exec "$(dirname "$0")/scripts/start-page.sh" barber site-barber "${PORT:-3200}" "$0"
