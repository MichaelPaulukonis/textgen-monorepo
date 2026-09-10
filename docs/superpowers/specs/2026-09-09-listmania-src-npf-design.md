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
    test-integration.js   <- moved from root (manual smoke-test script, not wired into any npm/nx target)
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

`postList`/`postingResult` handling in `lambda-handler.js` adapts to `tumblr-poster`'s return shape (`{ success, postId, url, error }` instead of the raw `(err, data)` callback). `LambdaHandler` drops its constructor-built `this.client` (`tumblr.js`'s client) entirely, since posting no longer needs a client held on the instance - `postToTumblr` builds its own internally. `scripts/test-integration.js`'s `handler.client` truthiness check is removed accordingly (its `handler.config`/`handler.listifier` checks are unaffected).

## Dependencies

- `package.json`: add `"tumblr-poster": "workspace:*"`. Keep `"tumblr.js"` as a direct dependency (poeticalbot keeps it too even though it no longer calls it directly - not cleaning that up here, out of scope).
- `main`/`start` -> `src/cli.js`.

## Build (`build-lambda.sh`) and Lambda entry point

Mirror poeticalbot's script:

- Copy `src/*` wholesale into the build dir, flattened to the build/zip root (replaces the current `cp -r lambda`, `cp -r lib`, `cp config.js` steps) - so `src/lambda-handler.js` lands at the zip root as `lambda-handler.js`.
- Entry file for `generate-lambda-package-json.js` becomes `lambda-handler.js` (was `lambda/index.js`).
- Bundle `tumblr-poster` directly into `node_modules/tumblr-poster` (copy its `package.json` + `index.js`) - same as poeticalbot, no Lambda layer needed for a lib this small.

**No `src/index.js`.** poeticalbot has one because its `build-lambda.sh` also flattens `src/*` to the zip root, and AWS's `handler` config string (`<file>.<exportedFn>`, relative to zip root) has to point at *some* real file there - poeticalbot uses `index.js` for that, which is why it exists despite `cli.js` being the actual local-dev entry (that overlap is poeticalbot's own debt, not a convention worth copying - see `textgen-monorepo-xze`). `src/lambda-handler.js` already exports `exports.handler` at the bottom (carried over from the current `lambda/index.js`), so it can be the zip-root entry directly - no extra dispatch file needed.

- `apps/listmania/terraform/main.tf`: `handler = "lambda/index.handler"` -> `handler = "lambda-handler.handler"`.

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
