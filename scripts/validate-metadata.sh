#!/usr/bin/env bash
# PostToolUse hook: Validate metadata file after Write/Edit
# Receives JSON on stdin with: tool_name, tool_input (file_path, content), tool_result, cwd, etc.

set -euo pipefail

# Read hook input from stdin
INPUT=$(cat)

# Extract file_path from tool_input — use pipe since tool_input can be large
FILE_PATH=$(printf '%s' "$INPUT" | node -e "
let d = '';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try { console.log(JSON.parse(d).tool_input?.file_path || ''); }
  catch(e) { console.log(''); }
});
" 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only validate files under .appstore/metadata/
if [[ ! "$FILE_PATH" == *".appstore/metadata/"* ]]; then
  exit 0
fi

# Only validate JSON files
if [[ ! "$FILE_PATH" == *.json ]]; then
  exit 0
fi

# Find the MCP server dist directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../servers/appstore-connect"

if [ ! -f "$SERVER_DIR/dist/index.js" ]; then
  echo "app-store-toolkit: MCP server not built. Run: cd servers/appstore-connect && npm run build"
  exit 0
fi

# Run validation
node "$SERVER_DIR/dist/index.js" --validate "$FILE_PATH"
