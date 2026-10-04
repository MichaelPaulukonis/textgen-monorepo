# Testing randomized generation

Decision note for textgen-monorepo-imu (2026-10-03).

## The problem

Most generator tests take one random sample and assert its shape. A bug that only some random draws hit then fails a small fraction of runs. It looks like a flaky test, gets re-run, and ships. The queneau crash (textgen-monorepo-bvs, ~35% of prod runs) and the linereduce word-boundary bug below both slipped through this way.

All randomness in `src/` goes through `src/lib/util.js` (`random-seed`), so `new Util({ seed })` makes any run deterministic. Most tests just never pass a seed.

## Decision

1. **Default: seeded sweep.** For a randomized unit, loop a fixed list of seeds (100-200) over a small fixture and assert the invariant for every run. Failures name the seed, so they replay with `new Util({ seed })`. It needs no new dependencies and runs in milliseconds.
2. **Invariants**, settled under bvs:
   - Poetifier never throws and always returns a poem object. An empty poem is a valid result.
   - The runner (`generate-poem.js`) returns a non-empty poem, or logs `POETICALBOT_EXHAUSTED` after 5 attempts. Non-empty is the runner's job, not the generator's.
3. **Property-based testing (fast-check): not now.** The first sweep found a real bug with zero new dependencies. Revisit for pure string units (`sentencify`, `debreak`, transforms) if sweeps over fixtures start missing input shapes. Shrinking to a minimal failing input is the thing fast-check adds.
4. **Whole-corpus runs** are too slow for the unit suite (sentencify over ~75MB). Keep them behind the `integration` grep, or as scripts.
5. **Existing unseeded tests:** seed them when you touch them. No mass rewrite.

## Worked example: linereduce `start`/`end`

`test/linereduce.runner.tests.js`, "seeded sweep". The old single-sample `START` test failed now and then. Sweeping 500 seeds showed 24 failing (~5%), all from one bug: the start regex was `^` + word with no word boundary, so `so` matched `some` and `No` matched `Not enough text.`. The `end` regex had the mirror problem (`so$` matched `also`), and words went into the regex unescaped. The fix is whole-word lookarounds plus escaping in `src/lib/linereduce.js`. The sweep now passes for 200 seeds each of `start` and `end`.

## Debugging technique: replay a seed against the shipped artifact

When prod and local disagree, run the deployed bundle locally with the same seed. Unzip `terraform/poeticalbot-lambda.zip` and the common-corpus layer zip, point `NODE_PATH` at them, and call `LambdaHandler#generatePoem({ seed })` with dummy Tumblr env vars. If the output matches Lambda, the difference is in the bundle, not the machine. Then swap one dependency at a time. This found the compromise 14.16/14.17 drift (textgen-monorepo-yfs) and the layer-v1 corpus gaps (bvs).

## Follow-ups

- Contract test: every hard-coded corpus filter matches at least one text (bvs root cause: 13 of 35 filters matched nothing in layer v1).
