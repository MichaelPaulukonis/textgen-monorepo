# Tumblr Posting Service — API Contract Design

**Bead**: tg-1 (Set up Separation Architecture for Tumblr Posting Service) — first sub-project.

## Scope

tg-1 as filed bundles multiple independent subsystems: API design, tech/hosting
choice, repo setup, data migration, monitoring strategy, load testing, security
review. This spec covers **only the API contract** between poeticalbot/listmania
and a future standalone Tumblr posting service. All other pieces are deferred to
follow-up beads once this contract is settled.

## Current state (as of 2026-08-28)

- **poeticalbot**: posts via NPF (Neue Post Format) through
  `apps/poeticalbot/src/lib/tumblr-client.js`. `postPoem(poem, blogName)` takes
  a caller-supplied `blogName` (not hardcoded) and returns
  `{success, postId, error}` shaped by `client.createPost(blogName, npfPost)`.
  poeticalbot's consolidation to `src/` is complete (see project CLAUDE.md);
  there is no separate `lambda/` tree.
- **listmania**: still on the pre-consolidation `lambda/` + `lib/` split. Posts
  via the legacy Tumblr API shape — `apps/listmania/lambda/index.js` calls
  `this.client.createTextPost('leanstooneside', {title, body}, callback)`, a
  deprecated (non-NPF) endpoint, and resolves `{success, postId, error}`.

These two callers currently speak different post formats to Tumblr directly.
The new service unifies that.

## Decisions

1. **Invocation style: synchronous request/response.** The calling app
   generates content, calls the service, and gets the post result inline
   (postId or error) in the same call. Matches the current
   Lambda-cron-generates-then-posts flow in both apps — least behavior change.
   Async enqueue/poll was considered and rejected: neither app needs the
   service to own scheduling, and polling adds complexity with no current
   requirement driving it.
2. **Content format: NPF only.** The service accepts NPF content blocks
   exclusively. Rejected accepting both NPF and legacy `{title, body}` —
   Tumblr's legacy text-post API is deprecated, and dual-format support would
   be permanent service-side complexity for a caller-side conversion that only
   listmania needs, once.
   - **Consequence**: listmania needs a small adapter to convert its printable
     list text into one NPF text block before calling `/post`. That adapter is
     listmania's responsibility, not the service's — out of scope here, but
     should be filed as a follow-up bead.
3. **Endpoint surface: `POST /post` only.** No `/schedule`, no `/status` yet —
   both are only needed under the async model, which was rejected above. If a
   future need for post-lookup-by-id emerges (e.g. retry tooling), add
   `GET /status/:id` then as its own bead.
4. **Auth: static API key per client.** Each app holds its own key (Lambda env
   var / Secrets Manager) and sends it as `x-api-key`. Rejected AWS IAM/SigV4
   — fewer moving parts for two known, small, internal Lambda callers; no
   signing code needed on either caller.

## API Contract

### `POST /post`

**Request**
```
Headers:
  x-api-key: <per-client static key>
  content-type: application/json

Body:
{
  "blogName": "poeticalbot.tumblr.com",
  "content": [ /* NPF content blocks */ ],
  "tags": ["poetry", "generative"],   // optional
  "title": "..."                       // optional, NPF title block data
}
```

`blogName` is caller-supplied per request (not configured service-side),
matching poeticalbot's existing `postPoem(poem, blogName)` pattern.

**Response — success (200)**
```json
{
  "success": true,
  "postId": "123456789",
  "url": "https://poeticalbot.tumblr.com/post/123456789"
}
```

**Response — failure (4xx/5xx)**
```json
{
  "success": false,
  "error": "message",
  "code": "TUMBLR_API_ERROR" | "INVALID_CONTENT" | "UNAUTHORIZED" | "INTERNAL"
}
```

The `{success, postId, error}` shape mirrors both apps' current result objects
(poeticalbot's `tumblr-client.js`, listmania's `postList`), minimizing the
adapter work each caller needs to integrate.

## Explicitly out of scope for this spec

- Rate limiting enforcement (documenting limits is a separate concern from
  this contract)
- `/schedule`, `/status` endpoints
- Data migration of existing scheduled posts
- Monitoring/logging strategy
- Tech/hosting selection (Lambda vs container, etc.)
- Repository structure for the new service
- Load testing, security review of the auth mechanism

Each should become its own follow-up bead once this contract is implemented
and both callers are adapted to it.
