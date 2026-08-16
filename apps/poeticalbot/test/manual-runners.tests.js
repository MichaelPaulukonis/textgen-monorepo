'use strict'

/**
 * Regression coverage for test/manual-runners/*.js require paths.
 * These scripts aren't part of the normal generation pipeline and
 * aren't run by mocha's own suite, but they should at least execute
 * without a MODULE_NOT_FOUND — they require relative to their own
 * directory (test/manual-runners/), which previously pointed at
 * paths that never existed there (e.g. ./lib/poetifier.js instead
 * of ../../src/lib/poetifier.js).
 */

const chai = require('chai')
const expect = chai.expect
const execSync = require('child_process').execSync

describe('manual-runners scripts', function () {
  this.timeout(30000)

  it('writepoem.js runs without a MODULE_NOT_FOUND error', function () {
    let result
    try {
      result = execSync('node test/manual-runners/writepoem.js', {
        encoding: 'utf8'
      })
    } catch (error) {
      expect.fail('writepoem.js threw: ' + error.message)
    }
    expect(result).to.be.a('string')
  })

  it('pattern-match.runner.js runs without throwing', function () {
    let result
    try {
      result = execSync('node test/manual-runners/pattern-match.runner.js', {
        encoding: 'utf8'
      })
    } catch (error) {
      expect.fail('pattern-match.runner.js threw: ' + error.message)
    }
    expect(result).to.be.a('string')
  })
})
