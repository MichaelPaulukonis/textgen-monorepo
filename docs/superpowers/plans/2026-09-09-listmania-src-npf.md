# listmania src/ layout + NPF posting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move listmania's code into a single `src/` tree (matching poeticalbot's layout) and switch its Tumblr posting from the legacy `createTextPost` HTML-body API to `tumblr-poster`'s NPF-based `postToTumblr`, closing textgen-monorepo-hp5 and textgen-monorepo-9if.

**Architecture:** Task 1 does the pure mechanical move (root `index.js`/`config.js`/`lambda/`/`lib/` -> `src/`) with zero behavior change, so the suite stays green on old posting logic as a checkpoint. Tasks 2-4 layer the NPF adapter and `tumblr-poster` swap on top. Task 5 fixes the build/deploy wiring (`build-lambda.sh`, `terraform/main.tf`) now that the Lambda zip root layout changed. Task 6 is final verification.

**Tech Stack:** Node (CommonJS), mocha + chai + dirty-chai, `tumblr-poster` (workspace lib), pnpm workspaces, Nx.

**Spec:** `docs/superpowers/specs/2026-09-09-listmania-src-npf-design.md`

---

## Task 1: Move to `src/` layout (mechanical, no behavior change)

**Files:**

- Move: `apps/listmania/index.js` -> `apps/listmania/src/cli.js`
- Move: `apps/listmania/config.js` -> `apps/listmania/src/config.js`
- Move: `apps/listmania/lambda/index.js` -> `apps/listmania/src/lambda-handler.js`
- Move: `apps/listmania/lib/*.js` -> `apps/listmania/src/lib/*.js`
- Modify: `apps/listmania/src/config.js`, `apps/listmania/src/lambda-handler.js`, `apps/listmania/package.json`, `apps/listmania/project.json`, `apps/listmania/test/index.tests.js`, `apps/listmania/test/cli-params.tests.js`, `apps/listmania/test/lambda-deployment.tests.js`

- [ ] **Step 1: Move the files with git mv**

```bash
cd apps/listmania
mkdir -p src
git mv index.js src/cli.js
git mv config.js src/config.js
git mv lib src/lib
git mv lambda/index.js src/lambda-handler.js
```

- [ ] **Step 2: Fix `src/config.js`'s `.env` path**

`config.js` used `path.join(__dirname, '.env')` when it lived at the app root; `__dirname` is now `apps/listmania/src`, one level below the `.env` file, so it must go up one level:

```js
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }) // read .env file IF IT EXISTS - which only s/b DEV

const config = {
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
  accessToken: process.env.TOKEN,
  accessSecret: process.env.TOKEN_SECRET,

  postLive: (process.env.POST_LIVE || '').toLowerCase() === 'true'
}

module.exports = config
```

- [ ] **Step 3: Fix `src/lambda-handler.js`'s relative requires**

It used to live in `lambda/`, one level below the app root, so it reached `config.js` and `lib/` via `../`. It's now a sibling of `config.js` and `lib/` inside `src/`, so those become `./`. Change the top of the file (everything else in the file is unchanged for this task):

```js
const config = require('./config.js')

class LambdaHandler {
  constructor() {
    this.config = config
    this.listifier = new (require('./lib/listify'))()
    this.util = require('./lib/util.js')({ statusVerbosity: 0 })
    this.tumblr = require('tumblr.js')
    this.client = this.tumblr.createClient({
      consumer_key: this.config.consumerKey,
      consumer_secret: this.config.consumerSecret,
      token: this.config.accessToken,
      token_secret: this.config.accessSecret
    })
  }
```

And further down in `generateList`, change `require('../lib/prep')` to `require('./lib/prep')`.

- [ ] **Step 4: Update `package.json` entry points**

In `apps/listmania/package.json`:

```json
  "main": "src/cli.js",
  "scripts": {
    "start": "node src/cli.js",
```

(leave every other script line as-is)

- [ ] **Step 5: Update `project.json`'s `lambda:test` target**

In `apps/listmania/project.json`, change:

```json
    "lambda:test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "node lambda/test-handler.js",
        "cwd": "apps/listmania"
      }
    }
```

to:

