var chai = require('chai')
var expect = chai.expect
var retryBounds = require('../src/lib/retry-bounds.js')
var boundedLetterFilter = retryBounds.boundedLetterFilter
var retryTitle = retryBounds.retryTitle

describe('retry-bounds', () => {
  describe('boundedLetterFilter', () => {
    it('stops calling util.pick once maxAttempts is reached when no word matches the letter', () => {
      const poem = { lines: ['zzz zzz'], text: 'zzz zzz' }
      let pickCalls = 0
      const fakeUtil = { pick: () => { pickCalls++; return 'x' } }
      const maxAttempts = 5

      const result = boundedLetterFilter(poem, undefined, fakeUtil, maxAttempts)

      expect(pickCalls).to.equal(maxAttempts)
      expect(result.text.trim()).to.equal('')
    })

    it('stops as soon as a filtered result meets the length threshold', () => {
      const poem = { lines: ['xylophones extra music everywhere'], text: 'xylophones extra music everywhere' }
      let pickCalls = 0
      const fakeUtil = { pick: () => { pickCalls++; return 'x' } }

      const result = boundedLetterFilter(poem, undefined, fakeUtil, 25)

      expect(pickCalls).to.equal(1)
      expect(result.text.trim().length).to.be.at.least(10)
    })
  })

  describe('retryTitle', () => {
    it('does not call the titlifier when poem already has a title', () => {
      const poem = { title: 'Existing', text: 'hello' }
      let calls = 0
      const titlifier = { generate: () => { calls++; return 'new' } }

      const result = retryTitle(poem, titlifier)

      expect(calls).to.equal(0)
      expect(result.title).to.equal('Existing')
    })

    it('accepts the first non-blank title without retrying', () => {
      const poem = { title: '', text: 'hello world' }
      let calls = 0
      const titlifier = { generate: () => { calls++; return 'hello' } }

      const result = retryTitle(poem, titlifier, 5)

      expect(calls).to.equal(1)
      expect(result.title).to.equal('hello')
    })

    it('retries up to maxAttempts when the titlifier keeps returning a blank title, then stops', () => {
      const poem = { title: '', text: 'x' }
      let calls = 0
      const titlifier = { generate: () => { calls++; return '' } }

      const result = retryTitle(poem, titlifier, 4)

      expect(calls).to.equal(4)
      expect(result.title).to.equal('')
    })
  })
})
