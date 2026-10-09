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

  // textgen-monorepo-ycr: the scheduled run passes no options, so Poetifier
  // only sees config.js defaults. They used to sit under config.poetry, which
  // Poetifier never reads, so production poems were never transformed.
  describe('generatePoem() with no options uses config defaults', () => {
    const generatePoemModule = require('../src/lib/generate-poem.js')
    let origGeneratePoem
    let seenConfig

    beforeEach(() => {
      origGeneratePoem = generatePoemModule.generatePoem
      generatePoemModule.generatePoem = (config) => {
        seenConfig = config
        return { poem: { title: 't', text: 'x' }, error: null, attempts: 1 }
      }
    })
    afterEach(() => {
      generatePoemModule.generatePoem = origGeneratePoem
    })

    // queryable sizes, to spot outsized poems in CloudWatch (a 5,329-char
    // drone poem broke Tumblr's block limit, textgen-monorepo-mz6)
    it('logs method and poem size with the seed', async () => {
      generatePoemModule.generatePoem = () => ({
        poem: {
          title: 't',
          text: 'ab\nlonger line',
          seed: 'sz',
          method: 'drone'
        },
        error: null,
        attempts: 2
      })
      const handler = new LambdaHandler()
      const logged = []
      handler.log = (m) => logged.push(m)
      await handler.generatePoem()
      expect(logged.join('\n')).to.contain(
        '(seed: sz, attempt 2, method drone, chars 14, lines 2, longest line 11)'
      )
    })

    it('passes transform: true to the generator by default', async () => {
      await new LambdaHandler().generatePoem()
      expect(seenConfig.transform).to.equal(true)
    })
  })

  // textgen-monorepo-8ol: a Tumblr 400 on the scheduled path was caught and
  // returned as a 500-shaped value, which async Lambda counts as success: no
  // retry, no Errors metric, no alarm, and the hour's post was lost.
  describe('scheduled event failures', () => {
    const scheduled = { source: 'aws.events' }
    const context = {
      awsRequestId: 'test',
      functionName: 'f',
      functionVersion: '1'
    }
    const poem = { title: 'T', text: 'x', seed: 's' }

    const handlerWith = ({ generated, posted }) => {
      const handler = new LambdaHandler()
      handler.config = {
        ...handler.config,
        posting: { ...handler.config.posting, enabled: true }
      }
      handler.generatePoem = async () => generated
      handler.postPoem = async () => posted
      handler.log = () => {}
      handler.logError = () => {}
      return handler
    }

    it('throws when posting fails, so Lambda retries and Errors alarms', async () => {
      const handler = handlerWith({
        generated: { poem, error: null },
        posted: {
          success: false,
          postId: null,
          error: 'API error: 400 Bad Request'
        }
      })
      let thrown = null
      try {
        await handler.handle(scheduled, context)
      } catch (err) {
        thrown = err
      }
      expect(thrown, 'handle() should reject').to.be.an('error')
      expect(thrown.message).to.contain('400 Bad Request')
    })

    it('does not throw when generation is exhausted (retries would triple attempts)', async () => {
      const handler = handlerWith({
        generated: {
          poem: null,
          error: 'No poem generated after 5 attempt(s)'
        },
        posted: null
      })
      const result = await handler.handle(scheduled, context)
      expect(result.statusCode).to.equal(500)
    })

    it('returns 200 when the post succeeds', async () => {
      const handler = handlerWith({
        generated: { poem, error: null },
        posted: { success: true, postId: '123', error: undefined }
      })
      const result = await handler.handle(scheduled, context)
      expect(result.statusCode).to.equal(200)
    })
  })
})
