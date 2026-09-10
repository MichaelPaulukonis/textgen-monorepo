const listifier = new (require('./lib/listify'))()
const util = require('./lib/util.js')({ statusVerbosity: 0 })
const config = require('./config.js')
const { postToTumblr } = require('tumblr-poster')
const { toNPFContent } = require('./lib/npf-adapter')

const ALWAYS_PRINT = 0

const logger = function (msg) {
  util.debug(msg, ALWAYS_PRINT)
}
util.log = logger

const getText = function () {
  const Corpora = require('common-corpus')
  const corpora = new Corpora()
  const source = config.corporaFilter
    ? corpora.filter(config.corporaFilter)
    : corpora.texts
  const chars = 50000
  const textObj = util.pick(source)
  const text = textObj.text()
  const startPos = util.randomInRange(0, text.length - chars)
  const blob =
    text.length <= chars ? text : text.slice(startPos, startPos + chars)

  return {
    text: blob,
    source: textObj.name
  }
}

const teller = async function () {
  const text = getText(config.corporaFilter)
  let list = {}
  let attempt = 0

  while (attempt < 5) {
    attempt++
    list = listifier.getList({
      text,
      matchPattern: config.matchPattern,
      method: config.method
    })
    if (list.list && list.list.length > 0) {
      break
    }
  }

  if (list.list && list.list.length > 0) {
    if (config.postLive) {
      const result = await postToTumblr(
        config,
        'leanstooneside',
        toNPFContent(list)
      )
      if (result.error) {
        logger(result.error)
      }
    } else {
      logger(JSON.stringify(list, null, 2))
    }
  } else {
    console.log(`NO LIST FOR TEXT '${text.source}'`)
  }
}

const program = require('commander')
program
  .version('0.0.3')
  .option(
    '-c, --corporaFilter [string]',
    'filename substring filter (non-case sensitive)'
  )
  .option(
    '-p, --patternMatch [string]',
    'nlp-compromise matchPattern for list elements'
  )
  .option('-m, --method [string]', 'method-type (See index.js)')
  .parse(process.argv)

// commander@7 stopped exposing parsed flags as program.X properties by
// default (textgen-monorepo-tg-3) — must read them via .opts() now.
const opts = program.opts()

if (opts.corporaFilter) {
  config.corporaFilter = opts.corporaFilter
}

if (opts.patternMatch) {
  config.matchPattern = opts.patternMatch
}

if (opts.method) {
  config.method = opts.method
}

teller()
