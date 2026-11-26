#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILE="$ROOT/packages/walletkit/src/constants/client.ts"
VERSION=$(node -p "require('$ROOT/packages/walletkit/package.json').version")

sed -i.bak -E "s/SDK_VERSION = \"[^\"]*\"/SDK_VERSION = \"$VERSION\"/" "$FILE" && rm "$FILE.bak"
echo "[SCRIPT] SDK_VERSION -> $VERSION"
