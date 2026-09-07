# pattern-match.js

**Status: preliminary.** Written to unblock the [pattern-match REPL](../README.md#pattern-match-repl) doc; expect this to be revised once `textgen-monorepo-57w` (compromise v11→14 bump + tag-DSL audit) lands. Not a full spec.

`src/lib/pattern-match.js` filters corpus sentences down to a smaller set of fragments/lines using `compromise` match templates or POS accessors. Used by:

- **`scripts/pattern-repl.js`** — interactive exploration (`match()`, `pos()`).
- **`src/lib/lrRunner.js`** — the `pattern` line-reduce strategy in the real generation pipeline.

## API

```js
const PatternMatcher = require('./pattern-match')
const { getMatchingLines } = new PatternMatcher()

getMatchingLines({
  lines,          // string[] — corpus sentences
  nlpObj,         // compromise doc, i.e. nlp(lines.join(' '))
  matchPattern,   // optional: raw compromise match template string
  posTag,         // optional: one of nouns/adjectives/adverbs/places/verbs/values/people
  selectedMethod  // optional: 'matchStrats' | 'posStrats' | 'patternStrats'
})
// => { fragments: string[], sentences: string[], metadata: { strategy, length } }
```

- Pass `matchPattern` or `posTag` to force a specific strategy (this is what the REPL's `match()`/`pos()` do).
- Pass `selectedMethod` to restrict random selection to one strategy family, without forcing a specific template.
- Pass none of the three and it picks randomly across **all** strategies combined.
- `fragments` are the unique matched snippets; `sentences` are the input `lines` that contain any fragment (substring match, not the match itself).

## The three strategy families

- **`matchStrats`** — ~30 hand-written compromise templates (`` `#Adjective #Noun` ``, `` `#Noun is #Noun` ``, etc.), run via `n.match(template).out('array')`.
- **`posStrats`** — fixed POS accessor call (`n.nouns()`, `n.adjectives()`, ...), output run through `wordCleaner` + `textutil.cleaner` to strip punctuation. This is the only family that cleans its output — `matchStrats` and `patternStrats` don't.
- **`patternStrats`** — 10 templates generated at module-load time by randomly combining tags from the `tags` list (all compromise POS tags, e.g. `Acronym`, `Gerund`, `NounPhrase+`), with random `+`/repeat-count mutation. Different every process start, not every call.

## Known quirks (don't re-discover these)

- **posStrats is broken for random pick** (`textgen-monorepo-p8t`): the `posStrats` array holds the un-invoked curried `posStrategy` reference, not `posStrategy()`. When the random strategy picker lands on one, it calls `posStrategy(nlpObj)` — treating the compromise doc as a `fixedTag` — and returns an unexecuted inner function instead of `{filtered, descr}`. Result: `filtered` is `undefined`, silently falls back to empty fragments. Forcing `posTag` directly (what the REPL does) avoids this entirely.
- **`lrRunner.js` doesn't actually set `selectedMethod`**: it calls `patternMatchLines({ ..., method: config.method })`, but `getPatterns` destructures `selectedMethod`, not `method`. So in the real pipeline, `selectedMethod` is always `undefined` and the full combined strategy pool is always used — `config.method` is a no-op here. Worth confirming during 57w whether that's intentional.
- Tags in the `tags` array were written against compromise ~v11 and haven't been re-verified against the tag tree of the version this repo now uses.

## See also

- [`docs/superpowers/specs/2026-08-30-pattern-repl-design.md`](../../../docs/superpowers/specs/2026-08-30-pattern-repl-design.md) — REPL design/behavior spec.
- [README.md § pattern-match REPL](../README.md#pattern-match-repl) — how to run the REPL.
