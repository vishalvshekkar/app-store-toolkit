#!/usr/bin/env bash
# SessionStart hook: Show brief app status on session start
# Receives JSON on stdin with: session_id, transcript_path, cwd, permission_mode, hook_event_name

set -euo pipefail

# Read hook input from stdin
INPUT=$(cat)

# Extract CWD from hook input JSON
CWD=$(node -e "try{console.log(JSON.parse(process.argv[1]).cwd||'')}catch(e){console.log('')}" "$INPUT" 2>/dev/null || echo "")

if [ -z "$CWD" ]; then
  CWD="$(pwd)"
fi

CONFIG_FILE="$CWD/.appstore/config.json"
LOCAL_CONFIG="$CWD/.appstore/config.local.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "app-store-toolkit: Not configured. Run /app-store-toolkit:setup to get started."
  exit 0
fi

# Parse config and display status in a single node call
node -e "
const fs = require('fs');
try {
  const c = JSON.parse(fs.readFileSync(process.argv[1], 'utf-8'));
  const creds = fs.existsSync(process.argv[2]) ? 'yes' : 'no';
  const parts = [
    c.bundle_id || 'not set',
    (c.platforms || []).join(', ') || 'none',
    (c.locales || []).length + ' locales',
    'voice: ' + (c.voice?.tone || 'not set'),
    'API: ' + creds
  ];
  console.log('app-store-toolkit: ' + parts.join(' | '));
} catch(e) {
  console.log('app-store-toolkit: Error reading config — run /app-store-toolkit:setup');
}
" "$CONFIG_FILE" "$LOCAL_CONFIG" 2>/dev/null || echo "app-store-toolkit: Error reading config"
