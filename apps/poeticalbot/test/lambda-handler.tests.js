const chai = require('chai')
const expect = chai.expect
const LambdaHandler = require('../src/lambda-handler.js')

describe('LambdaHandler', () => {
  describe('generatePoem() option overrides reach Poetifier', () => {
    it('forces the requested method', async function () {
      this.timeout(90000)
      const handler = new LambdaHandler()
      const { poem, error } = await handler.generatePoem({
        method: 'queneau-buckets',
        transform: false
      })

      expect(error).to.equal(null)
      expect(poem.method).to.equal('queneau-buckets')
    })

    it('restricts the corpus via corporaFilter', async () => {
      const handler = new LambdaHandler()
      const { poem, error } = await handler.generatePoem({
        corporaFilter: 'eliot',
        transform: false
      })

      expect(error).to.equal(null)
      expect(poem.source).to.match(/eliot/i)
    })

    it('uses the requested seed', async () => {
      const handler = new LambdaHandler()
      const { poem, error } = await handler.generatePoem({
        seed: 'nwh-test-seed',
        transform: false
      })

      expect(error).to.equal(null)
      expect(poem.seed).to.equal('nwh-test-seed')
    })

    it('honors an explicit transform override', async function () {
      this.timeout(90000)
      const handler = new LambdaHandler()
      const { poem, error } = await handler.generatePoem({
        transform: false
      })

      expect(error).to.equal(null)
      expect(poem).to.be.an('object')
    })
  })
})
