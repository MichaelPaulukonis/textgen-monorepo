# Tumblr Posting — Shared Lib Design

**Bead**: tg-1 (Set up Separation Architecture for Tumblr Posting Service) — first sub-project.

**Revision note (2026-08-30)**: Original draft of this spec proposed a standalone
network service (HTTP API, static-key auth, own deploy/monitoring/hosting). On
review that's over-architected for the actual requirement — two (soon three)
Lambda callers in one AWS account, one user, no need to post from outside AWS.
Superseded below with a shared lib, following the same lib+Lambda-layer pattern
`libs/common-corpus` already uses for both apps. See bead's decision log for
the rejected service version if needed for reference.

## Scope

Extract Tumblr NPF-posting into `libs/tumblr-poster`, consumed by poeticalbot
and listmania (and future callers) as a workspace dependency + Lambda layer —
not a network service. This spec covers the lib's function contract and
packaging. Data migration, and listmania's NPF adapter are deferred to
follow-up beads.

## Current state (as of 2026-08-30)

- **poeticalbot**: posts via NPF through `apps/poeticalbot/src/lib/tumblr-client.js`.
  `TumblrClient#postPoem(poem, blogName)` initializes `tumblr.js` from
  caller-supplied credentials, converts the poem to NPF, calls
  `client.createPost(blogName, npfPost)`, and returns
  `{success, postId, url, npfPost, error}`.
- **listmania**: still on the pre-consolidation `lambda/` + `lib/` split. Posts
  via the legacy Tumblr API — `apps/listmania/lambda/index.js` calls
  `this.client.createTextPost('leanstooneside', {title, body}, callback)`, a
  deprecated (non-NPF) endpoint, and resolves `{success, postId, error}`.
- **common-corpus** already demonstrates the target pattern: a plain
  `libs/<name>` package consumed as `"common-corpus": "workspace:*"` for
  CLI/local use, and separately packaged as a Lambda layer
  (`npm run build:layer` → `layer/nodejs/node_modules/common-corpus/` →
  zipped). Callers load it via `layerRequire('common-corpus')`
  (`apps/poeticalbot/src/lib/layer-require.js`), which picks
  `/opt/nodejs/node_modules/<name>` under Lambda and falls back to normal
  `require` for CLI/test. `tumblr-poster` reuses this exact mechanism —
  `layerRequire('tumblr-poster')` — no new loader needed.

## Decisions

1. **Invocation style: direct function call, in-process.** No HTTP, no
   network hop. Matches how `common-corpus` is already consumed by both apps.
   Rejected standalone service — same-account, same-user, Lambda-to-Lambda
   traffic doesn't need a network boundary; a network boundary only adds
   deploy/monitoring/auth surface with nothing on the other side of it to
   protect against.
2. **Packaging: workspace lib + Lambda layer, common-corpus pattern.**
   `libs/tumblr-poster/package.json` with a `build:layer` script identical in
   shape to `common-corpus`'s; `project.json` with `build`, `test`,
   `build-layer`, `lint` targets. Each app's `build-lambda.sh` attaches the
   layer the same way it already does (or will do, once listmania catches up)
   for `common-corpus`.
3. **Content format: NPF only.** Unchanged from the original draft — Tumblr's
   legacy text-post API is deprecated, and dual-format support is permanent
   lib-side complexity for a caller-side conversion only listmania needs,
   once.
   - **Consequence**: listmania needs a small adapter converting its printable
     list text into one NPF text block before calling the lib. Still listmania's
     responsibility, not the lib's — file as a follow-up bead.
4. **Auth: none — unchanged from today.** No API key, no service to
   authenticate against. Each app keeps holding its own Tumblr OAuth
   credentials (Lambda env var / Secrets Manager) exactly as poeticalbot does
   now via `TumblrClient.fromConfig(config)`, and passes them into the lib
   call. The lib never stores or transmits credentials anywhere; it's a
   function, not a boundary.
5. **Extraction surface: posting only, not the whole `TumblrClient` class.**
   Move just the NPF-posting path (`initialize` + `convertPoemToNPF` +
   `validateNPF` + `client.createPost`) into the lib. Leave
   `getBlogInfo`/`getRecentPosts`/`deletePost`/`validateCredentials` in
   poeticalbot's `tumblr-client.js` for now — nothing currently needs them
   shared. Pull them into the lib later, if/when a second caller actually
   needs one, rather than speculatively.

## Lib Contract

```js
const postToTumblr = require('tumblr-poster')

const result = await postToTumblr(credentials, blogName, content, options)
```

**`credentials`** — `{ consumerKey, consumerSecret, accessToken, accessSecret }`
(same shape `TumblrClient` already takes).

**`blogName`** — e.g. `'poeticalbot.tumblr.com'`, caller-supplied per call.

**`content`** — NPF content blocks array.

**`options`** *(optional)* — `{ tags: string[], title: string }`.

**Returns** — `Promise<{ success, postId, url, error }>`, same shape both
apps' current result objects already use, so integrating either caller is a
require-path change plus dropping the credentials/blogName in — not a rewrite.

## Explicitly out of scope for this spec

- listmania's NPF adapter (printable list → NPF text block) — follow-up bead
- Migrating listmania off `lambda/`+`lib/` split onto `src/` (separate,
  pre-existing consolidation gap — see project CLAUDE.md)
- Extracting `getBlogInfo`/`getRecentPosts`/`deletePost`/`validateCredentials`
  into the shared lib (only if/when a second caller needs them)
- Data migration of existing scheduled posts
- Rate limiting, monitoring/logging strategy, security review of an auth
  mechanism — **not applicable**, not deferred: there's no network boundary
  and no auth mechanism in this design, so these costs don't exist rather than
  being pushed to a follow-up bead.
