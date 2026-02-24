#!/usr/bin/env bash
# PostToolUse hook: Validate metadata file after edit
# Called with the file path as the first argument

set -euo pipefail

FILE_PATH="${1:-}"

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
  echo "appcraft: MCP server not built. Run: cd servers/appstore-connect && npm run build"
  exit 0
fi

# Run validation
node "$SERVER_DIR/dist/index.js" --validate "$FILE_PATH"