```json
    "lambda:test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "node scripts/test-handler.js",
        "cwd": "apps/listmania"
      }
    }
```

(this target will fail to run until Task 2 moves `test-handler.js` into `scripts/` - that's fine, it's not part of `nx test`)

- [ ] **Step 6: Update the CLI-invocation tests' paths**

In `apps/listmania/test/index.tests.js`, change the `execSync` call:

```js
  it('never prints the configured Tumblr credentials to stdout', function () {
    const result = execSync('node src/cli.js', {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      env: Object.assign({}, process.env, fakeSecrets)
    })
```

In `apps/listmania/test/cli-params.tests.js`, change the `run` helper:

```js
  const run = (args) =>
    JSON.parse(
      execSync(`node src/cli.js ${args}`, {
        encoding: 'utf8',
        cwd: path.join(__dirname, '..'),
        env: Object.assign({}, process.env, fakeEnv)
      })
    )
```

- [ ] **Step 7: Update `lambda-deployment.tests.js`'s require paths**

In `apps/listmania/test/lambda-deployment.tests.js`, there are three occurrences of `require('../lambda/index.js')` and one `path.join(__dirname, '../lambda/index.js')`. Change all four to point at the new location:

```js
    it('Lambda handler file should exist', function () {
      const handlerPath = path.join(__dirname, '../src/lambda-handler.js')
      expect(fs.existsSync(handlerPath)).to.be.true()
    })

    it('Lambda handler should export handler function', function () {
      const handler = require('../src/lambda-handler.js')
      expect(handler).to.have.property('handler')
      expect(handler.handler).to.be.a('function')
    })

    it('Lambda handler should export LambdaHandler class', function () {
      const handler = require('../src/lambda-handler.js')
      expect(handler).to.have.property('LambdaHandler')
      expect(handler.LambdaHandler).to.be.a('function')
    })
```

and in the `before()` hook further down:

```js
    before(function () {
      // Set up test environment variables
      process.env.CONSUMER_KEY = 'test-key'
      process.env.CONSUMER_SECRET = 'test-secret'
      process.env.TOKEN = 'test-TOKEN'
      process.env.TOKEN_SECRET = 'test-TOKEN-secret'
      process.env.POST_LIVE = 'false'

      const handler = require('../src/lambda-handler.js')
      LambdaHandler = handler.LambdaHandler
    })
```

- [ ] **Step 8: Run the full test suite to confirm the move didn't break anything**

```bash
cd apps/listmania && npx mocha --timeout 50000 ./test/*.tests.js
```

Expected: all tests pass (same count as before the move - this task changes zero behavior, only locations).

- [ ] **Step 9: Commit**

```bash
git add -A apps/listmania
git commit -m "$(cat <<'EOF'
refactor(listmania): move to src/ layout (textgen-monorepo-9if)

Mechanical move only - root index.js/config.js/lambda/index.js/lib/
consolidate into src/, matching poeticalbot's convention. No behavior
change; posting still goes through the legacy tumblr.js createTextPost
call (that swap is textgen-monorepo-hp5, next).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016BFKzByMtKTdtV1ep2uVo5
EOF
)"
```

---

## Task 2: Move the manual/dev-only scripts and docs out of `lambda/`

**Files:**

- Move: `apps/listmania/lambda/test-handler.js` -> `apps/listmania/scripts/test-handler.js`
- Move: `apps/listmania/lambda/example-invocations.json` -> `apps/listmania/scripts/example-invocations.json`
- Move: `apps/listmania/test-integration.js` -> `apps/listmania/scripts/test-integration.js`
- Move: `apps/listmania/lambda/README.md` -> `apps/listmania/docs/LAMBDA-HANDLER.md`
- Delete: `apps/listmania/lambda/IMPLEMENTATION.md`
- Delete: `apps/listmania/lambda/` (now empty)
- Modify: `apps/listmania/scripts/test-handler.js`, `apps/listmania/scripts/test-integration.js`

- [ ] **Step 1: Move the files**

```bash
cd apps/listmania
mkdir -p scripts
git mv lambda/test-handler.js scripts/test-handler.js
git mv lambda/example-invocations.json scripts/example-invocations.json
git mv test-integration.js scripts/test-integration.js
git mv lambda/README.md docs/LAMBDA-HANDLER.md
git rm lambda/IMPLEMENTATION.md
rmdir lambda
```

