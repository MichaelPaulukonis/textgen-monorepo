const { expect } = require('chai')

const Poetifier = require('../src/lib/poetifier.js')
const Corpora = require('common-corpus')

describe('poetifier corpus filters', () => {
  const names = new Corpora().texts.map((t) => t.name)

  // Contract: a hard-coded filter that matches nothing is a dead strategy.
  // Layer v1 shipped 78/125 texts and 13 filters silently matched zero.
  Poetifier.CORPORA_FILTERS.forEach((filter) => {
    it(`'${filter}' matches at least one corpus text`, () => {
      const r = new RegExp(filter, 'i')
      expect(names.filter((n) => r.test(n)).length).to.be.above(0)
    })
  })
})

describe('poetifier with a filter matching no texts', () => {
  ;['queneau-buckets', 'drone', 'jgnoetry'].forEach((method) => {
    it(`${method}: returns an empty poem instead of crashing`, () => {
      const config = {
        method,
        corporaFilter: 'no-such-text-anywhere-zzz',
        transform: false,
        seed: 'bvs-regression'
      }
      const poem = new Poetifier({ config }).poem()
      expect(poem).to.be.an('object')
      expect(poem.text).to.equal('')
      expect(poem.title).to.equal('')
      expect(poem.seed).to.equal('bvs-regression')
    })
  })
})
