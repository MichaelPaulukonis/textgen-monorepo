'use strict'

// One-off audit script for textgen-monorepo-57w: run every tag in
// pattern-match.js's `tags` list (and the fixed POS accessor names) against
// a fixed sample corpus, before and after the compromise version bump, and
// diff the two JSON outputs. Not wired into nx/package.json — run directly:
//   node apps/poeticalbot/scripts/tag-baseline.js > docs/reference/tag-baseline.vX.json
// (run from apps/poeticalbot)

const fs = require(`fs`)
const path = require(`path`)
const nlp = require(`compromise`)
const Corpora = require(`common-corpus`)
const PatternMatcher = require(`../src/lib/pattern-match`)

const POS_ACCESSORS = [
  `nouns`,
  `adjectives`,
  `adverbs`,
  `places`,
  `verbs`,
  `values`,
  `people`
]

// Small, genre-diverse sample kept intentionally modest so nlp() stays fast —
// this is about DSL coverage, not corpus-scale generation.
const SAMPLE_FILTER = `communist|free\\.culture|futurist|dadaist|invoke\\.txt|howl`

const corpora = new Corpora()
const matched = corpora.filter(SAMPLE_FILTER)
const lines = matched.reduce((acc, text) => acc.concat(text.sentences()), [])
const n = nlp(lines.join(` `))

const tagResults = PatternMatcher.tags.map((tag) => {
  const filtered = n.match(`#${tag}`).out(`array`)
  return {
    tag,
    matchCount: filtered.length,
    sample: filtered.slice(0, 3)
  }
})

const posResults = POS_ACCESSORS.map((accessor) => {
  const filtered = n[accessor]().out(`array`)
  return {
    accessor,
    matchCount: filtered.length,
    sample: filtered.slice(0, 3)
  }
})

// require.resolve('compromise/package.json') is blocked by v14's package
// "exports" field, and the main-file's distance from the package root
// differs by version (builds/ vs builds/three/), so walk node_modules
// search paths instead of guessing a relative offset.
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