- [ ] **Step 2: Fix `scripts/test-handler.js`'s require path**

It required the handler as `require('./index.js')` (sibling in the old `lambda/` dir). The class it needs now lives at `../src/lambda-handler.js`:

```js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const { LambdaHandler } = require('../src/lambda-handler.js')
```

(the `.env` path was already `../.env` and needs no change - `scripts/` sits at the same depth `lambda/` did)

- [ ] **Step 3: Fix `scripts/test-integration.js`'s paths**

It lived at the app root before, so its `.env` path and its handler require both need a `../`/`../src/` prefix now that it's one level down in `scripts/`. It also checked `handler.client` (the raw `tumblr.js` client), which will stop existing once Task 4 removes it from `LambdaHandler` - drop that check now so this file doesn't reference a property we're about to delete:

```js
/**
 * Quick integration test to verify Lambda handler and common-corpus integration
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

console.log('Testing Listmania Lambda Integration...\n')

try {
  // Test 1: Load Lambda handler
  console.log('1. Loading Lambda handler...')
  const { LambdaHandler } = require('../src/lambda-handler.js')
  console.log('   ✅ Lambda handler loaded successfully')

  // Test 2: Instantiate handler
  console.log('\n2. Instantiating handler...')
  const handler = new LambdaHandler()
  console.log('   ✅ Handler instantiated successfully')

  // Test 3: Verify config
  console.log('\n3. Verifying configuration...')
  console.log('   Config loaded:', !!handler.config)
  console.log('   Listifier loaded:', !!handler.listifier)
  console.log('   ✅ Configuration verified')

  // Test 4: Test common-corpus integration
  console.log('\n4. Testing common-corpus integration...')
  const Corpora = require('common-corpus')
  const corpora = new Corpora()
  console.log('   ✅ common-corpus loaded from workspace')
  console.log('   Available texts:', corpora.texts.length)

  // Test 5: Test getText method
  console.log('\n5. Testing getText method...')
  const textObj = handler.getText()
  console.log('   ✅ getText() successful')
  console.log('   Source:', textObj.source)
  console.log('   Text length:', textObj.text.length)

  console.log('\n✅ All integration tests passed!')
  console.log('\nListmania is properly integrated with:')
  console.log('  - Lambda handler wrapper')
  console.log('  - Workspace common-corpus dependency')
  console.log('  - Nx build system')

  process.exit(0)
} catch (error) {
  console.error('\n❌ Integration test failed!')
  console.error('Error:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}
```

- [ ] **Step 4: Run the mocha suite again to confirm nothing references the removed files**

```bash
cd apps/listmania && npx mocha --timeout 50000 ./test/*.tests.js
```

Expected: same pass count as Task 1's Step 8 (these are dev scripts, not part of the mocha suite, so this should be unaffected - this step is just a safety check for stray requires).

- [ ] **Step 5: Commit**

```bash
git add -A apps/listmania
git commit -m "$(cat <<'EOF'
refactor(listmania): move manual dev scripts/docs out of lambda/

test-handler.js, example-invocations.json, test-integration.js are
manual invoke/smoke-test harnesses not wired into any npm/nx target -
moved to scripts/. lambda/README.md moved to docs/LAMBDA-HANDLER.md.
lambda/IMPLEMENTATION.md dropped (stale one-off completion log).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016BFKzByMtKTdtV1ep2uVo5
EOF
)"
```

---

## Task 3: NPF adapter (TDD)

**Files:**

- Create: `apps/listmania/src/lib/npf-adapter.js`
- Test: `apps/listmania/test/npf-adapter.tests.js`

- [ ] **Step 1: Write the failing tests**

