const chai = require('chai')
const expect = chai.expect
const npfFormatter = require('../src/lib/npf-formatter')

describe('NPF Formatting', () => {
  const samplePoem = {
    title: 'Test Poem',
    lines: ['Line one', 'Line two', 'Line three'],
    text: 'Line one\nLine two\nLine three',
    source: 'test-source',
    seed: 'test-seed'
  }

  describe('NPF structure validation', () => {
    let npfContent

    before(() => {
      npfContent = npfFormatter.convertPoemToNPF(samplePoem)
    })

    it('returns a valid NPF object', () => {
      expect(npfContent).to.be.an('object')
      expect(npfContent.content).to.be.an('array')
    })

    it('includes poem title as heading', () => {
      const headingBlock = npfContent.content.find(
        (block) => block.type === 'text' && block.subtype === 'heading2'
      )
      expect(headingBlock).to.exist()
      expect(headingBlock.text).to.equal(samplePoem.title)
    })

    it('includes poem text as formatted content', () => {
      const textBlocks = npfContent.content.filter(
        (block) => block.type === 'text' && !block.subtype
      )
      expect(textBlocks.length).to.be.above(0)
    })

    it('includes source attribution', () => {
      const sourceBlock = npfContent.content.find(
        (block) =>
          block.type === 'text' && block.text && block.text.includes('Source:')
      )
      expect(sourceBlock).to.exist()
    })

    it('includes appropriate tags', () => {
      expect(npfContent.tags).to.be.an('array')
      expect(npfContent.tags).to.include('poetry')
      expect(npfContent.tags).to.include('generated')
    })
  })

  describe('Edge cases', () => {
    it('handles empty poem gracefully', () => {
      const emptyPoem = { title: '', lines: [], text: '', source: '', seed: '' }
      const result = npfFormatter.convertPoemToNPF(emptyPoem)
      expect(result).to.be.an('object')
      expect(result.content).to.be.an('array')
    })

    it('rejects a poem with no title and no text as invalid NPF', () => {
      const emptyPoem = { title: '', lines: [], text: '', source: '', seed: '' }
      const npfPost = npfFormatter.convertPoemToNPF(emptyPoem)
      expect(npfFormatter.validateNPF(npfPost)).to.equal(false)
    })

    it('handles very long poems', () => {
      const longPoem = {
        title: 'Long Poem',
        lines: Array(100).fill(
          'This is a very long line that repeats many times'
        ),
        text: Array(100)
          .fill('This is a very long line that repeats many times')
          .join('\n'),
        source: 'test-source',
        seed: 'test-seed'
      }
      const result = npfFormatter.convertPoemToNPF(longPoem)
      expect(result).to.be.an('object')
      expect(result.content).to.be.an('array')
    })

    it('handles special characters in poem text', () => {
      const specialPoem = {
        title: 'Special Characters: @#$%^&*()',
        lines: [
          'Line with "quotes"',
          'Line with <tags>',
          'Line with & ampersands'
        ],
        text: 'Line with "quotes"\nLine with <tags>\nLine with & ampersands',
        source: 'test-source',
        seed: 'test-seed'
      }
      const result = npfFormatter.convertPoemToNPF(specialPoem)
      expect(result).to.be.an('object')
      expect(result.content).to.be.an('array')
    })
  })

  // textgen-monorepo-mz6: Tumblr NPF caps a text block at 4,096 characters
  // (code points). A 5,329-char drone poem went out as one block and Tumblr
  // answered 400 Bad Request (seed 2f3qjbg.ozn4, 2026-10-08).
  describe('4096-char text block limit', () => {
    const { MAX_TEXT_BLOCK } = npfFormatter
    const cps = (t) => [...t].length
    const line = (i) => `Line ${i} of a long poem that keeps going on and on.`
    const longPoem = {
      title: 'Long',
      text: Array.from({ length: 200 }, (_, i) => line(i)).join('\n'),
      seed: 's'
    }
    const textBlocks = (npf) => npf.content.filter((b) => !b.subtype)

    it('keeps a short poem body as a single block', () => {
      const npf = npfFormatter.convertPoemToNPF(samplePoem)
      expect(npf.content[1].text).to.equal(samplePoem.text)
      expect(npf.content).to.have.lengthOf(3)
    })

    it('splits a long body at line breaks into blocks of <= 4096', () => {
      const npf = npfFormatter.convertPoemToNPF(longPoem)
      const body = textBlocks(npf).slice(0, -1) // last is metadata
      expect(body.length).to.be.above(1)
      body.forEach((b) => expect(cps(b.text)).to.be.at.most(MAX_TEXT_BLOCK))
      expect(body.map((b) => b.text).join('\n')).to.equal(longPoem.text)
      expect(npf.content[0].subtype).to.equal('heading2')
    })

    it('splits a single over-long line at word boundaries', () => {
      const words = Array.from({ length: 1500 }, (_, i) => `word${i}`)
      const npf = npfFormatter.convertPoemToNPF({
        title: 'T',
        text: words.join(' ')
      })
      const body = textBlocks(npf)
      expect(body.length).to.be.above(1)
      body.forEach((b) => expect(cps(b.text)).to.be.at.most(MAX_TEXT_BLOCK))
      expect(body.map((b) => b.text).join(' ')).to.equal(words.join(' '))
    })

    it('splits long metadata, with formatting sized to each block', () => {
      const source = Array.from(
        { length: 300 },
        (_, i) => `corpus/text.${i}`
      ).join(' ')
      const npf = npfFormatter.convertPoemToNPF({
        title: 'T',
        text: 'x',
        seed: 's',
        source
      })
      const meta = npf.content.slice(2)
      expect(meta.length).to.be.above(1)
      meta.forEach((b) => {
        expect(cps(b.text)).to.be.at.most(MAX_TEXT_BLOCK)
        b.formatting.forEach((f) => expect(f.end).to.equal(cps(b.text)))
      })
    })

    it('validateNPF rejects a text block over the limit', () => {
      const npf = { content: [{ type: 'text', text: 'a'.repeat(4097) }] }
      expect(npfFormatter.validateNPF(npf)).to.equal(false)
    })

    it('the failing production seed now formats within the limit', function () {
      this.timeout(60000)
      const config = require('../src/config.js')
      const { generatePoem } = require('../src/lib/generate-poem.js')
      const { poem } = generatePoem(
        { ...config, seed: '2f3qjbg.ozn4' },
        { log: () => {} }
      )
      const npf = npfFormatter.convertPoemToNPF(poem)
      expect(npfFormatter.validateNPF(npf)).to.equal(true)
      npf.content.forEach((b) =>
        expect(cps(b.text)).to.be.at.most(MAX_TEXT_BLOCK)
      )
    })
  })
})
