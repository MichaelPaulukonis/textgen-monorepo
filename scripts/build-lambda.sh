#!/bin/bash
# Build an app's Lambda deployment zip: terraform/<app>-lambda.zip
# Usage: scripts/build-lambda.sh <app> <entry-file>   (e.g. poeticalbot index.js)
#
# Dependencies come from `pnpm deploy`, which installs from pnpm-lock.yaml, so
# the zip gets exactly the dependency tree we run locally, transitive deps
# included. The old `npm install` in a temp dir had no lockfile and resolved
# every range fresh on each build (textgen-monorepo-s86, -yfs).
# node-linker=hoisted gives a flat node_modules of real files (no symlinks).
# Workspace libs (tumblr-poster) arrive as injected copies; common-corpus is
# removed because Lambda loads it from the layer.

set -euo pipefail

APP="${1:?usage: build-lambda.sh <app> <entry-file>}"
ENTRY="${2:?usage: build-lambda.sh <app> <entry-file>}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/apps/$APP"
OUT_ZIP="$APP_DIR/terraform/$APP-lambda.zip"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "Building $APP Lambda deployment package..."

echo "Installing production dependencies from pnpm-lock.yaml..."
(cd "$ROOT" && pnpm --filter "$APP" deploy --prod --config.node-linker=hoisted "$WORK/deploy" >/dev/null)

# deploy copies the whole package dir, gitignored junk included (terraform
# state, old zips), so take only src/ and node_modules from it
BUILD="$WORK/build"
mkdir -p "$BUILD"
cp -R "$APP_DIR/src/." "$BUILD/"
mv "$WORK/deploy/node_modules" "$BUILD/node_modules"
rm -rf "$BUILD/node_modules/common-corpus" "$BUILD/node_modules/.bin"

if [ -n "$(find "$BUILD/node_modules" -type l -print -quit)" ]; then
  echo "ERROR: symlinks in node_modules - zip would not be self-contained" >&2
  exit 1
fi

node "$ROOT/scripts/generate-lambda-package-json.js" "$APP_DIR/package.json" "$BUILD/package.json" "$ENTRY"

rm -f "$OUT_ZIP"
(cd "$BUILD" && zip -qr "$OUT_ZIP" . -x "node_modules/.cache/*" "*.test.js" "test/*" "node_modules/.pnpm/*" "node_modules/.modules.yaml")

echo "✓ Lambda package created: $OUT_ZIP ($(du -h "$OUT_ZIP" | cut -f1))"
echo ""
echo "Next steps:"
echo "  - Review terraform plan: nx run $APP:deploy:plan"
echo "  - Deploy to AWS: nx run $APP:deploy"