```js
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)
const { expect } = chai

const { toNPFContent } = require('../src/lib/npf-adapter')

describe('npf-adapter', function () {
  const sampleList = {
    list: ['apple', 'banana', 'cherry'],
    metadata: {
      source: 'test-corpus',
      strategy: 'match: #Noun',
      title: 'Three Fruits',
      length: 3
    }
  }

  it('starts with a bold heading2 title block', function () {
    const content = toNPFContent(sampleList)
    const titleBlock = content[0]

    expect(titleBlock.type).to.equal('text')
    expect(titleBlock.subtype).to.equal('heading2')
    expect(titleBlock.text).to.equal('Three Fruits')
    expect(titleBlock.formatting).to.deep.equal([
      { start: 0, end: 'Three Fruits'.length, type: 'bold' }
    ])
  })

  it('emits one list-item block per list entry, in order', function () {
    const content = toNPFContent(sampleList)
    const itemBlocks = content.slice(1)

    expect(itemBlocks).to.have.lengthOf(3)
    expect(itemBlocks.map((b) => b.text)).to.deep.equal([
      'apple',
      'banana',
      'cherry'
    ])
  })

  it('uses the same list-item subtype for every item in a post', function () {
    const content = toNPFContent(sampleList)
    const itemBlocks = content.slice(1)
    const subtypes = new Set(itemBlocks.map((b) => b.subtype))

    expect(subtypes.size).to.equal(1)
    expect(['numbered-list-item', 'unordered-list-item']).to.include(
      [...subtypes][0]
    )
  })

  it('marks every item block as type text', function () {
    const content = toNPFContent(sampleList)
    content.slice(1).forEach((block) => {
      expect(block.type).to.equal('text')
    })
  })

  it('includes no metadata block', function () {
    const content = toNPFContent(sampleList)

    expect(content).to.have.lengthOf(sampleList.list.length + 1)
    content.forEach((block) => {
      expect(block.text).to.not.include('test-corpus')
      expect(block.text).to.not.include('match: #Noun')
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd apps/listmania && npx mocha ./test/npf-adapter.tests.js
```

Expected: FAIL - `Cannot find module '../src/lib/npf-adapter'`

- [ ] **Step 3: Write the implementation**

```js
'use strict'

function toNPFContent(list) {
  const titleBlock = {
    type: 'text',
    subtype: 'heading2',
    text: list.metadata.title,
    formatting: [
      { start: 0, end: list.metadata.title.length, type: 'bold' }
    ]
  }

  const subtype =
    Math.random() < 0.5 ? 'numbered-list-item' : 'unordered-list-item'

  const itemBlocks = list.list.map((item) => ({
    type: 'text',
    subtype,
    text: item
  }))

  return [titleBlock, ...itemBlocks]
}

module.exports = { toNPFContent }
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd apps/listmania && npx mocha ./test/npf-adapter.tests.js
```

Expected: PASS (5 passing)

- [ ] **Step 5: Run the full mocha suite to confirm no regressions**

```bash
cd apps/listmania && npx mocha --timeout 50000 ./test/*.tests.js
```

Expected: all tests pass, count increased by 5 versus Task 2's Step 4.

- [ ] **Step 6: Commit**

```bash
git add apps/listmania/src/lib/npf-adapter.js apps/listmania/test/npf-adapter.tests.js
git commit -m "$(cat <<'EOF'
feat(listmania): add NPF content adapter (textgen-monorepo-hp5)

Converts a list's title + items into Tumblr NPF content blocks: a
bold heading2 title block, then one text block per item using a
native numbered-list-item or unordered-list-item subtype (picked
once per post). Not yet wired into posting - next task.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016BFKzByMtKTdtV1ep2uVo5
EOF
)"
```

---

## Task 4: Swap posting to `tumblr-poster`

**Files:**

- Modify: `apps/listmania/package.json`
- Modify: `apps/listmania/src/cli.js`
- Modify: `apps/listmania/src/lambda-handler.js`
- Delete: `apps/listmania/src/lib/prep.js`

- [ ] **Step 1: Add the `tumblr-poster` dependency**

In `apps/listmania/package.json`, add to `dependencies` (keep `tumblr.js` as-is - unused directly after this task but poeticalbot keeps it too, see `textgen-monorepo-xze` for the out-of-scope cleanup note):

```json
    "commander": "^7.0.0",
    "common-corpus": "workspace:*",
    "compromise": "^14.16.0",
    "corpora-project": "^0.2.0",
    "dotenv": "^8.2.0",
    "fuzzy-matching": "0.4.3",
    "random-seed": "0.3.0",
    "tumblr-poster": "workspace:*",
    "tumblr.js": "^3.0.0"
```

