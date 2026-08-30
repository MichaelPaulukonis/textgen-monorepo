'use strict'

const chai = require('chai')
const expect = chai.expect
const tumblrPoster = require('../index')

describe('tumblr-poster', () => {
  describe('validateNPF', () => {
    it('accepts a post with at least one text content block', () => {
      const npfPost = { content: [{ type: 'text', text: 'hello' }] }
      expect(tumblrPoster.validateNPF(npfPost)).to.equal(true)
    })

    it('rejects a post with no content blocks', () => {
      const npfPost = { content: [] }
      expect(tumblrPoster.validateNPF(npfPost)).to.equal(false)
    })

    it('rejects a post missing the content field entirely', () => {
      expect(tumblrPoster.validateNPF({})).to.equal(false)
    })

    it('rejects a text block with no text', () => {
      const npfPost = { content: [{ type: 'text' }] }
      expect(tumblrPoster.validateNPF(npfPost)).to.equal(false)
    })

    it('rejects formatting with non-numeric start/end', () => {
      const npfPost = {
        content: [
          {
            type: 'text',
            text: 'hi',
            formatting: [{ start: '0', end: 2, type: 'bold' }]
          }
        ]
      }
      expect(tumblrPoster.validateNPF(npfPost)).to.equal(false)
    })
  })

  describe('postWithClient', () => {
    const fakeClient = (impl) => ({
      createPost: async (blogName, npfPost) => impl(blogName, npfPost)
    })

    it('returns success shape on a successful post', async () => {
      const client = fakeClient(async () => ({ id: 123 }))
      const result = await tumblrPoster.postWithClient(
        client,
        'testblog.tumblr.com',
        [{ type: 'text', text: 'hi' }]
      )
      expect(result).to.deep.equal({
        success: true,
        postId: 123,
        url: 'https://testblog.tumblr.com/post/123',
        error: null
      })
    })

    it('rejects invalid content without calling the client', async () => {
      let called = false
      const client = fakeClient(() => {
        called = true
        return { id: 1 }
      })
      const result = await tumblrPoster.postWithClient(client, 'testblog', [])
      expect(result.success).to.equal(false)
      expect(result.error).to.equal('Generated NPF structure is invalid')
      expect(called).to.equal(false)
    })

    it('returns failure shape when the client throws', async () => {
      const client = fakeClient(async () => {
        throw new Error('Tumblr API down')
      })
      const result = await tumblrPoster.postWithClient(client, 'testblog', [
        { type: 'text', text: 'hi' }
      ])
      expect(result).to.deep.equal({
        success: false,
        postId: null,
        url: null,
        error: 'Tumblr API down'
      })
    })

    it('passes tags and title through to the client call', async () => {
      let received
      const client = fakeClient(async (blogName, npfPost) => {
        received = npfPost
        return { id: 1 }
      })
      await tumblrPoster.postWithClient(
        client,
        'testblog',
        [{ type: 'text', text: 'hi' }],
        { tags: ['poetry', 'generative'], title: 'A Title' }
      )
      expect(received.tags).to.deep.equal(['poetry', 'generative'])
      expect(received.title).to.equal('A Title')
    })
  })

  describe('createClient', () => {
    it('builds a tumblr.js client from credentials without making a network call', () => {
      const client = tumblrPoster.createClient({
        consumerKey: 'test_key',
        consumerSecret: 'test_secret',
        accessToken: 'test_token',
        accessSecret: 'test_token_secret'
      })
      expect(client.createPost).to.be.a('function')
    })
  })

  describe('postToTumblr', () => {
    it('composes createClient and postWithClient', async () => {
      const originalCreateClient = tumblrPoster.createClient
      tumblrPoster.createClient = () => ({
        createPost: async () => ({ id: 999 })
      })

      try {
        const result = await tumblrPoster.postToTumblr(
          {
            consumerKey: 'k',
            consumerSecret: 's',
            accessToken: 't',
            accessSecret: 'ts'
          },
          'testblog.tumblr.com',
          [{ type: 'text', text: 'hi' }]
        )
        expect(result.success).to.equal(true)
        expect(result.postId).to.equal(999)
      } finally {
        tumblrPoster.createClient = originalCreateClient
      }
    })
  })
})
