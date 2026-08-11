const MAX_LETTER_FILTER_ATTEMPTS = 25
const MAX_TITLE_ATTEMPTS = 10

// only words that contain a given letter remain; letter is re-rolled each attempt
// when not explicitly provided, so retrying tries different letters, not just
// re-running the same filter. Bounded so a scarce/nonexistent letter can't spin.
function boundedLetterFilter (poem, letter, util, maxAttempts = MAX_LETTER_FILTER_ATTEMPTS) {
  const coreFilter = function () {
    const poemCopy = JSON.parse(JSON.stringify(poem))
    const targetLetter = (typeof letter === `undefined`)
      ? util.pick(`abcdefghijklmnoprstuvwxyz`.split(``))
      : letter
    poemCopy.lines = poemCopy.lines.map((line) => line.split(` `) // NAIVE SPLITTING
      .filter(word => word.indexOf(targetLetter) > -1)
      .join(` `))
    poemCopy.text = poemCopy.lines.join(`\n`)
    return poemCopy
  }

  let filtered = coreFilter()
  let attempts = 1
  while (filtered.text.trim().length < 10 && attempts < maxAttempts) {
    filtered = coreFilter()
    attempts++
  }
  return filtered
}

// retries title generation only while the title comes back blank, bounded so a
// persistently blank generator can't spin. String.split always returns
// length >= 1, so the check is on the trimmed string, not split().length.
function retryTitle (poem, titlifier, maxAttempts = MAX_TITLE_ATTEMPTS) {
  if (poem.title) return poem

  let attempts = 0
  do {
    poem.title = titlifier.generate(poem.text)
    attempts++
  } while (poem.title.trim().length === 0 && attempts < maxAttempts)

  return poem
}

module.exports = {
  boundedLetterFilter,
  retryTitle,
  MAX_LETTER_FILTER_ATTEMPTS,
  MAX_TITLE_ATTEMPTS
}
