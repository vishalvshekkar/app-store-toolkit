#!/usr/bin/env bash
# SessionStart hook: Show brief app status on session start

set -euo pipefail

CONFIG_FILE=".appstore/config.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "appcraft: Not configured. Run /appcraft:setup to get started."
  exit 0
fi

# Parse config for basic info
BUNDLE_ID=$(node -e "const c=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf-8')); console.log(c.bundle_id || 'not set')" 2>/dev/null || echo "unknown")
PLATFORMS=$(node -e "const c=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf-8')); console.log((c.platforms||[]).join(', ') || 'none')" 2>/dev/null || echo "unknown")
LOCALES=$(node -e "const c=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf-8')); console.log((c.locales||[]).length)" 2>/dev/null || echo "0")
VOICE=$(node -e "const c=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf-8')); console.log(c.voice?.tone || 'not set')" 2>/dev/null || echo "unknown")

# Check if API credentials are configured
HAS_CREDS="no"
if [ -f ".appstore/config.local.json" ]; then
  HAS_CREDS="yes"
fi

echo "appcraft: $BUNDLE_ID | $PLATFORMS | ${LOCALES} locales | voice: $VOICE | API: $HAS_CREDS"
