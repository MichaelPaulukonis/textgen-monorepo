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
})
