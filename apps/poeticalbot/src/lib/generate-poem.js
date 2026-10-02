// Retry runner around Poetifier (textgen-monorepo-bvs).
// An empty poem is a valid Poetifier result - constraints (corpus filter,
// method, transforms) can legitimately yield nothing. The runner re-rolls the
// randomized constraints with a fresh Poetifier/seed, up to MAX_POEM_ATTEMPTS.
// Never throws: on Lambda a throw triggers 2 async retries (3x the attempts).

const MAX_POEM_ATTEMPTS = 5
const EXHAUSTED_MARKER = 'POETICALBOT_EXHAUSTED'

const isBlank = (s) => typeof s !== 'string' || s.trim() === ''

const describeAttempt = (n, config, poem, outcome) =>
  `attempt ${n}: ${outcome} ` +
  JSON.stringify({
    seed: poem?.seed ?? config.seed,
    method: poem?.method ?? config.method,
    corporaFilter: config.corporaFilter,
    source: poem?.source
  })

function generatePoem(config, { Poetifier, log = console.log } = {}) {
  Poetifier = Poetifier || require('./poetifier.js')
  // a pinned seed makes every attempt identical - no point retrying
  const maxAttempts = config.seed ? 1 : MAX_POEM_ATTEMPTS
  const history = []

  for (let n = 1; n <= maxAttempts; n++) {
    // poetifier mutates its config (e.g. config.reduce) - copy per attempt
    const attemptConfig = { ...config }
    let poem = null
    let outcome
    try {
      poem = new Poetifier({ config: attemptConfig }).poem()
      if (poem && !isBlank(poem.title) && !isBlank(poem.text)) {
        return { poem, error: null, attempts: n }
      }
      outcome = poem?.error ? `error (${poem.error})` : 'empty'
    } catch (err) {
      outcome = 'exception'
      log(err.stack || String(err))
    }
    const line = describeAttempt(n, attemptConfig, poem, outcome)
    history.push(line)
    log(line)
  }

  log(
    `${EXHAUSTED_MARKER}: ${maxAttempts}/${maxAttempts} attempts produced no poem\n` +
      history.join('\n')
  )
  return {
    poem: null,
    error: `No poem generated after ${maxAttempts} attempt(s)`,
    attempts: maxAttempts
  }
}

module.exports = { generatePoem, MAX_POEM_ATTEMPTS, EXHAUSTED_MARKER }
