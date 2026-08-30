# Tumblr Poster Lib Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract poeticalbot's NPF-posting-to-Tumblr logic into `libs/tumblr-poster`, a plain in-process shared lib (no network service, no Lambda layer), and switch poeticalbot's `tumblr-client.js` to call it.

**Architecture:** `libs/tumblr-poster` exports `postToTumblr(credentials, blogName, content, options)` plus the building blocks it's composed from (`createClient`, `postWithClient`, `validateNPF`), so callers that already hold an initialized `tumblr.js` client (like poeticalbot's `TumblrClient`) can reuse `postWithClient` directly instead of constructing a second client. Consumed as a pnpm workspace dep for CLI/local use; for the Lambda deploy, `build-lambda.sh` bundles the lib's two files straight into the zip's `node_modules/` (no AWS Lambda layer — this lib has no bulk payload like `common-corpus`'s 75MB corpus, so a layer would only add AWS infra ceremony for no benefit).

**Tech Stack:** Node (CommonJS), `tumblr.js`, mocha + chai + nyc (matches repo convention — no jest, no sinon/proxyquire; a test-only monkeypatch on `module.exports` covers the one spot that needs it).

**Bead:** tg-1. **Spec:** `docs/superpowers/specs/2026-08-28-tumblr-posting-service-api-design.md`.

---

## File Structure

**Create:**
- `libs/tumblr-poster/package.json` — new workspace package, `tumblr.js` as a real dependency
- `libs/tumblr-poster/project.json` — Nx targets (`build`, `test`, `lint`), matching `common-corpus`
- `libs/tumblr-poster/index.js` — `validateNPF`, `createClient`, `postWithClient`, `postToTumblr`
- `libs/tumblr-poster/test/tumblr-poster.tests.js`

**Modify:**
- `apps/poeticalbot/package.json` — add `"tumblr-poster": "workspace:*"`
- `apps/poeticalbot/build-lambda.sh` — bundle `tumblr-poster` into the Lambda zip (no layer)
- `apps/poeticalbot/src/lib/tumblr-client.js` — `postPoem` delegates to `postWithClient`; drop now-unused `validateNPF` import (its own inline check is superseded by the lib's)
- `apps/poeticalbot/test/tumblr-client.tests.js` — add a regression test for `postPoem`'s success/error shape (this path currently has no test exercising the actual `createPost` call — see Task 5)

**Not touched (explicitly out of scope, see spec):**
- `apps/poeticalbot/src/lib/npf-formatter.js` — `convertPoemToNPF` stays here; it converts poeticalbot's app-specific `Poem` object, not a generic Tumblr concern. Its own `validateNPF` copy is left alone too — `apps/poeticalbot/src/index.js` and `test/npf-formatting.tests.js` still depend on it directly, and touching that file isn't part of this extraction.
- `apps/poeticalbot/src/lib/tumblr-client.js`'s `getBlogInfo`/`getRecentPosts`/`deletePost`/`validateCredentials`/`testConnection`/`getStatus` — stay put per the spec's decision #5. Nothing needs them shared yet.
- listmania — needs its own NPF adapter before it can call this lib at all (content format is NPF-only); filed as a follow-up bead in Task 6, not implemented here.

---

## Task 1: Scaffold `libs/tumblr-poster` package

**Files:**
- Create: `libs/tumblr-poster/package.json`
- Create: `libs/tumblr-poster/project.json`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "tumblr-poster",
  "version": "0.1.0",
  "description": "Shared Tumblr NPF-posting lib for poeticalbot/listmania",
  "main": "index.js",
  "scripts": {
    "test": "mocha test/"
  },
  "dependencies": {
    "tumblr.js": "^5.0.0"
  },
  "devDependencies": {
    "chai": "^4.2.0",
    "mocha": "^6.1.4"
  },
  "engines": {
    "node": "^22.16.0"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Write `project.json`**

```json
{
  "name": "tumblr-poster",
  "sourceRoot": "libs/tumblr-poster",
  "projectType": "library",
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "echo 'Build complete - tumblr-poster is ready'",
        "cwd": "libs/tumblr-poster"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npm test",
        "cwd": "libs/tumblr-poster"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "prettier --check \"**/*.js\" --ignore-path ../../.prettierignore",
        "cwd": "libs/tumblr-poster"
      }
    }
  }
}
```

- [ ] **Step 3: Install to link the workspace package**

Run: `pnpm install` (from repo root)
Expected: `tumblr-poster` appears as a linked workspace package, no errors.

- [ ] **Step 4: Commit**

```bash
git add libs/tumblr-poster/package.json libs/tumblr-poster/project.json pnpm-lock.yaml
git commit -m "chore(tumblr-poster): scaffold new workspace lib"
```

---

## Task 2: `validateNPF`

**Files:**
- Create: `libs/tumblr-poster/index.js`
- Test: `libs/tumblr-poster/test/tumblr-poster.tests.js`

- [ ] **Step 1: Write the failing test**

```js
'use strict'

const chai = require('chai')
const expect = chai.expect
const tumblrPoster = require('../index')

describe('tumblr-poster', () => {
  describe('validateNPF', () => {
    it('accepts a post with at least one text content block', () => {
      const npfPost = { content: [{ type: 'text', text: 'hello' }] }
      expect(tumblrPoster.validateNPF(npfPost)).to.equal(true)
    })

    it('rejects a post with no content blocks', () => {
      const npfPost = { content: [] }
      expect(tumblrPoster.validateNPF(npfPost)).to.equal(false)
    })

    it('rejects a post missing the content field entirely', () => {
      expect(tumblrPoster.validateNPF({})).to.equal(false)
    })

    it('rejects a text block with no text', () => {
      const npfPost = { content: [{ type: 'text' }] }
      expect(tumblrPoster.validateNPF(npfPost)).to.equal(false)
    })

    it('rejects formatting with non-numeric start/end', () => {
      const npfPost = {
        content: [
          {
            type: 'text',
            text: 'hi',
            formatting: [{ start: '0', end: 2, type: 'bold' }]
          }
        ]
      }
      expect(tumblrPoster.validateNPF(npfPost)).to.equal(false)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd libs/tumblr-poster && npx mocha test/`
Expected: FAIL — `Cannot find module '../index'`

- [ ] **Step 3: Write minimal implementation**

```js
'use strict'

function validateNPF(npfPost) {
  if (
    !npfPost.content ||
    !Array.isArray(npfPost.content) ||
    npfPost.content.length === 0
  ) {
    return false
  }

  for (const block of npfPost.content) {
    if (!block.type) {
      return false
    }

    if (block.type === 'text' && !block.text) {
      return false
    }

    if (block.formatting) {
      for (const format of block.formatting) {
        if (
          typeof format.start !== 'number' ||
          typeof format.end !== 'number'
        ) {
          return false
        }
      }
    }
  }

  return true
}

module.exports = {
  validateNPF
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd libs/tumblr-poster && npx mocha test/`
Expected: PASS (5 passing)

- [ ] **Step 5: Commit**

```bash
git add libs/tumblr-poster/index.js libs/tumblr-poster/test/tumblr-poster.tests.js
git commit -m "feat(tumblr-poster): add validateNPF"
```

---

## Task 3: `postWithClient`

**Files:**
- Modify: `libs/tumblr-poster/index.js`
- Modify: `libs/tumblr-poster/test/tumblr-poster.tests.js`

A `postWithClient(client, blogName, content, options)` that takes an already-constructed `tumblr.js` client (so it's unit-testable with a fake, no network mocking library needed) and does the validate → post → shape-the-result work.

- [ ] **Step 1: Write the failing tests**

Add to `libs/tumblr-poster/test/tumblr-poster.tests.js`, inside the top-level `describe('tumblr-poster', ...)`:

```js
  describe('postWithClient', () => {
    const fakeClient = (impl) => ({
      createPost: async (blogName, npfPost) => impl(blogName, npfPost)
    })

    it('returns success shape on a successful post', async () => {
      const client = fakeClient(async () => ({ id: 123 }))
      const result = await tumblrPoster.postWithClient(
        client,
        'testblog.tumblr.com',
        [{ type: 'text', text: 'hi' }]
      )
      expect(result).to.deep.equal({
        success: true,
        postId: 123,
        url: 'https://testblog.tumblr.com/post/123',
        error: null
      })
    })

    it('rejects invalid content without calling the client', async () => {
      let called = false
      const client = fakeClient(() => {
        called = true
        return { id: 1 }
      })
      const result = await tumblrPoster.postWithClient(client, 'testblog', [])
      expect(result.success).to.equal(false)
      expect(result.error).to.equal('Generated NPF structure is invalid')
      expect(called).to.equal(false)
    })

    it('returns failure shape when the client throws', async () => {
      const client = fakeClient(async () => {
        throw new Error('Tumblr API down')
      })
      const result = await tumblrPoster.postWithClient(
        client,
        'testblog',
        [{ type: 'text', text: 'hi' }]
      )
      expect(result).to.deep.equal({
        success: false,
        postId: null,
        url: null,
        error: 'Tumblr API down'
      })
    })

    it('passes tags and title through to the client call', async () => {
      let received
      const client = fakeClient(async (blogName, npfPost) => {
        received = npfPost
        return { id: 1 }
      })
      await tumblrPoster.postWithClient(
        client,
        'testblog',
        [{ type: 'text', text: 'hi' }],
        { tags: ['poetry', 'generative'], title: 'A Title' }
      )
      expect(received.tags).to.deep.equal(['poetry', 'generative'])
      expect(received.title).to.equal('A Title')
    })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd libs/tumblr-poster && npx mocha test/`
Expected: FAIL — `tumblrPoster.postWithClient is not a function`

- [ ] **Step 3: Implement `postWithClient`**

Replace `libs/tumblr-poster/index.js`'s bottom `module.exports` block, adding `postWithClient` above it:

```js
async function postWithClient(client, blogName, content, options = {}) {
  const npfPost = { content }
  if (options.tags) {
    npfPost.tags = options.tags
  }
  if (options.title) {
    npfPost.title = options.title
  }

  if (!validateNPF(npfPost)) {
    return {
      success: false,
      postId: null,
      url: null,
      error: 'Generated NPF structure is invalid'
    }
  }

  try {
    const response = await client.createPost(blogName, npfPost)
    return {
      success: true,
      postId: response.id,
      url: `https://${blogName}/post/${response.id}`,
      error: null
    }
  } catch (error) {
    return {
      success: false,
      postId: null,
      url: null,
      error: error.message
    }
  }
}

module.exports = {
  validateNPF,
  postWithClient
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd libs/tumblr-poster && npx mocha test/`
Expected: PASS (9 passing)

- [ ] **Step 5: Commit**

```bash
git add libs/tumblr-poster/index.js libs/tumblr-poster/test/tumblr-poster.tests.js
git commit -m "feat(tumblr-poster): add postWithClient"
```

---

## Task 4: `createClient` and `postToTumblr`

**Files:**
- Modify: `libs/tumblr-poster/index.js`
- Modify: `libs/tumblr-poster/test/tumblr-poster.tests.js`

`createClient(credentials)` wraps `tumblr.js`'s `createClient` (pure construction, no network call — confirmed safe to test with fake credentials by poeticalbot's existing `tumblr-client.tests.js:75-84`, which does the same thing). `postToTumblr` composes `createClient` + `postWithClient` and is the lib's main documented entry point.

- [ ] **Step 1: Write the failing tests**

Add to the test file:

```js
  describe('createClient', () => {
    it('builds a tumblr.js client from credentials without making a network call', () => {
      const client = tumblrPoster.createClient({
        consumerKey: 'test_key',
        consumerSecret: 'test_secret',
        accessToken: 'test_token',
        accessSecret: 'test_token_secret'
      })
      expect(client.createPost).to.be.a('function')
    })
  })

  describe('postToTumblr', () => {
    it('composes createClient and postWithClient', async () => {
      const originalCreateClient = tumblrPoster.createClient
      tumblrPoster.createClient = () => ({
        createPost: async () => ({ id: 999 })
      })

      try {
        const result = await tumblrPoster.postToTumblr(
          {
            consumerKey: 'k',
            consumerSecret: 's',
            accessToken: 't',
            accessSecret: 'ts'
          },
          'testblog.tumblr.com',
          [{ type: 'text', text: 'hi' }]
        )
        expect(result.success).to.equal(true)
        expect(result.postId).to.equal(999)
      } finally {
        tumblrPoster.createClient = originalCreateClient
      }
    })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd libs/tumblr-poster && npx mocha test/`
Expected: FAIL — `tumblrPoster.createClient is not a function`

- [ ] **Step 3: Implement `createClient` and `postToTumblr`**

Update `libs/tumblr-poster/index.js`:

```js
'use strict'

const tumblr = require('tumblr.js')

function validateNPF(npfPost) {
  // ... unchanged from Task 2
}

function createClient(credentials) {
  return tumblr.createClient({
    consumer_key: credentials.consumerKey,
    consumer_secret: credentials.consumerSecret,
    token: credentials.accessToken,
    token_secret: credentials.accessSecret
  })
}

async function postWithClient(client, blogName, content, options = {}) {
  // ... unchanged from Task 3
}

async function postToTumblr(credentials, blogName, content, options = {}) {
  const client = module.exports.createClient(credentials)
  return module.exports.postWithClient(client, blogName, content, options)
}

module.exports = {
  validateNPF,
  createClient,
  postWithClient,
  postToTumblr
}
```

Note the `module.exports.createClient(...)` / `module.exports.postWithClient(...)` calls inside `postToTumblr` — not bare `createClient(...)`. This is deliberate: it's what lets the test in Step 1 monkeypatch `tumblrPoster.createClient` and have `postToTumblr` actually pick up the replacement at call time (a bare local-function reference would ignore the monkeypatch, since Node's `exports`/`module.exports` split means reassigning the module-level `module.exports` object doesn't retarget already-declared local function bindings).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd libs/tumblr-poster && npx mocha test/`
Expected: PASS (11 passing)

- [ ] **Step 5: Commit**

```bash
git add libs/tumblr-poster/index.js libs/tumblr-poster/test/tumblr-poster.tests.js
git commit -m "feat(tumblr-poster): add createClient and postToTumblr"
```

---

## Task 5: Wire poeticalbot to the lib

**Files:**
- Modify: `apps/poeticalbot/package.json`
- Modify: `apps/poeticalbot/src/lib/tumblr-client.js`
- Modify: `apps/poeticalbot/test/tumblr-client.tests.js`

- [ ] **Step 1: Add the dependency**

In `apps/poeticalbot/package.json`, add to `"dependencies"` (alphabetical, next to `"tumblr.js"`):

```json
    "tumblr-poster": "workspace:*",
```

Run: `pnpm install` (from repo root)
Expected: no errors, `tumblr-poster` linked into `apps/poeticalbot/node_modules`.

- [ ] **Step 2: Write a regression test locking in `postPoem`'s current behavior**

`postPoem` currently has no test exercising an actual `createPost` call (existing `tumblr-client.tests.js` only checks instantiation and method presence — see lines 74-91). Add this test to `apps/poeticalbot/test/tumblr-client.tests.js`, inside the existing `describe('Real Tumblr Client (with mocking)', ...)` block:

```js
    it('postPoem returns success shape on a successful post', async () => {
      const client = new TumblrClient({
        consumerKey: 'k',
        consumerSecret: 's',
        accessToken: 't',
        accessSecret: 'ts'
      })
      client.client = {
        createPost: async () => ({ id: 42 })
      }
      client.initialized = true

      const result = await client.postPoem(
        { title: 'A Poem', text: 'line one' },
        'testblog.tumblr.com'
      )

      expect(result.success).to.equal(true)
      expect(result.postId).to.equal(42)
      expect(result.url).to.equal('https://testblog.tumblr.com/post/42')
      expect(result.npfPost).to.be.an('object')
      expect(result.error).to.equal(null)
    })

    it('postPoem returns failure shape when the client throws', async () => {
      const client = new TumblrClient({
        consumerKey: 'k',
        consumerSecret: 's',
        accessToken: 't',
        accessSecret: 'ts'
      })
      client.client = {
        createPost: async () => {
          throw new Error('Tumblr API down')
        }
      }
      client.initialized = true

      const result = await client.postPoem(
        { title: 'A Poem', text: 'line one' },
        'testblog.tumblr.com'
      )

      expect(result.success).to.equal(false)
      expect(result.postId).to.equal(null)
      expect(result.npfPost).to.equal(null)
      expect(result.error).to.equal('Tumblr API down')
    })
```

- [ ] **Step 3: Run test to verify it currently passes (baseline)**

Run: `cd apps/poeticalbot && npx mocha --timeout 50000 test/tumblr-client.tests.js`
Expected: PASS — both new tests pass against the *current* `postPoem` implementation. This confirms the tests correctly characterize existing behavior before the refactor.

- [ ] **Step 4: Refactor `postPoem` to delegate to the lib**

In `apps/poeticalbot/src/lib/tumblr-client.js`:

Change the import at the top of the file (line 6):

```js
const { convertPoemToNPF } = require('./npf-formatter')
const { postWithClient } = require('tumblr-poster')
```

Replace the `postPoem` method (lines 89-120):

```js
  /**
   * Post a poem to Tumblr using NPF format
   * @param {object} poem - Poem object to post
   * @param {string} blogName - Target blog name (e.g., 'poeticalbot.tumblr.com')
   * @returns {Promise<object>} Posting result
   */
  async postPoem(poem, blogName) {
    this.initialize()

    const npfPost = convertPoemToNPF(poem)
    const options = {}
    if (npfPost.tags) {
      options.tags = npfPost.tags
    }

    const result = await postWithClient(
      this.client,
      blogName,
      npfPost.content,
      options
    )

    return {
      success: result.success,
      postId: result.postId,
      url: result.url,
      npfPost: result.success ? npfPost : null,
      error: result.error
    }
  }
```

- [ ] **Step 5: Run the tests to verify the refactor preserved behavior**

Run: `cd apps/poeticalbot && npx mocha --timeout 50000 test/tumblr-client.tests.js`
Expected: PASS — same tests, now exercising the lib-delegating implementation.

- [ ] **Step 6: Run the full poeticalbot suite**

Run: `nx test poeticalbot` (from repo root)
Expected: PASS, all tests (286+ from the pre-change baseline, plus the 2 added here).

- [ ] **Step 7: Commit**

```bash
git add apps/poeticalbot/package.json apps/poeticalbot/src/lib/tumblr-client.js apps/poeticalbot/test/tumblr-client.tests.js pnpm-lock.yaml
git commit -m "feat(poeticalbot): delegate postPoem to tumblr-poster lib"
```

---

## Task 6: Bundle the lib into the Lambda zip (no layer)

**Files:**
- Modify: `apps/poeticalbot/build-lambda.sh`

`generate-lambda-package-json.js` already strips any `"workspace:*"` dependency from the generated Lambda `package.json` (it assumes those ship via a layer — see its own comment). `tumblr-poster` isn't going through a layer, so after that strip happens, the zip needs the lib's two files copied in directly, the same way `src/*` already is.

- [ ] **Step 1: Add the bundling step**

In `apps/poeticalbot/build-lambda.sh`, after the `npm install --production --silent` line and before the `# Create deployment package` comment, insert:

```bash
# Bundle tumblr-poster directly into node_modules - no Lambda layer.
# Unlike common-corpus (~75MB of corpus text, which is why *that* one
# needs a layer), this lib is a couple hundred lines with no bulk payload,
# so a layer would only add AWS infra ceremony for no size benefit.
echo "Bundling tumblr-poster..."
mkdir -p node_modules/tumblr-poster
cp "$SCRIPT_DIR/../../libs/tumblr-poster/package.json" \
   "$SCRIPT_DIR/../../libs/tumblr-poster/index.js" \
   node_modules/tumblr-poster/
```

The full sequence around it should read:

```bash
# Install production dependencies
echo "Installing production dependencies..."
cd $BUILD_DIR
npm install --production --silent

# Bundle tumblr-poster directly into node_modules - no Lambda layer.
# Unlike common-corpus (~75MB of corpus text, which is why *that* one
# needs a layer), this lib is a couple hundred lines with no bulk payload,
# so a layer would only add AWS infra ceremony for no size benefit.
echo "Bundling tumblr-poster..."
mkdir -p node_modules/tumblr-poster
cp "$SCRIPT_DIR/../../libs/tumblr-poster/package.json" \
   "$SCRIPT_DIR/../../libs/tumblr-poster/index.js" \
   node_modules/tumblr-poster/

# Create deployment package
echo "Creating deployment package..."
zip -r ../terraform/poeticalbot-lambda.zip . -x "node_modules/.cache/*" "*.test.js" "test/*" > /dev/null
```

- [ ] **Step 2: Build the zip and verify the lib is present**

Run: `cd apps/poeticalbot && ./build-lambda.sh`
Expected: `✓ Lambda package created: terraform/poeticalbot-lambda.zip (...)`

Run: `unzip -l apps/poeticalbot/terraform/poeticalbot-lambda.zip | grep tumblr-poster`
Expected: both `node_modules/tumblr-poster/package.json` and `node_modules/tumblr-poster/index.js` listed.

- [ ] **Step 3: Sanity-check the bundled module actually loads**

Run:
```bash
cd apps/poeticalbot
mkdir -p /tmp/lambda-check && cd /tmp/lambda-check
unzip -oq /Users/michaelpaulukonis/projects/textgen-monorepo/apps/poeticalbot/terraform/poeticalbot-lambda.zip
node -e "const p = require('./node_modules/tumblr-poster'); console.log(typeof p.postToTumblr)"
```
Expected: `function`

Clean up: `rm -rf /tmp/lambda-check`

- [ ] **Step 4: Commit**

```bash
git add apps/poeticalbot/build-lambda.sh
git commit -m "build(poeticalbot): bundle tumblr-poster into Lambda zip"
```

**Note:** This task builds and inspects the zip locally only — it does not deploy. Deploying (`nx run poeticalbot:deploy`) is a separate, explicit action outside this plan; it pushes to live AWS infrastructure and should be a deliberate step the user takes, not something bundled into plan execution.

---

## Task 7: File the listmania follow-up bead

listmania can't call this lib yet — the lib is NPF-only (spec decision #3), and listmania currently posts via the legacy `createTextPost` API with plain `{title, body}`. It needs its own adapter first. That adapter is out of scope here (spec: "listmania's responsibility, not the lib's").

- [ ] **Step 1: File the bead**

Run:
```bash
bd create \
  --title="listmania: add NPF adapter and switch to tumblr-poster lib" \
  --description="listmania currently posts via the legacy (deprecated) Tumblr createTextPost API with {title, body} (apps/listmania/lambda/index.js). tumblr-poster (tg-1) only accepts NPF content blocks. Write a small adapter converting listmania's printable list text into one NPF text block, then switch listmania to call postToTumblr from tumblr-poster instead of its own client.createTextPost call." \
  --type=task \
  --priority=2
bd dep add <new-id> tg-1
```

(`tg-1` must be closed/merged first — the lib has to exist before listmania can depend on it.)

- [ ] **Step 2: No commit** — this task is tracking-only, no code changes.

---

## Self-Review Notes

- **Spec coverage:** Lib contract (postToTumblr signature, credentials/blogName/content/options shape, {success,postId,url,error} return) — Tasks 2-4. NPF-only — Task 2/3 (`validateNPF`, `postWithClient` reject non-NPF). No new auth — nothing added; credentials flow straight through as a parameter, never stored. Packaging (workspace dep + Lambda bundling, corrected from "layer" to "direct bundle" per the tg-1 acceptance-criteria fix) — Tasks 1, 5, 6. Posting-only extraction, other `TumblrClient` methods untouched — File Structure section, not touched anywhere. listmania adapter as follow-up — Task 7.
- **Placeholder scan:** No TBD/TODO; every code step has complete code; no "similar to Task N" shortcuts — Task 5's tests and Task 4's tests both spell out full assertions even though the pattern repeats.
- **Type consistency:** `{success, postId, url, error}` shape used identically in `postWithClient` (Task 3), `postToTumblr` (Task 4, inherits it), and `postPoem`'s return (Task 5) — checked, matches throughout. `credentials` shape (`consumerKey`/`consumerSecret`/`accessToken`/`accessSecret`) used identically in `createClient` (Task 4) and `TumblrClient`'s existing constructor/`fromConfig` (unchanged, already matches) — checked.
