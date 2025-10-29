const chai = require('chai')
const expect = chai.expect
const MockTumblrClient = require('./mock-tumblr-client')
const TumblrClient = require('../src/lib/tumblr-client')

describe('Tumblr Client', () => {
  describe('Mock Tumblr Client', () => {
    let mockClient

    beforeEach(() => {
      mockClient = new MockTumblrClient({
        consumer_key: 'test_key',
        consumer_secret: 'test_secret',
        token: 'test_token',
        token_secret: 'test_token_secret'
      })
    })

    it('creates a mock client instance', () => {
      expect(mockClient).to.be.an('object')
      expect(mockClient.createPost).to.be.a('function')
      expect(mockClient.blogInfo).to.be.a('function')
    })

    it('validates credentials correctly', () => {
      expect(mockClient.validateCredentials()).to.be.true()

      const invalidClient = new MockTumblrClient({})
      expect(invalidClient.validateCredentials()).to.be.false()
    })

    it('can mock successful post creation', async () => {
      const result = await mockClient.createPost('testblog', {
        type: 'text',
        title: 'Test Post',
        body: 'Test content'
      })

      expect(result.meta.status).to.equal(201)
      expect(result.response.id).to.be.a('number')
      expect(result.response.post_url).to.include('testblog.tumblr.com')
    })

    it('tracks post history', async () => {
      await mockClient.createPost('testblog', { type: 'text', title: 'Post 1' })
      await mockClient.createPost('testblog', { type: 'text', title: 'Post 2' })

      const history = mockClient.getPostHistory()
      expect(history).to.have.length(2)
      expect(history[0].options.title).to.equal('Post 1')
      expect(history[1].options.title).to.equal('Post 2')
    })

    it('can simulate failures', async () => {
      mockClient.setFailureMode(true, 'Test failure')

      try {
        await mockClient.createPost('testblog', { type: 'text' })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error.message).to.equal('Test failure')
      }
    })

    it('can mock blog info retrieval', async () => {
      const result = await mockClient.blogInfo('testblog')

      expect(result.meta.status).to.equal(200)
      expect(result.response.blog.name).to.equal('testblog')
      expect(result.response.blog.url).to.include('testblog.tumblr.com')
    })
  })

  describe('Real Tumblr Client (with mocking)', () => {
    it('can be instantiated with credentials', () => {
      const client = new TumblrClient({
        consumer_key: 'test_key',
        consumer_secret: 'test_secret',
        token: 'test_token',
        token_secret: 'test_token_secret'
      })

      expect(client).to.be.an('object')
    })

    it('has required methods', () => {
      const client = new TumblrClient({})
      expect(client.initialize).to.be.a('function')
      expect(client.validateCredentials).to.be.a('function')
    })
  })
})