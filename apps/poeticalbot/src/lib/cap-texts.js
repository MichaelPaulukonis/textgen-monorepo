// Bound how much corpus text one poem works from (textgen-monorepo-986).
// Sentence splitting costs ~75x the text size in memory and every generation
// path goes through it, so a multi-MB selection (the 12.7MB CIA factbook, or
// 7 random big texts) OOM'd or GC-thrashed into the 120s Lambda timeout.
// A poem uses a few dozen lines; ~1MB of source is plenty.

const textutils = require('./textutil.js')

const TEXT_CHAR_CAP = 1000000

// Contiguous slice of `text` at most `budget` chars, starting at a seeded
// random paragraph and ending on a paragraph boundary.
const windowOf = (text, budget, util) => {
  const startAt = util.randomInRange(0, text.length - budget)
  const nl = text.indexOf('\n', startAt)
  const start = startAt === 0 || nl === -1 ? 0 : nl + 1
  const end = text.lastIndexOf('\n', start + budget)
  return text.slice(start, end > start ? end : start + budget)
}

// Per-text budgets that sum to at most `cap`: texts smaller than an equal
// share of what's left keep their full size, the big ones split the rest.
const budgetsFor = (sizes, cap) => {
  const budgets = sizes.slice()
  const order = sizes.map((_, i) => i).sort((a, b) => sizes[a] - sizes[b])
  let left = cap
  order.forEach((i, k) => {
    const share = Math.floor(left / (order.length - k))
    budgets[i] = Math.min(sizes[i], share)
    left -= budgets[i]
  })
  return budgets
}

// Selections under TEXT_CHAR_CAP come back untouched with no random draw, so
// their seeds replay as before. Otherwise small texts stay whole and each
// text over its budget is replaced by a windowed copy with the same name.
const capTexts = (texts, util) => {
  const sizes = texts.map((t) => t.text().length)
  const total = sizes.reduce((a, b) => a + b, 0)
  if (total <= TEXT_CHAR_CAP) return texts

  const budgets = budgetsFor(sizes, TEXT_CHAR_CAP)
  return texts.map((t, i) => {
    if (budgets[i] >= sizes[i]) return t
    const window = windowOf(t.text(), budgets[i], util)
    // pre-split sentence corpora (one sentence per line) must not be re-split
    const presplit = t.name.indexOf('sentences') > -1
    return {
      name: t.name,
      text: () => window,
      sentences: () =>
        presplit ? window.split('\n') : textutils.sentencify(window)
    }
  })
}

module.exports = { capTexts, TEXT_CHAR_CAP }
