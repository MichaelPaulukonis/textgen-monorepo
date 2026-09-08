# lib/listify.js — compromise usage audit

Audit for `textgen-monorepo-3pk`. listmania's own compromise usage is independent of poeticalbot's `pattern-match.js` (see `apps/poeticalbot/docs/pattern-match.md` for that side's audit, `textgen-monorepo-57w`), despite the parallel structure.

Per the user: "the repeated use of pos-tag template was my key breakthrough in making a randomized list seem coherent" — this isn't vestigial, it's the core mechanism behind `buildList`'s `matchStrats`/`posStrats`/`patternStrats` families.

## API surface used

All usage lives in `buildList()`, `lib/listify.js:114-450`:

- `nlp(text)` — parse (`lib/listify.js:122,135,155`).
- `.match(template).out('array')` — `matchStrategyFactory`, `lib/listify.js:120-132`.
- `n[targetPos]()` — dynamic POS accessor call, one of `nouns/adjectives/adverbs/places/verbs/values/people`, `posStrategy`/`posStrategyAdj`, `lib/listify.js:134-181`.

## The three strategy families (same shape as poeticalbot's pattern-match.js)

- **`matchStrats`** (`lib/listify.js:307-347`) — ~30 hand-written compromise templates (`` `#Adjective #Noun` ``, `` `#Noun is #Noun` ``, etc.), via `n.match(template).out('array')`. Every tag referenced here is confirmed live under both v13 and v14 (see below) — no regression risk from the bump.
- **`posStrategy`** (`lib/listify.js:134-151`) — random POS accessor call, output cleaned via `wordCleaner`/`textutil.cleaner`.
- **`posStrategyAdj`** (`lib/listify.js:154-181`) — POS accessor combined with a random adjective (own corpus-sourced word list, not compromise-derived).
- **`patternStrats`** (`lib/listify.js:224-304`, `matchPatternFactory`) — 10 templates built at `buildList()` call time from the `tags` list (all compromise POS tags), with random `+`/repeat-count mutation. Same technique as poeticalbot's `patternStrats`.

## Live bug found during audit, independent of the version decision

`posStrategy`'s `targetPos` pool (`lib/listify.js:136-144`) includes `'values'`. Under the currently-installed `compromise@^13.8.0` (resolved `13.11.4`), **`n.values` is not a function** — `posStrategy` throws whenever `util.pick` selects `'values'` (1-in-7 within `posStrategy`, which itself is 1 of ~30 pooled strategies overall). This is a live crash bug in production today, unrelated to any bump.

Confirmed fixed by the v14 bump: `n.values` exists and returns matches under `compromise@14.16.0` (307 matches on the audit sample). This alone would justify the bump even without the tag-list improvements below.

## The `tags` list — audited against both v13 (installed) and v14 (poeticalbot's target)

Full list at `lib/listify.js:225-288`, 61 tags. Not exported (closure-local to `matchPatternFactory`) — the audit script (`scripts/tag-baseline.js`) duplicates it; keep both in sync if the list changes. Raw counts: [`docs/reference/tag-baseline.v13.json`](reference/tag-baseline.v13.json) / [`.v14.json`](reference/tag-baseline.v14.json).

**v13 → v14 diff:**

- Regressed (live under v13, dead under v14): `PerfectTense`.
- Recovered (dead under v13, live under v14): `Duration`, `NumberRange`, `Time`, `Year`.
- Net: one loss, four gains, plus the `values` accessor fix above. Bump is a clear improvement, not just parity with poeticalbot.

**One tag fixed, not removed** (per this bead's scope — audit only, not a tag-list pruning pass): `Auxillary` was a typo for `Auxiliary`, same bug independently present in poeticalbot's pre-57w list. Fixed here too — recovers 728 real matches (`was`, `has`, `is`, ...) under v14.

**11 tags confirmed dead under v14** (left in place, not removed — out of scope for this bead, same "not a removal" stance as its correction note): `ClauseEnd`, `Contraction`, `FuturePerfect`, `Holiday`, `NiceNumber`, `NounPhrase+`, `PerfectTense`, `Pluperfect`, `Quotation`, `RelativeDay`, `VerbPhrase+`. All of these overlap heavily with poeticalbot's own dead-tag findings in `textgen-monorepo-57w` — same compromise-DSL rot, not listmania-specific. A dead tag in `patternStrats` just yields an empty-match template for that call; `buildList` doesn't special-case empty results, so this degrades gracefully (empty list, not a crash) rather than being a second live bug.

## Decision: bump to `^14.16.0`, aligned with poeticalbot

Done as part of `textgen-monorepo-3pk`: `package.json`'s `compromise` dependency bumped from `^13.8.0` to `^14.16.0`. Rationale: fixes the live `values` crash bug, net-positive tag coverage, and keeps both apps on the same compromise major version going forward (no longer two independently-drifting versions to reason about). `nx test listmania` passes (84/84) and `nx lint listmania` is clean post-bump.
