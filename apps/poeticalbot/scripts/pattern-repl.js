'use strict'

const fs = require(`fs`)
const repl = require(`repl`)
const nlp = require(`compromise`)
const Corpora = require(`common-corpus`)
const textutil = require(`../src/lib/textutil`)
const PatternMatcher = require(`../src/lib/pattern-match`)

const { getMatchingLines } = new PatternMatcher()

const VALID_TAGS = [
  `nouns`,
  `adjectives`,
  `adverbs`,
  `places`,
  `verbs`,
  `values`,
  `people`
]

const MAX_SAMPLE = 30

const printResult = (result) => {
  console.log(`strategy: ${result.metadata.strategy}`)
  console.log(`${result.fragments.length} unique fragments:`)
  console.log(result.fragments.slice(0, MAX_SAMPLE))
  console.log(`${result.sentences.length} matching sentences`)
}

const startRepl = () => {
  const replServer = repl.start({ prompt: `> ` })
  const { context } = replServer

  const requireCorpus = () => {
    if (!context.lines || !context.n) {
      console.log(`no corpus loaded — call load() first`)
      return false
    }
    return true
  }

  context.load = (source) => {
    let lines

    if (fs.existsSync(source)) {
      const corpora = new Corpora()
      const text = corpora.readFile(source)
      lines = textutil.sentencify(text)
      context.lines = lines
      context.n = nlp(lines.join(` `))
      context.sourceLabel = source
      return { source, textCount: 1, sentenceCount: lines.length }
    }

    const corpora = new Corpora()
    const matched = corpora.filter(source)

    if (matched.length === 0) {
      console.log(`no corpus texts matched filter '${source}'`)
      return undefined
    }

    lines = matched.reduce((acc, text) => acc.concat(text.sentences()), [])
    context.lines = lines
    context.n = nlp(lines.join(` `))
    context.sourceLabel = source

    return { source, textCount: matched.length, sentenceCount: lines.length }
  }

  context.match = (template) => {
    if (!requireCorpus()) return undefined
    const result = getMatchingLines({
      lines: context.lines,
      nlpObj: context.n,
      matchPattern: template
    })
    printResult(result)
    return result
  }

  context.pos = (tag) => {
    if (!requireCorpus()) return undefined
    if (!VALID_TAGS.includes(tag)) {
      console.log(`Unknown tag '${tag}'. Valid: ${VALID_TAGS.join(`, `)}`)
      return undefined
    }
    const result = getMatchingLines({
      lines: context.lines,
      nlpObj: context.n,
      posTag: tag
    })
    printResult(result)
    return result
  }

  context.help = () => {
    console.log(`
load(source)   load a corpus — file path, or common-corpus filter regex string
match(template) run a compromise match template, e.g. match('#Adjective #Noun of #Noun')
pos(tag)       run a fixed POS accessor — one of: ${VALID_TAGS.join(`, `)}
help()         print this message

n is the live compromise doc for the loaded corpus — use it directly for
anything the helpers above don't cover, e.g. n.match('#Gerund #Noun').out('array')
`)
  }
}

console.log(`PatternMatch REPL. Type help() for commands.`)
startRepl()
