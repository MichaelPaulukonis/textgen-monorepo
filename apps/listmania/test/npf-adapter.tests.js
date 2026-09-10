'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)
const { expect } = chai

const { toNPFContent } = require('../src/lib/npf-adapter')

describe('npf-adapter', function () {
  const sampleList = {
    list: ['apple', 'banana', 'cherry'],
    metadata: {
      source: 'test-corpus',
      strategy: 'match: #Noun',
      title: 'Three Fruits',
      length: 3
    }
  }

  it('starts with a bold heading2 title block', function () {
    const content = toNPFContent(sampleList)
    const titleBlock = content[0]

    expect(titleBlock.type).to.equal('text')
    expect(titleBlock.subtype).to.equal('heading2')
    expect(titleBlock.text).to.equal('Three Fruits')
    expect(titleBlock.formatting).to.deep.equal([
      { start: 0, end: 'Three Fruits'.length, type: 'bold' }
    ])
  })

  it('emits one list-item block per list entry, in order', function () {
    const content = toNPFContent(sampleList)
    const itemBlocks = content.slice(1)

    expect(itemBlocks).to.have.lengthOf(3)
    expect(itemBlocks.map((b) => b.text)).to.deep.equal([
      'apple',
      'banana',
      'cherry'
    ])
  })

  it('uses the same list-item subtype for every item in a post', function () {
    const content = toNPFContent(sampleList)
    const itemBlocks = content.slice(1)
    const subtypes = new Set(itemBlocks.map((b) => b.subtype))

    expect(subtypes.size).to.equal(1)
    expect(['numbered-list-item', 'unordered-list-item']).to.include(
      [...subtypes][0]
    )
  })

  it('marks every item block as type text', function () {
    const content = toNPFContent(sampleList)
    content.slice(1).forEach((block) => {
      expect(block.type).to.equal('text')
    })
  })

  it('includes no metadata block', function () {
    const content = toNPFContent(sampleList)

    expect(content).to.have.lengthOf(sampleList.list.length + 1)
    content.forEach((block) => {
      expect(block.text).to.not.include('test-corpus')
      expect(block.text).to.not.include('match: #Noun')
    })
  })
})
