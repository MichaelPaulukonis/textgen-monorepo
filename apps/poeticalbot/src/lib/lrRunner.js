// TODO: UGH why create a new object if it immediately returns the junk?
// need to modify this a bit

const nlp = require('compromise')
// compromise@14 dropped .ngrams() from core; it now lives in this
// first-party plugin (textgen-monorepo-57w, compromise v11->14 bump).
nlp.extend(require('compromise-stats'))
const { types } = require(`../lib/linereduce.js`)
const LR = require(`../lib/linereduce.js`)

// pattern/search run a full compromise parse over the sentences, which takes
// ~300x the text size in memory: a multi-MB corpus selection OOM'd or
// GC-thrashed into the 120s timeout on Lambda (textgen-monorepo-986, -oli).
const NLP_CHAR_CAP = 250000

// A contiguous window of sentences (wrapping) totalling at most NLP_CHAR_CAP
// chars, starting at a seeded random sentence. Selections under the cap come
// back untouched with no random draw, so their seeds replay as before.
const capSentences = (sents, util) => {
  const size = (s) => s.length + 1
  if (sents.reduce((n, s) => n + size(s), 0) <= NLP_CHAR_CAP) return sents
  const start = util.randomInRange(0, sents.length - 1)
  const window = []
  let chars = 0
  for (let i = 0; i < sents.length; i++) {
    const s = sents[(start + i) % sents.length]
    if (chars + size(s) > NLP_CHAR_CAP) break
    window.push(s)
    chars += size(s)
  }
  return window
}

const Runner = function (config) {
  if (!(this instanceof Runner)) {
    return new Runner(config)
  }

  const { util, texts } = config
  let sents = texts.reduce((p, c) => p.concat(c.sentences()), [])
  const name = texts.reduce((p, c) => p + ` ` + c.name, ``).trim()
  let selection = { lines: [] }

  const linereduce = new LR.LineReduce({
    util: util
  })

  // TODO: return the method it used
  const reduceType = config.reduceType || util.pick(Object.keys(types))
  switch (reduceType) {
    case types.start:
      selection = linereduce.filter({ type: types.start, text: sents })
      break

    case types.end:
      selection = linereduce.filter({ type: types.end, text: sents })
      break

    case types.pattern:
      sents = capSentences(sents, util)
      const Matcher = require('./pattern-match')
      const { getMatchingLines: patternMatchLines } = new Matcher({ util })
      // when run from poetifier, coming in as array of objects
      // which is not what linereduce expects...
      let matchObj = { sentences: [] }
      let attempts = 0
      let n = nlp(sents.join(' '))

      while (matchObj.sentences.length === 0 && attempts < 10) {
        attempts++
        // TODOL every time, it runs nlp() on the text
        // we probably do this several times until it works
        matchObj = patternMatchLines({
          lines: sents,
          method: config.method,
          matchPattern: config.matchPattern,
          nlpObj: n
        })
        if (matchObj.sentences.length === 0 && config.matchPattern) {
          config.matchPattern = null
        }
      }
      console.log(JSON.stringify(matchObj.metadata))
      selection = { text: sents.join(`\n`), lines: matchObj.sentences }
      break

    case types.search:
    default:
      sents = capSentences(sents, util)
      const ngrams = nlp(sents.join('\n')).ngrams()

      if (ngrams.length === 0) {
        selection = { lines: [], text: sents.join('\n') }
        break
      }

      // TODO: find some way to get a map of counts with sizes
      // so we can pick (randomly? or largest?) possibilities
      // with the below, we are ALWAYS picking from > 2, so, I guess that okay
      const twoOrMoreWords = ngrams.filter((d) => d.count > 1 && d.size > 1)
      const search =
        twoOrMoreWords.length === 0
          ? util.pick(ngrams)
          : util.pick(twoOrMoreWords)
      selection = linereduce.filter({
        type: types.search,
        search: search.normal,
        text: sents
      })
  }

  return {
    name,
    text: selection.text,
    lines: selection.lines
  }
}

Runner.capSentences = capSentences
Runner.NLP_CHAR_CAP = NLP_CHAR_CAP

module.exports = Runner
