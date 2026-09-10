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

  const run = (args) =>
    JSON.parse(
      execSync(`node src/cli.js ${args}`, {
        encoding: 'utf8',
        cwd: path.join(__dirname, '..'),
        env: Object.assign({}, process.env, fakeEnv)
      })
    )

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
