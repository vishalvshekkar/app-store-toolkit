#!/usr/bin/env bash
# Build the app-store-toolkit MCP server

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../servers/appstore-connect"

echo "Building app-store-toolkit MCP server..."

cd "$SERVER_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build
npm run build

echo "Build complete: servers/appstore-connect/dist/index.js"
