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

# State-detection: print a next-step recommendation
node -e "
const fs = require('fs');
const path = require('path');

const root = process.argv[1];

function exists(rel) {
  try { return fs.existsSync(path.join(root, rel)); } catch { return false; }
}

function read(rel) {
  try { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf-8')); } catch { return null; }
}

function lastLine(rel) {
  try {
    const content = fs.readFileSync(path.join(root, rel), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return null;
    return JSON.parse(lines[lines.length - 1]);
  } catch { return null; }
}

function lastTimestamp(rel) {
  try { return lastLine(rel)?.timestamp || null; } catch { return null; }
}

try {
  const config = read('.appstore/config.json');
  if (!config) process.exit(0);

  // 1. No API credentials
  if (!exists('.appstore/config.local.json')) {
    console.log('→ Next: /app-store-toolkit:setup (no API credentials)');
    process.exit(0);
  }

  // 2. ship-state.json exists — resume in-progress ship
  const shipState = read('.appstore/ship-state.json');
  if (shipState) {
    const ver = shipState.version ? ' for v' + shipState.version : '';
    console.log('→ Next: /app-store-toolkit:ship (resume — checkpoint detected' + ver + ')');
    process.exit(0);
  }

  // 3. No description for primary locale
  const primaryLocale = config.primary_locale || 'en-US';
  if (!exists('.appstore/metadata/' + primaryLocale + '/description.json')) {
    console.log('→ Next: /app-store-toolkit:aso (no listing copy yet)');
    process.exit(0);
  }

  // 4. listing.json missing or categories.primary empty
  const listing = read('.appstore/listing.json');
  if (!listing || !listing.categories || !listing.categories.primary) {
    console.log('→ Next: edit .appstore/listing.json (set categories)');
    process.exit(0);
  }

  // 5. privacy.json missing or collectsData undefined
  const privacy = read('.appstore/privacy.json');
  if (!privacy || privacy.collectsData === undefined) {
    console.log('→ Next: /app-store-toolkit:privacy (App Privacy nutrition label)');
    process.exit(0);
  }

  // 6. review.json missing or contact.email empty
  const review = read('.appstore/review.json');
  if (!review || !review.contact || !review.contact.email) {
    console.log('→ Next: edit .appstore/review.json (App Review contact + notes)');
    process.exit(0);
  }

  // 7. No pushes.jsonl — never pushed
  if (!exists('.appstore/history/pushes.jsonl')) {
    console.log('→ Next: /app-store-toolkit:push (first push)');
    process.exit(0);
  }

  // 8. audits.jsonl missing or older than most recent push
  const lastPushTs = lastTimestamp('.appstore/history/pushes.jsonl');
  const lastAuditTs = lastTimestamp('.appstore/history/audits.jsonl');
  if (!lastAuditTs || (lastPushTs && new Date(lastAuditTs) < new Date(lastPushTs))) {
    const pushDate = lastPushTs ? new Date(lastPushTs) : null;
    const now = new Date();
    const daysDiff = pushDate ? Math.floor((now - pushDate) / 86400000) : null;
    const ago = daysDiff !== null ? (daysDiff === 0 ? 'today' : daysDiff + ' day' + (daysDiff === 1 ? '' : 's') + ' ago') : 'recently';
    console.log('→ Next: /app-store-toolkit:audit (metadata pushed ' + ago + '; no audit since)');
    process.exit(0);
  }

  // 9. Last audit had blockers
  const lastAudit = lastLine('.appstore/history/audits.jsonl');
  if (lastAudit && typeof lastAudit.blocker_count === 'number' && lastAudit.blocker_count > 0) {
    console.log('→ Next: /app-store-toolkit:audit (last run found ' + lastAudit.blocker_count + ' blocker' + (lastAudit.blocker_count === 1 ? '' : 's') + ')');
    process.exit(0);
  }

  // 10. No assets directory or empty
  const assetsDir = path.join(root, '.appstore/assets');
  let assetsEmpty = true;
  try {
    const entries = fs.readdirSync(assetsDir);
    assetsEmpty = entries.length === 0;
  } catch { assetsEmpty = true; }
  if (assetsEmpty) {
    console.log('→ Next: add screenshots to .appstore/assets/ or /app-store-toolkit:render-screenshots');
    process.exit(0);
  }

  // 11. Everything ready
  console.log('→ Next: /app-store-toolkit:ship (everything looks ready)');

} catch {
  // Never crash the session — silently exit
  process.exit(0);
}
" "$CWD" 2>/dev/null || true
