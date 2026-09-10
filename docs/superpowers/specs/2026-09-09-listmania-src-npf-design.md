# listmania: src/ layout + NPF posting (tg-hp5 + tg-9if)

Combines two beads issues done as one change since they touch the same files:

- **textgen-monorepo-hp5**: switch listmania's Tumblr posting from the legacy `createTextPost` API to `tumblr-poster`'s NPF-based `postToTumblr`.
- **textgen-monorepo-9if**: align listmania's file layout to poeticalbot's `src/` convention (single source tree instead of root `index.js` + `lambda/` + `lib/`).

## Target layout

```
apps/listmania/
  src/
    cli.js            <- root index.js (CLI, commander-based script, unchanged control flow)
    config.js         <- root config.js (no content change)
    lambda-handler.js <- lambda/index.js (LambdaHandler class, unchanged control flow)
    lib/
      listify.js, debreak.js, stopwords.js, textutil.js, util.js   (moved as-is)
      npf-adapter.js   <- NEW
  scripts/
    test-handler.js, example-invocations.json   <- moved from lambda/ (manual invoke harness)
  docs/
    LAMBDA-HANDLER.md  <- moved from lambda/README.md
```

Deleted: root `index.js`, root `config.js`, `lambda/` (including `IMPLEMENTATION.md` - a stale one-off completion log), `lib/prep.js` (its HTML-based `prepForPublish`/`prefixifiers` become dead code once posting goes through the NPF adapter).

Not touched: `MIGRATION_ANALYSIS.md`, `MONOREPO_INTEGRATION.md` (root-level historical docs), listmania's script-style CLI (staying a script, not converted to a class the way poeticalbot's `cli.js` is - that would be unnecessary churn beyond what either ticket asks for).

## NPF adapter (`src/lib/npf-adapter.js`)

Input: a `list` object as produced by `listify.js` (`{ list: [...items], metadata: { title, source, strategy, length } }`). Output: NPF `content` array for `tumblr-poster`'s `postToTumblr`.

- Title -> one `{ type: 'text', subtype: 'heading2', text, formatting: [{start:0, end:title.length, type:'bold'}] }` block (matches poeticalbot's title treatment).
- List items -> one text block per item, each `{ type: 'text', subtype: 'numbered-list-item' | 'unordered-list-item', text: item }`. The subtype is picked once per post (random 2-way choice), not per item.
- No metadata block in the post. The existing metadata console.log (already present for the `postLive=false`/debug path) is unchanged.

This replaces `prep.js`'s HTML-string approach (`<div class='item'>...</div>`, `<br/>`, HTML comment for metadata), which only worked for the legacy body-as-HTML posting API and would render as literal tag text under NPF.

## Posting swap

`src/cli.js` and `src/lambda-handler.js` each currently build their own `tumblr.js` client and call `client.createTextPost('leanstooneside', { title, body: list.printable }, callback)`. Both switch to:

```js
const { postToTumblr } = require('tumblr-poster')
const { toNPFContent } = require('./lib/npf-adapter')
// ...
const result = await postToTumblr(config, 'leanstooneside', toNPFContent(list))
```

`config` already has the flat `{ consumerKey, consumerSecret, accessToken, accessSecret }` shape `tumblr-poster`'s `createClient` expects - no config restructuring needed.

`postList`/`postingResult` handling in `lambda-handler.js` adapts to `tumblr-poster`'s return shape (`{ success, postId, url, error }` instead of the raw `(err, data)` callback).

## Dependencies

- `package.json`: add `"tumblr-poster": "workspace:*"`. Keep `"tumblr.js"` as a direct dependency (poeticalbot keeps it too even though it no longer calls it directly - not cleaning that up here, out of scope).
- `main`/`start` -> `src/cli.js`.

## Build (`build-lambda.sh`)

Mirror poeticalbot's script:

- Copy `src/*` wholesale into the build dir (replaces the current `cp -r lambda`, `cp -r lib`, `cp config.js` steps).
- Entry file for `generate-lambda-package-json.js` becomes `lambda-handler.js` (was `lambda/index.js`).
- Bundle `tumblr-poster` directly into `node_modules/tumblr-poster` (copy its `package.json` + `index.js`) - same as poeticalbot, no Lambda layer needed for a lib this small.

## project.json

- `lambda:test` target command -> `node scripts/test-handler.js` (was `node lambda/test-handler.js`).
- `lint` target's `**/*.js` glob already covers `src/` and `scripts/`, no change needed.

## Tests

- `test/index.tests.js`, `test/cli-params.tests.js`: `execSync('node index.js' ...)` -> `execSync('node src/cli.js' ...)`.
- `test/lambda-deployment.tests.js`: `require('../lambda/index.js')` -> `require('../src/lambda-handler.js')`; any assertions checking for the `lambda/` directory's existence/contents get updated to check `src/` instead.
- New `test/npf-adapter.tests.js`, mirroring poeticalbot's `test/npf-formatting.tests.js` pattern: validates the generated NPF structure (heading2+bold title block, list-item blocks with the right subtype, no metadata block), and exercises both the numbered and unordered subtype branches.
- Existing `test/listify.tests.js`, `test/textutil.tests.js`, `test/util.tests.js` are unaffected (their subjects just move to `src/lib/`, same relative import depth from `test/`).

## Error handling

The `postList`/posting call sites in both `cli.js` and `lambda-handler.js` keep returning `{ success, postId, error }` shaped results on failure rather than throwing, consistent with current behavior - callers already branch on `result.error`/`result.success`.
