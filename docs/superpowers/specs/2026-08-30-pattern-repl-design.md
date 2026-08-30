# Pattern-Match REPL (textgen-monorepo-ap7)

## Problem

No fast way to iterate on `compromise` match templates
(`apps/poeticalbot/src/lib/pattern-match.js`) against real corpus text. The
only way to see what a template like `#Adjective #Noun of #Noun` actually
matches today is to run a full poeticalbot generation cycle.

Two direct uses:

- **textgen-monorepo-vyv** (modernize common-corpus toolchain, incl.
  `nlp_compromise` -> `compromise` bump): manually verify pattern-match.js's
  ~55-tag DSL still matches the same way after a compromise version bump,
  before trusting it in the full pipeline.
- **textgen-monorepo-cet** (new "noun, state" list-poem style): explore how
  nouns pair with participles/states in corpus text — this REPL is the
  exploration surface for designing that pairing logic.

## Approach

Node's built-in `repl` module, with domain helpers exposed as context
globals. No new dependency — `repl` is Node builtin, `compromise` and
`common-corpus` are already deps of `poeticalbot`. Real JS eval means the
helpers can be dropped in favor of raw compromise doc access at any time —
nothing is hidden behind a custom command parser.

Lives at `apps/poeticalbot/scripts/pattern-repl.js` (new `scripts/` dir —
keeps `src/` as production code only). Run via `node scripts/pattern-repl.js`;
add a `package.json` script (`"repl": "node scripts/pattern-repl.js"`) and an
`nx run poeticalbot:repl` target following the existing `cli:*` target
pattern in `project.json`.

`pattern-match.js` gets one small, additive extension (see below) so the
REPL's `pos()` helper reuses its logic instead of reimplementing it.

## REPL context

Exposed on the repl context (mutating `replServer.context`):

- `lines` — current sentence array (`string[]`)
- `n` — current compromise doc (`nlp(lines.join(' '))`), live and directly
  usable for anything the wrapper helpers don't cover
- `load(source)` — loads a corpus
- `match(template)` — runs a compromise match template
- `pos(tag)` — runs a fixed POS accessor
- `help()` — prints command summary

Nothing is loaded at startup; `lines`/`n` are `undefined` until `load()` is
called, per the "reloadable in-REPL, no restart" requirement.

### `load(source)`

- If `source` resolves to an existing file path (`fs.existsSync`): read it,
  `textutil.sentencify(fs.readFileSync(source, 'utf8'))` (or via
  `common-corpus`'s own `readFile`, which handles ISO8859-1/BOM/debreak —
  reuse that rather than re-reading raw). One text, one source name.
- Else treat `source` as a `common-corpus` filter regex string:
  `new Corpora().filter(source)` → for each matched text call `.sentences()`
  and flatten into one `lines` array. Multiple texts, one combined source.
- Either path: rebuild `n = nlp(lines.join(' '))` (mirrors the existing
  pattern in `src/lib/lrRunner.js`), store `lines`/`n`/`sourceLabel` on repl
  context, print `{ source, textCount, sentenceCount }`.
- Empty match (regex matches zero texts) or unreadable file: print an error,
  leave any previously-loaded `lines`/`n` untouched (no throw, no silent
  reset to empty state).

### `match(template)`

Calls the existing `PatternMatcher().getMatchingLines({ lines, nlpObj: n,
matchPattern: template })` unchanged. Prints:

- `strategy` — the `descr` field from the result
- unique fragment count, then up to the first 30 fragments (avoid flooding
  the terminal on broad templates — full array remains available by
  inspecting the return value if needed, since repl auto-prints the eval
  result too)
- matching sentence count

Guard: if `lines`/`n` are undefined, print "no corpus loaded — call load()
first" instead of throwing.

### `pos(tag)`

