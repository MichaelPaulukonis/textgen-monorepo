'use strict'

// One-off audit script for textgen-monorepo-3pk: run every compromise tag
// and POS accessor used by lib/listify.js against a fixed sample corpus,
// to establish which actually match anything under the currently installed
// compromise version. Modeled on poeticalbot's textgen-monorepo-57w
// scripts/tag-baseline.js. Not wired into nx/package.json — run directly:
//   node apps/listmania/scripts/tag-baseline.js > apps/listmania/docs/reference/tag-baseline.vX.json
// (run from repo root or apps/listmania — corpus filter is content-based)

const fs = require(`fs`)
const path = require(`path`)
const nlp = require(`compromise`)
const Corpora = require(`common-corpus`)

// Mirrors the `tags` array in lib/listify.js's matchPatternFactory (lines
// ~225-288). Not exported by listify.js (buildList/matchPatternFactory are
// closure-local), so duplicated here for audit purposes only.
const TAGS = [
  `Acronym`,
  `Adjective`,
  `Adverb`,
  `Auxiliary`,
  `Cardinal`,
  `City`,
  `ClauseEnd`,
  `Comparative`,
  `Condition`,
  `Conjunction`,
  `Contraction`,
  `Copula`,
  `Country`,
  `Currency`,
  `Date`,
  `Demonym`,
  `Determiner`,
  `Duration`,
  `Expression`,
  `FemaleName`,
  `FirstName`,
  `FuturePerfect`,
  `Gerund`,
  `Holiday`,
  `Infinitive`,
  `LastName`,
  `MaleName`,
  `Modal`,
  `Money`,
  `Month`,
  `Negative`,
  `NiceNumber`,
  `Noun`,
  `NounPhrase+`,
  `NumberRange`,
  `NumericValue`,
  `Ordinal`,
  `Organization`,
  `Participle`,
  `Particle`,
  `PastTense`,
  `PerfectTense`,
  `Person`,
  `Place`,
  `Pluperfect`,
  `Plural`,
  `Possessive`,
  `Preposition`,
  `PresentTense`,
  `Pronoun`,
  `QuestionWord`,
  `Quotation`,
  `RelativeDay`,
  `Singular`,
  `Superlative`,
  `Time`,
  `Unit`,
  `Value`,
  `Verb`,
  `VerbPhrase+`,
  `WeekDay`,
  `Year`
]

// Mirrors posStrategy's targetPos pool (lib/listify.js line ~136-144).
const POS_ACCESSORS = [
  `nouns`,
  `adjectives`,
  `adverbs`,
  `places`,
  `verbs`,
  `values`,
  `people`
]

const SAMPLE_FILTER = `communist|free\\.culture|futurist|dadaist|invoke\\.txt|howl`

const corpora = new Corpora()
const matched = corpora.filter(SAMPLE_FILTER)
const lines = matched.reduce((acc, text) => acc.concat(text.sentences()), [])
const n = nlp(lines.join(` `))

const tagResults = TAGS.map((tag) => {
  const filtered = n.match(`#${tag}`).out(`array`)
  return {
    tag,
    matchCount: filtered.length,
    sample: filtered.slice(0, 3)
  }
})

const posResults = POS_ACCESSORS.map((accessor) => {
  if (typeof n[accessor] !== `function`) {
    return {
      accessor,
      matchCount: null,
      sample: [],
      error: `n.${accessor} is not a function`
    }
  }
  const filtered = n[accessor]().out(`array`)
  return {
    accessor,
    matchCount: filtered.length,
    sample: filtered.slice(0, 3)
  }
})

const compromisePkgPath = require
  .resolve(`compromise`)
  .split(`node_modules${path.sep}compromise${path.sep}`)[0]
  .concat(`node_modules${path.sep}compromise${path.sep}package.json`)
const compromisePkg = JSON.parse(fs.readFileSync(compromisePkgPath))

const output = {
  compromiseVersion: compromisePkg.version,
  sourceFiles: matched.map((m) => m.name),
  sentenceCount: lines.length,
  tags: tagResults,
  posAccessors: posResults
}

console.log(JSON.stringify(output, null, 2))
