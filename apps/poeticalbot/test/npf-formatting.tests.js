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
      const headingBlock = npfContent.content.find(block => block.type === 'text' && block.subtype === 'heading2')
      expect(headingBlock).to.exist()
      expect(headingBlock.text).to.equal(samplePoem.title)
    })

    it('includes poem text as formatted content', () => {
      const textBlocks = npfContent.content.filter(block => block.type === 'text' && !block.subtype)
      expect(textBlocks.length).to.be.above(0)
    })

    it('includes source attribution', () => {
      const sourceBlock = npfContent.content.find(block =>
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

    it('handles very long poems', () => {
      const longPoem = {
        title: 'Long Poem',
        lines: Array(100).fill('This is a very long line that repeats many times'),
        text: Array(100).fill('This is a very long line that repeats many times').join('\n'),
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
        lines: ['Line with "quotes"', 'Line with <tags>', 'Line with & ampersands'],
        text: 'Line with "quotes"\nLine with <tags>\nLine with & ampersands',
        source: 'test-source',
        seed: 'test-seed'
      }
      const result = npfFormatter.convertPoemToNPF(specialPoem)
      expect(result).to.be.an('object')
      expect(result.content).to.be.an('array')
    })
  })
})