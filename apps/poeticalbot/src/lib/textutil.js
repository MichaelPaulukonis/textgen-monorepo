const { map, match, trim } = require('ramda')

const textutils = () => {
  // would be nice to ignore some stop words
  const stopwords = require(`./stopwords.js`)

  const splitwords = match(/(?!'.*')\b[\w']+\b/g)

  // this is an awkward, annoying intermediate step
  const wordbag = (text) => {
    let wb = {}

    // const splits = splitwords(text)
    var splits = Array.isArray(text)
      ? text // if it's an array keep it
      : splitwords(text) // otherwise split it

    for (let i = 0, len = splits.length; i < len; i++) {
      const word = splits[i]
      // TODO: alphanumeric test should be optional
      if (stopwords.indexOf(word.toLowerCase()) === -1) {
        // if (alphanumeric.test(word) && word.length > 3) {
        let key = `_` + word
        if (!wb[key]) {
          wb[key] = { word: word, count: 0 }
        }
        wb[key].count++
      }
    }

    return wb
  }

  const sortedArray = (wb) => {
    const words = Object.keys(wb)
      .map((k) => wb[k])
      .sort(function (a, b) {
        if (a.count < b.count) {
          return 1
        }

        if (a.count > b.count) {
          return -1
        }

        return 0
      })

    return words
  }

  const wordfreqs = (text) => {
    return sortedArray(wordbag(text))
  }

  // TODO: drop this into textutils AND TEST IT
  // based on some code I saw in https://github.com/scotthammack/ebook_ebooks/blob/master/ebook_ebooks.py
  // I've contemplated a different version for years, which I should complete
  // that would add in the missing pieces.
  const cleaner = (poem) => {
    // a first implementation of a naive cleaner
    const plines = poem.split(`\n`)

    let cleanlines = []

    for (let i = 0, len = plines.length; i < len; i++) {
      let line = plines[i]

      line = line.replace(/_+/g, `_`)

      let leftbrackets = line.match(/\[/g)
      let lbCount = leftbrackets ? leftbrackets.length : 0
      let rightbrackets = line.match(/\]/g)
      let rbCount = rightbrackets ? rightbrackets.length : 0

      if ((leftbrackets || rightbrackets) && lbCount !== rbCount) {
        line = line.replace(/[[\]]/g, ``)
      }

      let leftparens = line.match(/\(/g)
      let lpCount = leftparens ? leftparens.length : 0
      let rightparens = line.match(/\)/g)
      let rpCount = rightparens ? rightparens.length : 0

      if ((leftparens || rightparens) && lpCount !== rpCount) {
        line = line.replace(/[()]/g, ``)
      }

      cleanlines.push(line)
    }

    return cleanlines.join(`\n`)
  }

  // Each paragraph (line of debreaked text) is a hard sentence boundary.
  // Loaded texts are already debreaked; debreaking again joined every
  // paragraph into one, fusing unpunctuated lines (lists, headings, labels,
  // table rows) into giant 'sentences' (textgen-monorepo-qi5). Only raw text,
  // which still has blank lines, gets debreaked here. Keep in sync with
  // libs/common-corpus/lib/textutil.js.
  const sentencify = (text) => {
    // if array of texts, each is its own paragraph
    if (Object.prototype.toString.call(text) === `[object Array]`) {
      text = text.join(`\n`).trim()
    }

    const debreak = require(`../lib/debreak.js`)
    // compromise/one = tokenizer only, no POS tagging. Same sentence split
    // as the full build's .sentences(), ~7x faster and lighter on memory.
    const nlp = require(`compromise/one`)

    const paragraphs = /\n[ \t]*\n/.test(text) ? debreak(text) : text
    const sentences = []
    for (const line of paragraphs.split(`\n`)) {
      const p = line.replace(/\t/g, ` `).replace(/^ +/g, ``)
      if (p.trim().length > 0) sentences.push(...nlp(p).out(`array`))
    }
    return map(trim, sentences)
  }

  return {
    wordbag,
    wordfreqs,
    cleaner,
    splitwords,
    sentencify
  }
}

module.exports = textutils()
