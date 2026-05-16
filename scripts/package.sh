#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXTENSION_DIR="$ROOT_DIR/extension"
DIST_DIR="$ROOT_DIR/dist"
ZIP_PATH="$DIST_DIR/site-blocker-extension.zip"
CRX_PATH="$DIST_DIR/site-blocker-extension.crx"
KEY_PATH="${CHROME_EXTENSION_KEY:-$ROOT_DIR/keys/site-blocker-extension.pem}"
CHROME_BIN="${CHROME_BIN:-}"

mkdir -p "$DIST_DIR"
rm -f "$ZIP_PATH"

(
  cd "$EXTENSION_DIR"
  zip -r "$ZIP_PATH" . \
    -x '.DS_Store' \
    -x '__MACOSX/*'
)

echo "Created $ZIP_PATH"

if [[ -n "$CHROME_BIN" && -f "$KEY_PATH" ]]; then
  rm -f "$ROOT_DIR/extension.crx" "$CRX_PATH"
  "$CHROME_BIN" \
    --pack-extension="$EXTENSION_DIR" \
    --pack-extension-key="$KEY_PATH"
  mv "$ROOT_DIR/extension.crx" "$CRX_PATH"
  echo "Created $CRX_PATH"
fi