Calls `getMatchingLines({ lines, nlpObj: n, posTag: tag })` (see extension
below). `tag` must be one of the 7 values already hardcoded in
`pattern-match.js`'s `posStrategy` (`nouns`, `adjectives`, `adverbs`,
`places`, `verbs`, `values`, `people`); unknown tag prints the valid list and
does not throw. Same "no corpus loaded" guard as `match()`. Same output shape
as `match()` (strategy description, fragment count + sample, sentence count).

### `help()`

Prints the four commands with one-line descriptions and the syntax examples
below.

## Example session

```
$ node scripts/pattern-repl.js
PatternMatch REPL. Type help() for commands.
> load('eliot')
{ source: 'eliot', textCount: 3, sentenceCount: 812 }
> match('#Adjective #Noun of #Noun')
strategy: match: '#Adjective #Noun of #Noun'
12 unique fragments:
[ 'yellow fog of evening', 'muttering retreats of insidious', ... ]
34 matching sentences
> pos('nouns')
strategy: pos: nouns
205 unique fragments:
[ 'evening', 'streets', 'window-panes', 'muttering', ... ]
> pos('verbz')
Unknown tag 'verbz'. Valid: nouns, adjectives, adverbs, places, verbs, values, people
> n.match('#Gerund #Noun').out('array').slice(0, 5)
[ 'muttering retreats', 'sawdust restaurants', ... ]
> load('/Users/me/scratch/one-poem.txt')
{ source: '/Users/me/scratch/one-poem.txt', textCount: 1, sentenceCount: 14 }
> .exit
```

## pattern-match.js extension

`getPatterns({ lines, selectedMethod, matchPattern, posTag, nlpObj })` — add
`posTag` to the destructured params. `posStrategy` changes from:

```js
let posStrategy = () => (n) => {
  const targetPos = util.pick([...])
  ...
}
```

to:

```js
let posStrategy = (fixedTag) => (n) => {
  const targetPos = fixedTag || util.pick([...])
  ...
}
```

Wiring: when `posTag` is passed to `getPatterns`, use `posStrategy(posTag)`
as the matcher directly (same priority tier as `matchPattern` — if both are
somehow passed, `matchPattern` wins, mirroring the existing `selectedMethod`
priority order already in the function). Purely additive: no existing caller
(`poetifier.js`, `lrRunner.js`) passes `posTag`, so their behavior — random
tag pick — is unchanged.

## Testing

- `apps/poeticalbot/test/pattern-match.tests.js` (new — no test file exists
  for this module today): mocha+chai unit tests for the `posTag` extension —
  fixed tag produces deterministic-shape output (calls the right compromise
  accessor), omitting `posTag` still exercises the existing random-pick path
  unchanged. Follows repo's existing mocha/chai/no-jest convention.
- `scripts/pattern-repl.js` itself: no automated test. It's a dev tool
  wrapping already-tested logic (`getMatchingLines`, `Corpora`,
  `textutil.sentencify`/`readFile`). Manual smoke check (`load`/`match`/`pos`
  against a real corpus filter and a real file path) stands in for a test
  suite, consistent with `cli:sample`'s existing role as a smoke test
  elsewhere in this repo (see root `CLAUDE.md`).

## Error handling

- `load()`: bad file path or zero-match filter → print error, preserve any
  prior `lines`/`n` state, no throw.
- `match()`/`pos()` called before any successful `load()` → friendly guard
  message, no throw.
- `pos()` with an unknown tag → print the valid tag list, no throw.
- Malformed match template (compromise itself throws) → let it throw. The
  `repl` module already catches per-line eval exceptions and keeps the
  session alive, so no extra try/catch is needed around `match()`.

## Out of scope

- No new CLI flags on `cli.js` — this is a separate dev-tool entry point.
- No persistence of REPL history/session state beyond what Node's `repl`
  module gives for free (`.history` file via its default behavior).
- No changes to `matchStrategyFactory`, the `tags` list, or any existing
  `matchStrats`/`patternStrats` arrays.
