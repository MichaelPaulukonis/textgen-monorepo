const chai = require('chai')
const expect = chai.expect
const { execSync } = require('child_process')
const CLI = require('../src/cli.js')

describe('CLI Integration', () => {
  describe('CLI execution', () => {
    it('can generate a poem without posting', () => {
      const result = execSync(
        'node src/cli.js --no-post --method queneau-buckets --corporaFilter eliot',
        {
          encoding: 'utf8',
          timeout: 45000
        }
      )

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

  describe('generatePoem() option overrides reach Poetifier', () => {
    it('forces the requested method', async function () {
      this.timeout(90000)
      const cli = new CLI()
      const { poem, error } = await cli.generatePoem({
        method: 'queneau-buckets',
        transform: false
      })

      expect(error).to.equal(null)
      expect(poem.method).to.equal('queneau-buckets')
    })

    it('restricts the corpus via corporaFilter', async () => {
      const cli = new CLI()
      const { poem, error } = await cli.generatePoem({
        corporaFilter: 'eliot',
        transform: false
      })

      expect(error).to.equal(null)
      expect(poem.source).to.match(/eliot/i)
    })

    it('uses the requested seed', async () => {
      const cli = new CLI()
      const { poem, error } = await cli.generatePoem({
        seed: 'cai-test-seed',
        transform: false
      })

      expect(error).to.equal(null)
      expect(poem.seed).to.equal('cai-test-seed')
    })
  })
})
