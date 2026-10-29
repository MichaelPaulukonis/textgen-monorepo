const chai = require('chai')
const expect = chai.expect
const { LambdaHandler } = require('../src/lambda-handler.js')

describe('LambdaHandler', () => {
  // textgen-monorepo-wcx (twin of poeticalbot's 8ol): a posting failure on the
  // scheduled path was caught and returned as a 500-shaped value, which async
  // Lambda counts as success: no retry, no Errors metric, and the post is lost.
  describe('scheduled event failures', () => {
    const scheduled = { source: 'aws.events' }
    const context = {
      awsRequestId: 'test',
      functionName: 'f',
      functionVersion: '1'
    }
    const list = { list: ['a', 'b'], metadata: { title: 'T' } }

    const handlerWith = ({ generated, posted }) => {
      const handler = new LambdaHandler()
      handler.config = { ...handler.config, postLive: true }
      handler.generateList = async () => generated
      handler.postList = async () => posted
      handler.log = () => {}
      handler.logError = () => {}
      return handler
    }

    it('throws when posting fails, so Lambda retries and Errors alarms', async () => {
      const handler = handlerWith({
        generated: { list, error: null },
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

    it('does not throw when generation is exhausted (retries would multiply attempts)', async () => {
      const handler = handlerWith({
        generated: {
          list: null,
          error: "No list generated for text 'x' after 5 attempts"
        },
        posted: null
      })
      const result = await handler.handle(scheduled, context)
      expect(result.statusCode).to.equal(500)
    })

    it('returns 200 when the post succeeds', async () => {
      const handler = handlerWith({
        generated: { list, error: null },
        posted: { success: true, postId: '123', error: undefined }
      })
      const result = await handler.handle(scheduled, context)
      expect(result.statusCode).to.equal(200)
    })
  })
})