then:

```bash
pnpm install
```

- [ ] **Step 2: Rewrite `src/cli.js`'s posting call**

Replace the whole file's top (client setup) and `teller` function:

```js
const listifier = new (require('./lib/listify'))()
const util = require('./lib/util.js')({ statusVerbosity: 0 })
const config = require('./config.js')
const { postToTumblr } = require('tumblr-poster')
const { toNPFContent } = require('./lib/npf-adapter')

const ALWAYS_PRINT = 0

const logger = function (msg) {
  util.debug(msg, ALWAYS_PRINT)
}
util.log = logger

const getText = function () {
  const Corpora = require('common-corpus')
  const corpora = new Corpora()
  const source = config.corporaFilter
    ? corpora.filter(config.corporaFilter)
    : corpora.texts
  const chars = 50000
  const textObj = util.pick(source)
  const text = textObj.text()
  const startPos = util.randomInRange(0, text.length - chars)
  const blob =
    text.length <= chars ? text : text.slice(startPos, startPos + chars)

  return {
    text: blob,
    source: textObj.name
  }
}

const teller = async function () {
  const text = getText(config.corporaFilter)
  let list = {}
  let attempt = 0

  while (attempt < 5) {
    attempt++
    list = listifier.getList({
      text,
      matchPattern: config.matchPattern,
      method: config.method
    })
    if (list.list && list.list.length > 0) {
      break
    }
  }

  if (list.list && list.list.length > 0) {
    if (config.postLive) {
      const result = await postToTumblr(
        config,
        'leanstooneside',
        toNPFContent(list)
      )
      if (result.error) {
        logger(result.error)
      }
    } else {
      logger(JSON.stringify(list, null, 2))
    }
  } else {
    console.log(`NO LIST FOR TEXT '${text.source}'`)
  }
}

const program = require('commander')
program
  .version('0.0.3')
  .option(
    '-c, --corporaFilter [string]',
    'filename substring filter (non-case sensitive)'
  )
  .option(
    '-p, --patternMatch [string]',
    'nlp-compromise matchPattern for list elements'
  )
  .option('-m, --method [string]', 'method-type (See index.js)')
  .parse(process.argv)

// commander@7 stopped exposing parsed flags as program.X properties by
// default (textgen-monorepo-tg-3) — must read them via .opts() now.
const opts = program.opts()

if (opts.corporaFilter) {
  config.corporaFilter = opts.corporaFilter
}

if (opts.patternMatch) {
  config.matchPattern = opts.patternMatch
}

if (opts.method) {
  config.method = opts.method
}

teller()
```

(`prepForPublish`/`prefixifiers` and the `require('./lib/prep')` import are gone - the NPF path replaces them, and the non-`postLive` debug branch now logs the raw list object instead of the old HTML-printable string, which is at least as useful for debugging)

- [ ] **Step 3: Rewrite `src/lambda-handler.js`'s constructor and `postList`**

Constructor drops the `tumblr` client:

```js
class LambdaHandler {
  constructor() {
    this.config = config
    this.listifier = new (require('./lib/listify'))()
    this.util = require('./lib/util.js')({ statusVerbosity: 0 })
  }
```

`generateList` drops the `prep`-based printable step (keep everything else in that method - text retrieval, retry loop, logging - unchanged):

```js
  async generateList(options = {}) {
    try {
      // Apply options to config
      const corporaFilter = options.corporaFilter || this.config.corporaFilter
      const matchPattern = options.matchPattern || this.config.matchPattern
      const method = options.method || this.config.method

      const text = this.getText(corporaFilter)
      let list = {}
      let attempt = 0

      // Try up to 5 times to generate a valid list
      while (attempt < 5) {
        attempt++
        list = this.listifier.getList({
          text,
          matchPattern,
          method
        })
        if (list.list && list.list.length > 0) {
          break
        }
      }

      if (list.list && list.list.length > 0) {
        this.log(
          `Generated list: "${list.metadata.title}" (${list.list.length} items)`
        )
        this.logListMetadata(list)

        return { list, error: null }
      } else {
        const errorMsg = `No list generated for text '${text.source}' after ${attempt} attempts`
        this.log(errorMsg)
        return { list: null, error: errorMsg }
      }
    } catch (error) {
      this.logError('List generation error', error)
      return { list: null, error: error.message }
    }
  }
```

