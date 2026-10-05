#!/bin/bash
# Build the common-corpus Lambda layer zip.
#
# Layout: nodejs/node_modules/common-corpus/{index.js,package.json,lib/,corpus/,node_modules/}
# Built in a temp dir so module resolution can't leak into the monorepo's node_modules
# during the smoke test.
#
# Fails if the layer's corpus file list differs from the tracked corpus -
# layer v1 silently dropped 46/125 texts (see textgen-monorepo-xpp).

set -euo pipefail

PKG_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_ZIP="$PKG_DIR/common-corpus-layer.zip"
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

DEST="$BUILD_DIR/nodejs/node_modules/common-corpus"
mkdir -p "$DEST"

cd "$PKG_DIR"

# No trailing slashes: BSD cp copies directory *contents* for `dir/`
cp -R index.js package.json lib "$DEST/"

# Tracked corpus files only (skips .DS_Store etc.), minus `###` paths, which
# index.js deliberately never loads (corpus/###gutencorpus is 17MB)
corpus_files() { git ls-files corpus | grep -v '###' | sort; }

corpus_files | while IFS= read -r f; do
  mkdir -p "$DEST/$(dirname "$f")"
  cp "$f" "$DEST/$f"
done

# Install from pnpm-lock.yaml via `pnpm deploy`; the old npm install had no
# lockfile, so even compromise (^14.17.0) floated per build (textgen-monorepo-s86).
# Deploy copies the whole package dir (terraform state etc.); keep only its
# node_modules - the files above are copied and verified explicitly.
echo "Installing production dependencies from pnpm-lock.yaml..."
(cd "$PKG_DIR/../.." && pnpm --filter common-corpus deploy --prod --config.node-linker=hoisted "$BUILD_DIR/deploy" >/dev/null)
mv "$BUILD_DIR/deploy/node_modules" "$DEST/node_modules"
rm -rf "$BUILD_DIR/deploy" "$DEST/node_modules/.bin"
if [ -n "$(find "$DEST/node_modules" -type l -print -quit)" ]; then
  echo "ERROR: symlinks in layer node_modules" >&2
  exit 1
fi

echo "Verifying corpus contents..."
diff <(corpus_files) <(cd "$DEST" && find corpus -type f | sort) || {
  echo "ERROR: layer corpus differs from tracked corpus files" >&2
  exit 1
}
EXPECTED="$(corpus_files | wc -l | tr -d ' ')"
echo "Corpus: $EXPECTED files, matches source"

echo "Smoke-testing layer package..."
(cd "$BUILD_DIR" && EXPECTED="$EXPECTED" node -e '
  const Corpora = require("./nodejs/node_modules/common-corpus")
  const c = new Corpora()
  const expected = Number(process.env.EXPECTED)
  if (c.texts.length !== expected) {
    console.error(`ERROR: loaded ${c.texts.length} texts, expected ${expected}`)
    process.exit(1)
  }
  for (const t of c.texts) {
    if (!t.text().length) {
      console.error(`ERROR: empty text ${t.name}`)
      process.exit(1)
    }
  }
  c.texts[0].sentences()
  console.log(`Loaded and read all ${c.texts.length} texts`)
')

rm -f "$OUT_ZIP"
(cd "$BUILD_DIR" && zip -qr "$OUT_ZIP" nodejs)
echo "Built $OUT_ZIP ($(du -h "$OUT_ZIP" | cut -f1))"
