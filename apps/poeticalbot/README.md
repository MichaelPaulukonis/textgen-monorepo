# NaPoGenMo2016

See output @ <http://poeticalbot.tumblr.com/>

[National Poetry Generation Month 2016](https://github.com/NaPoGenMo/NaPoGenMo2016)

[my notes](https://github.com/NaPoGenMo/NaPoGenMo2016/issues/3)

## running

This app runs from the monorepo root via `nx`, or directly from `apps/poeticalbot` — both call the same `src/cli.js`.

```bash
# from repo root
nx cli:sample poeticalbot     # queneau-buckets method, doesn't post
nx cli:help poeticalbot       # full flag reference

# or, from apps/poeticalbot directly
npm run cli:sample
npm run cli:help
node src/cli.js --corpora-filter eliot --verbose
```

By default `src/cli.js` generates a poem and prints it — it does **not** post to Tumblr unless you pass `--post` (or set `POST_LIVE=true`). See `node src/cli.js --help` for the full flag list (`--method`, `--seed`, `--corpora-filter`, `--transform`, `--verbose`).

There's also `node test/manual-runners/writepoem.js`, an older, more minimal runner used for quick manual checks against `src/lib/poetifier.js` directly (bypasses the CLI's config/logging layer). It's not part of the test suite and doesn't default to a generation method — pass `--method` explicitly (`jgnoetry`, `queneau-buckets`, or `drone`) or you'll get an empty poem back.

TODO: some things log, some things don't - it's erratic and the logs can be confusing

## testing

`npm t`

## deploying

Deployment is AWS Lambda via Terraform, standardized through `nx` — see the top-level `docs/DEPLOYMENT.md`.

```bash
nx run poeticalbot:deploy:plan   # review only
nx run poeticalbot:deploy
```

### tumblr connection in `.env`

Create a `.env` file in `apps/poeticalbot` with your Tumblr app credentials for local running (there's no `.env.example` checked in — these are the required keys). In Lambda, these are set as environment variables via Terraform instead.

```env
consumer_key=<OAuth consumer key>
consumer_secret=<OAuth consumer secret>
token=foo
token_secret=foo
```

## poem generators

- queaneau-buckets
- jgnoetry (headless)
- custom templates
  - TODO: on-the-fly generated templates
  - TODO: templates can have pre-populated text and spacing ?
  - TODO: rewire for multi-pass with saved-text (and post sequences)
- [Harvard Sentences](http://www.cs.cmu.edu/afs/cs.cmu.edu/project/fgdata/OldFiles/Recorder.app/utterances/Type1/harvsents.txt) drone
  - TODO: the drone structure seems like it would work for other generators, if they output sentences/lines.

## transformers

- random leading spaces
- sort (ascending/descending)
- mispelr
- phonetic
- rhyme appender
  - more proof-of-concept than anything.
  - existing implementation is sub-optimal

## titles

 - first/last/random line
 - random-selection from most common words in poem
 - summary sentence (summary algorithm picks sentence)
  -  fails poorly when there aren't enough sentences

## corpus

 - lots of texts
 - sorted into folders
 - select with regex
 - a number of pre-selected combinations, plus random collections
 - randomize percentages for the jGnoetry model

## Plans

 - Hybridizer
 - heijinian leading spaces
 - mesostics
 - news-text importer (one of the original ideas)
 - (optionally) replace the syllable-detection algorithm in jgnoetry
  - at a minimum, extract it for unit-testing

Boringly, I continue to work with unit-tests and code-coverage, and other dull things instead of the "cool" poetry generation _all the time_. So sue me.

It usually pays off in the long run, when I return to a project after a while not remembering how it works -- boom, the tests document usage! Also they run through so many scenarios I know when I do or do not break stuff (depending upon coverage).

### some things to look at

 - https://github.com/rossgoodwin/poetry-solver
 - https://github.com/rossgoodwin/poetizer
 - https://github.com/rossgoodwin/sonnetizer
 - https://github.com/rossgoodwin/lyricist
 - https://github.com/rossgoodwin/wikipoet (30 minutes to gen a poem!!!)
 - https://www.npmjs.com/package/syllable
 - https://github.com/nlp-compromise - what else can it do that would be... interesting?
 - better text cleanup - see [ebook_ebooks](https://github.com/scotthammack/ebook_ebooks/blob/master/ebook_ebooks.py) - _a few features to improve readability, such as chapter numbering, paragraph breaks, and parenthesis/quotation mark balancing_
 - https://github.com/matthewsklar/PoetryBot
 - aparrish's [linear-systems poetry](https://github.com/aparrish/linear-lsystem-poetry) Hard to get good results, butwith practice, weird things can emerge.
 - topic analysis? I played around with a lib, but the results were not promising. these "poems" are too weird to be coherent for topics, usually. And not sure what to do with the output.
 - I tried using nlp-compromise's simple-english module, but it didn't do much, very often
 - more meta-data on the poems/words/etc. So transforms can be done with more granularity?
  - at the very least, try to keep re-processing the texts and poems into sentences and words multiple times.

## Original ideas that did and did not work

So, I've been looking at the [Lexeduct code](https://github.com/MichaelPaulukonis/Lexeduct/) that Chris Pressey started last year. I didn't look into it enough at the time, and my work with it was at cross-currents to its ideology (my work last year was in the `gh-pages` branch, and "worked", even though it doesn't fit the main model in the master branch).

I think wrangling that understanding and applying it to want I currently want to do will be too time-consuming (although profitable).

So, I'm going to do the Simplest Thing That Could Possibly Work.

1. static text generator posts to Tumblr
1. text generator becomes non-static
1. elaborate and iterate on step 2
1. end-goal includes ingestion of source material from online news


SO 1-3 HAPPENED THAT'S GOOD
And 3 continues to happen....
