# pattern-match.js

**Status: preliminary**, but now post-audit — `textgen-monorepo-57w` (compromise v11→14 bump + tag-DSL audit) has landed. Still not a full spec.

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
- **`patternStrats`** — 10 templates generated at module-load time by randomly combining tags from the `tags` list (all compromise POS tags, e.g. `Acronym`, `Gerund`, `Auxiliary`), with random `+`/repeat-count mutation. Different every process start, not every call.

## The `tags` list — audited against compromise v14

51 tags, each confirmed (via `scripts/tag-baseline.js`) to actually match something on a real sample corpus under compromise@14.16.0. Raw counts: [`docs/reference/tag-baseline.v11.json`](reference/tag-baseline.v11.json) / [`.v14.json`](reference/tag-baseline.v14.json).

11 tags were removed as dead:

- Already dead under v11 (pre-existing DSL rot, not caused by the bump): `FuturePerfect`, `Holiday`, `NounPhrase+`, `PerfectTense`, `Pluperfect`, `RelativeDay`.
- Killed by the v11→v14 bump itself (matched real things under v11, zero under v14): `ClauseEnd`, `Contraction`, `NiceNumber`, `Quotation`, `VerbPhrase+`.

One tag was fixed rather than removed: `Auxillary` was a typo for `Auxiliary` — correcting it recovers real matches (`was`, `has`, `would`, `shall`, ...).

## Known quirks (don't re-discover these)

- ~~posStrats is broken for random pick~~ — fixed in 57w (`textgen-monorepo-p8t`). The `posStrats` array held the un-invoked curried `posStrategy` reference instead of `posStrategy()`; when the random strategy picker landed on one, it called `posStrategy(nlpObj)` — treating the compromise doc as `fixedTag` — and returned an unexecuted inner function instead of `{filtered, descr}`, silently producing empty fragments. Fixed by invoking `posStrategy()` when building the array.
- **`lrRunner.js` still doesn't set `selectedMethod`** — left unfixed, out of scope for 57w: it calls `patternMatchLines({ ..., method: config.method })`, but `getPatterns` destructures `selectedMethod`, not `method`. In the real pipeline `selectedMethod` is always `undefined`, so `config.method` is a silent no-op and the full combined strategy pool is always used regardless of what's requested.
- `nlp(...).ngrams()` (used by `lrRunner.js`'s default `search` strategy, not by pattern-match.js itself) was removed from compromise core between v11 and v14 — it's now the separate `compromise-stats` plugin, wired in via `nlp.extend()` in `lrRunner.js`. Its `.ngrams()` returns a plain array directly now (no `.data()` call needed).

## See also

- [`docs/superpowers/specs/2026-08-30-pattern-repl-design.md`](../../../docs/superpowers/specs/2026-08-30-pattern-repl-design.md) — REPL design/behavior spec.
- [README.md § pattern-match REPL](../README.md#pattern-match-repl) — how to run the REPL.