`postList` switches to `tumblr-poster`. Its validity check used to guard on `list.printable`, which nothing sets anymore now that `generateList` no longer calls `prepForPublish` - the guard changes to check `list.list` instead:

```js
  async postList(list) {
    try {
      if (!list || !list.list || !list.metadata || !list.metadata.title) {
        return {
          success: false,
          postId: null,
          error: 'Invalid list object'
        }
      }

      const { postToTumblr } = require('tumblr-poster')
      const { toNPFContent } = require('./lib/npf-adapter')

      const result = await postToTumblr(
        this.config,
        'leanstooneside',
        toNPFContent(list)
      )

      if (result.success) {
        this.log(`Posted list successfully: ${result.postId}`)
      } else {
        this.logError('Tumblr posting error', new Error(result.error))
      }

      return {
        success: result.success,
        postId: result.postId,
        error: result.error
      }
    } catch (error) {
      this.logError('List posting error', error)
      return {
        success: false,
        postId: null,
        error: error.message
      }
    }
  }
```

- [ ] **Step 4: Delete the now-dead `prep.js`**

```bash
git rm apps/listmania/src/lib/prep.js
```

- [ ] **Step 5: Run the full mocha suite**

```bash
cd apps/listmania && npx mocha --timeout 50000 ./test/*.tests.js
```

Expected: all tests pass. `lambda-deployment.tests.js`'s `postList`/`generateList` method-existence checks still pass (method names unchanged); its `handle EventBridge scheduled events`/`handle direct invocation events` tests exercise the full `generateAndPostList` -> `postList` path with `POST_LIVE=false`, so they hit the `!config.postLive` branch and never actually call `tumblr-poster`.

- [ ] **Step 6: Manually verify posting is disabled by default and the CLI runs end-to-end**

```bash
cd apps/listmania && node src/cli.js
```

Expected: prints a JSON list object to stdout (no network call, since `.env`'s `POST_LIVE` isn't `true`), no stack traces.

- [ ] **Step 7: Commit**

```bash
git add -A apps/listmania
git commit -m "$(cat <<'EOF'
feat(listmania): post via tumblr-poster's NPF API (textgen-monorepo-hp5)

Replaces the legacy tumblr.js client.createTextPost({title, body})
call in both src/cli.js and src/lambda-handler.js with tumblr-poster's
postToTumblr, using the NPF adapter from the previous commit. Drops
LambdaHandler's constructor-built tumblr.js client (postToTumblr
builds its own) and the now-dead lib/prep.js HTML formatter.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016BFKzByMtKTdtV1ep2uVo5
EOF
)"
```

---

## Task 5: Fix build/deploy wiring for the new zip-root layout

**Files:**

- Modify: `apps/listmania/build-lambda.sh`
- Modify: `apps/listmania/terraform/main.tf`

- [ ] **Step 1: Rewrite `build-lambda.sh`'s copy step and entry file**

Current file copies `lambda/`, `lib/`, `config.js` as separate steps and uses `lambda/index.js` as the entry for `generate-lambda-package-json.js`. Replace those two things:

```bash
#!/bin/bash

# Build Lambda deployment package for listmania
# This script creates a zip file containing all necessary code and dependencies
# Usage: ./build-lambda.sh

set -e

echo "Building listmania Lambda deployment package..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Clean up any existing package
rm -f terraform/listmania-lambda.zip

# Create temporary build directory
BUILD_DIR="build-lambda"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

# Copy src files to build directory
echo "Copying source files..."
cp -r src/* $BUILD_DIR/

# Create Lambda-specific package.json (without workspace dependencies),
# derived from the real package.json so versions/engines can't drift (textgen-monorepo-213)
echo "Creating Lambda package.json..."
node "$SCRIPT_DIR/../../scripts/generate-lambda-package-json.js" package.json "$BUILD_DIR/package.json" lambda-handler.js

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
zip -r ../terraform/listmania-lambda.zip . -x "node_modules/.cache/*" "*.test.js" "test/*" > /dev/null

# Clean up build directory
cd ..
rm -rf $BUILD_DIR

# Get file size
SIZE=$(du -h terraform/listmania-lambda.zip | cut -f1)
echo "✓ Lambda package created: terraform/listmania-lambda.zip ($SIZE)"
echo "✓ Build complete!"
echo ""
echo "Next steps:"
echo "  - Review terraform plan: nx run listmania:deploy:plan"
echo "  - Deploy to AWS: nx run listmania:deploy"
```

