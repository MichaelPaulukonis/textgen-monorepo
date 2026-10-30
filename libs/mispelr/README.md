# node-mispelr

Creative misspelling for generative text: dictionary typos, doubled letters, swapped letters, homophones.

Play with it live: <https://michaelpaulukonis.github.io/mispelr/>

## Install

```sh
npm install node-mispelr
```

## Usage

```js
const mispelr = require('node-mispelr')

mispelr.respell('The quick brown fox jumps over the lazy dog.', 'maxmister')
// e.g. 'Teh qucik bronw fxo jmups ovre teh layz dgo.'
```

Output is random on every call unless you pass an `rng` (see [Options](#options)).

## Spelltypes

`respell(text, method)` takes one of six methods, also available as `mispelr.spelltypes`. Examples below are all from one sentence, `The quick brown fox jumps over the lazy dog, and their friends were there too.`

| method             | what it does                                                                    | example                                                                                            |
| ------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `random` (default) | mixes all the others per word, preferring `maledict` when the word has an entry | `Thge quick brownn ffox jumppss oover teh lazy doog, adn htere firends we're htere too.`           |
| `maledict`         | swaps in real-world misspellings from a dictionary of common typos              | `Tje quick brown fox jumps over thge lazy dog, andd ther firends were ther too.`                   |
| `awfowell`         | doubles (sometimes triples) vowels                                              | `The quick brown foox juumps over thee lazy dog, aand their friiends weeree theeere toooo.`        |
| `constonantSorrow` | doubles (sometimes triples) consonants                                          | `The quickk bbrownn fox jjumpss overr tthhhe lazyyy dog, and tttheir ffrriends wwerrre there too.` |
| `maxmister`        | transposes two adjacent letters, never the first                                | `Teh qucik bronw fxo jmups ovre teh layz dgo, adn tehir friensd weer tehre too.`                   |
| `homophilia`       | swaps in homophones                                                             | `The quick brown fox jumps over the lazy dog, and they're friends we're they're two.`              |

Words with no dictionary entry pass through `maledict` and `homophilia` unchanged; `maxmister` skips words under three letters. Punctuation and numbers are never touched, and capitalization of the first letter is kept.

## Options

```js
mispelr.respell(text, method, { rng, chance, salt })
```

- **`rng`** - a function returning a number in `[0, 1)`, used for every random choice. Defaults to `Math.random`. Pass a seeded generator (e.g. [seedrandom](https://www.npmjs.com/package/seedrandom)) to make output replayable: same seed, same text, same method, same result.
- **`chance`** - the share of words to misspell, `0` to `1`. Punctuation doesn't count. Without it, every word goes through the respeller once and some come back unchanged by luck, so the rate varies by method. With it:
  - each word's misspelling is fixed by the `rng`, and `chance` only picks which ones to use - so with the same seed, raising `chance` only adds misspellings, never changes existing ones.
  - words that can't be misspelled (no dictionary entry, too short) are made up for by the rest, as far as possible.
- **`salt`** - fixes which words get picked at a given `chance`. Defaults to one draw from `rng`, so a seeded `rng` alone is enough to replay.

```js
const seedrandom = require('seedrandom')
const text =
  'The quick brown fox jumps over the lazy dog, and their friends were there too.'

mispelr.respell(text, 'random', { rng: seedrandom('fox'), chance: 0.1 })
mispelr.respell(text, 'random', { rng: seedrandom('fox'), chance: 0.6 })
// the second result keeps every misspelling from the first, and adds more
```

## Exports

- `respell(text, method?, opts?)` - described above.
- `spelltypes` - the method names, as an object (`{ random: 'random', ... }`).
- `version` - the package version.
- `Mispelr` - the constructor, for a separate instance (`new Mispelr({ log: true })` logs each step). Instances also have one shortcut per spelltype: `instance.awfowell(text)`.

## Background

Started in 2015 as a browser toy; it now lives in [textgen-monorepo](https://github.com/MichaelPaulukonis/textgen-monorepo/tree/main/libs/mispelr) alongside [PoeticalBot](https://github.com/MichaelPaulukonis/textgen-monorepo/tree/main/apps/poeticalbot), which uses it to misspell poems.

## License

MIT
