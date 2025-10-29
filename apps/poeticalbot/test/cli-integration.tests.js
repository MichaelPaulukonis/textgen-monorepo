const chai = require('chai')
const expect = chai.expect
const { execSync } = require('child_process')

describe('CLI Integration', () => {
  describe('CLI execution', () => {
    it('can generate a poem without posting', () => {
      const result = execSync('node src/cli.js --no-post --method queneau-buckets --corporaFilter eliot', {
        encoding: 'utf8',
        timeout: 30000
      })

      expect(result).to.be.a('string')
      expect(result.length).to.be.above(0)
      expect(result).to.match(/title|lines|source/i)
    })

    it('shows help when requested', () => {
      const result = execSync('node src/cli.js --help', {
        encoding: 'utf8',
        timeout: 5000
      })

      expect(result).to.be.a('string')
      expect(result).to.match(/usage|options/i)
    })

    it('handles invalid options gracefully', () => {
      try {
        execSync('node src/cli.js --invalid-option', {
          encoding: 'utf8',
          timeout: 5000
        })
      } catch (error) {
        expect(error.status).to.not.equal(0)
      }
    })
  })
})