- [ ] **Step 2: Update the terraform handler string**

In `apps/listmania/terraform/main.tf`, change:

```
handler         = "lambda/index.handler"
```

to:

```
handler         = "lambda-handler.handler"
```

- [ ] **Step 3: Build the zip and sanity-check its contents**

```bash
cd apps/listmania && ./build-lambda.sh
unzip -l terraform/listmania-lambda.zip | grep -E "lambda-handler.js|node_modules/tumblr-poster|node_modules/tumblr.js"
```

Expected: `lambda-handler.js` listed at the zip root (not under a `src/` or `lambda/` prefix), and both `node_modules/tumblr-poster/` and `node_modules/tumblr.js/` present.

- [ ] **Step 4: Load the zip's handler file the same way Lambda would, to confirm the entry point resolves**

```bash
cd apps/listmania/build-lambda 2>/dev/null || (mkdir -p /tmp/listmania-zip-check && cd /tmp/listmania-zip-check && unzip -o /Users/michaelpaulukonis/projects/textgen-monorepo/apps/listmania/terraform/listmania-lambda.zip -d . > /dev/null && node -e "const h = require('./lambda-handler.js'); console.log(typeof h.handler)")
```

Expected: prints `function` (this only checks the file loads and exports `handler` - it doesn't invoke it, since that needs live Tumblr credentials and AWS event/context shapes).

- [ ] **Step 5: Commit**

```bash
git add apps/listmania/build-lambda.sh apps/listmania/terraform/main.tf
git commit -m "$(cat <<'EOF'
fix(listmania): point build/deploy at the src/ zip-root layout

build-lambda.sh now copies src/* flat to the zip root (matching
poeticalbot) instead of assembling lambda/+lib/+config.js separately,
and bundles tumblr-poster into node_modules the same way poeticalbot's
build script does. terraform's Lambda handler string moves from
lambda/index.handler to lambda-handler.handler to match.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016BFKzByMtKTdtV1ep2uVo5
EOF
)"
```

---

## Task 6: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full listmania test target via Nx**

```bash
nx test listmania
```

Expected: PASS, same suite that's been green since Task 4.

- [ ] **Step 2: Run lint**

```bash
nx lint listmania
```

Expected: PASS (prettier check-only; if it fails, run `nx run listmania:test` locally first since `test:js`'s `test` script runs `prettier --write` - or just run `npx prettier --write "**/*.js" --ignore-path ../../.prettierignore` from `apps/listmania` and re-commit).

- [ ] **Step 3: Confirm the manual scripts still load (not part of any automated gate, but worth a smoke check since Task 2 rewrote their requires)**

```bash
cd apps/listmania
node -e "require('./scripts/test-handler.js')" 2>&1 | head -5
```

Expected: no `Cannot find module` error (it may print its own test-scenario output or exit non-zero for unrelated reasons - only checking module resolution here).

- [ ] **Step 4: Confirm no stray references to the old paths remain**

```bash
grep -rn "require('\.\./lambda\|require('\./lambda\|lambda/index\|require('\.\./lib\b" apps/listmania --include="*.js" | grep -v node_modules
```

Expected: no output.

- [ ] **Step 5: Close the beads issues**

```bash
bd close textgen-monorepo-hp5 textgen-monorepo-9if --reason="Moved to src/ layout and switched to tumblr-poster's NPF postToTumblr; see docs/superpowers/specs/2026-09-09-listmania-src-npf-design.md"
```

- [ ] **Step 6: Push the branch**

```bash
git push -u origin listmania-npf-src-layout
```
