'use strict'

/**
 * Regression coverage for a credential-leak bug: index.js used to
 * console.log(JSON.stringify(config)) on every successful list
 * generation, which included the raw Tumblr consumer_secret/
 * token_secret. Verifies stdout never contains the configured
 * secrets, using fake env-injected credentials so this doesn't
 * depend on (or risk leaking) whatever real .env is present locally.
 */

const chai = require('chai')
const expect = chai.expect
const execSync = require('child_process').execSync
const path = require('path')

describe('index.js CLI', function () {
  this.timeout(30000)

  const fakeSecrets = {
    CONSUMER_KEY: 'fake-consumer-key-marker',
    CONSUMER_SECRET: 'fake-consumer-secret-marker',
    TOKEN: 'fake-token-marker',
    TOKEN_SECRET: 'fake-token-secret-marker',
    POST_LIVE: 'false'
  }

  it('never prints the configured Tumblr credentials to stdout', function () {
    const result = execSync('node index.js', {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      env: Object.assign({}, process.env, fakeSecrets)
    })

    expect(result).to.not.include(fakeSecrets.CONSUMER_SECRET)
    expect(result).to.not.include(fakeSecrets.TOKEN_SECRET)
    expect(result).to.not.include(fakeSecrets.CONSUMER_KEY)
    expect(result).to.not.include(fakeSecrets.TOKEN)
  })
})
