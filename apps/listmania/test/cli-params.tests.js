'use strict'

/**
 * Regression coverage for tg-3: commander@7 stopped exposing parsed flags
 * as program.X properties, so index.js's `if (program.method)` checks
 * were dead code and -c/-p/-m never reached config. Fixed via program.opts().
 */

const chai = require('chai')
const expect = chai.expect
const execSync = require('child_process').execSync
const path = require('path')

describe('index.js CLI parameter passing', function () {
  this.timeout(30000)

  const fakeEnv = {
    CONSUMER_KEY: 'x',
    CONSUMER_SECRET: 'x',
    TOKEN: 'x',
    TOKEN_SECRET: 'x',
    POST_LIVE: 'false'
  }

  // teller() picks one random text chunk per process and retries the same
  // chunk against the match pattern up to 5x; if that chunk has zero matches
  // it prints a plain-text "NO LIST FOR TEXT..." fallback instead of JSON.
  // Re-running gets a fresh random chunk, same mitigation the CLI itself
  // already relies on - not a race, just content-dependent match failure.
  const run = (args, retriesLeft = 5) => {
    const stdout = execSync(`node src/cli.js ${args}`, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      env: Object.assign({}, process.env, fakeEnv)
    })

    if (!stdout.trim().startsWith('{')) {
      if (retriesLeft <= 0) {
        throw new Error(
          `cli.js never produced a list after retries; last output: ${stdout}`
        )
      }
      return run(args, retriesLeft - 1)
    }

    return JSON.parse(stdout)
  }

  it('-c/--corporaFilter restricts the source corpus', () => {
    const result = run('-c cyberpunk')
    expect(result.metadata.source.toLowerCase()).to.include('cyberpunk')
  })

  it('-p/--patternMatch forces the exact match template', () => {
    const result = run(`-p "#Adjective #Noun"`)
    expect(result.metadata.strategy).to.equal(`match: '#Adjective #Noun'`)
  })

  it('-m/--method restricts the strategy family', () => {
    const result = run('-m matchStrats')
    expect(result.metadata.strategy).to.match(/^match: /)
  })
})
