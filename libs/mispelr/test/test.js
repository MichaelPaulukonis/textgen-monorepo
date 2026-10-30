const { expect } = require('chai')
const mispelr = require('../index.js')

describe('node-mispelr', () => {
  describe('API (0.0.1 call style)', () => {
    it('exposes respell as a plain function', () => {
      expect(mispelr.respell).to.be.a('function')
    })

    it('exposes the package version', () => {
      expect(mispelr.version).to.equal(require('../package.json').version)
    })

    it('exposes the spelltypes', () => {
      expect(mispelr.spelltypes).to.have.all.keys(
        'random',
        'maledict',
        'awfowell',
        'constonantSorrow',
        'maxmister',
        'homophilia'
      )
    })

    it('exports the constructor, with or without new', () => {
      expect(new mispelr.Mispelr()).to.be.an.instanceof(mispelr.Mispelr)
      expect(mispelr.Mispelr()).to.be.an.instanceof(mispelr.Mispelr)
    })
  })

  describe('respell', () => {
    const text = 'this is a test of the respelling functions of this thing.'

    Object.keys(mispelr.spelltypes).forEach((type) => {
      it(`returns a string for '${type}'`, () => {
        expect(mispelr.respell(text, type)).to.be.a('string')
      })
    })

    it('defaults to random when no type given', () => {
      expect(mispelr.respell(text)).to.be.a('string')
    })

    it('maledict uses the dictionary, matching capitalization', () => {
      expect(mispelr.respell('abbreviate', 'maledict')).to.equal('abreviate')
      expect(mispelr.respell('Abbreviate', 'maledict')).to.equal('Abreviate')
    })

    it('homophilia swaps homophones', () => {
      expect(mispelr.respell('pail', 'homophilia')).to.equal('pale')
    })

    it('homophones are single words, not "and ..." list fragments', () => {
      const homophones = require('../data/homophones')
      Object.entries(homophones).forEach(([word, alts]) => {
        expect(word).to.not.match(/^and /)
        alts.forEach((alt) => expect(alt).to.not.match(/^and /))
      })
    })

    it('leaves non-alpha tokens alone', () => {
      expect(mispelr.respell('1234 !!', 'random')).to.equal('1234 !!')
    })
  })

  describe('respell options { rng, chance, salt }', () => {
    const text =
      'The quick brown fox jumps over the lazy dog while the other dogs sleep soundly in the warm afternoon sun.'

    // mulberry32: small seedable PRNG, enough to drive replay tests
    const seeded = (seed) => () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    const changedWords = (out) => {
      const a = text.split(' ')
      const b = out.split(' ')
      return a.filter((w, i) => w !== b[i]).length
    }

    Object.keys(mispelr.spelltypes).forEach((type) => {
      it(`same rng seed replays identically for '${type}'`, () => {
        const a = mispelr.respell(text, type, { rng: seeded(42) })
        const b = mispelr.respell(text, type, { rng: seeded(42) })
        expect(a).to.equal(b)
      })

      it(`same seed + chance replays identically for '${type}'`, () => {
        const a = mispelr.respell(text, type, { rng: seeded(7), chance: 0.4 })
        const b = mispelr.respell(text, type, { rng: seeded(7), chance: 0.4 })
        expect(a).to.equal(b)
      })
    })

    it('chance 0 leaves the text unchanged', () => {
      expect(
        mispelr.respell(text, 'random', { rng: seeded(1), chance: 0 })
      ).to.equal(text)
    })

    it('chance 1 misspells every word that can be misspelled', () => {
      // maxmister can change any word of 4+ letters
      const out = mispelr
        .respell(text, 'maxmister', { rng: seeded(3), chance: 1 })
        .split(/\W+/)
      text.split(/\W+/).forEach((w, i) => {
        if (w.length > 3) expect(out[i], w).to.not.equal(w)
      })
    })

    const misspelledShare = (input, type, chance, n) => {
      const orig = input.split(/\W+/).filter(Boolean)
      let changed = 0
      for (let k = 0; k < n; k++) {
        const out = mispelr
          .respell(input, type, { rng: seeded(100 + k), chance })
          .split(/\W+/)
          .filter(Boolean)
        changed += orig.filter((w, i) => w !== out[i]).length
      }
      return changed / (orig.length * n)
    }

    ;['random', 'maxmister', 'awfowell'].forEach((type) => {
      it(`chance is the share of words misspelled for '${type}'`, () => {
        ;[0.1, 0.3].forEach((chance) => {
          expect(
            misspelledShare(text, type, chance, 200),
            `${chance}`
          ).to.be.closeTo(chance, 0.04)
        })
      })
    })

    it('punctuation does not count toward the share', () => {
      const punchy = text.replace(/ /g, ' -- ; ')
      expect(misspelledShare(punchy, 'random', 0.2, 50)).to.be.closeTo(
        0.2,
        0.04
      )
    })

    it('3 words at 0.1: about one misspelling every three calls', () => {
      expect(
        misspelledShare('quick brown foxes', 'random', 0.1, 300) * 3
      ).to.be.closeTo(0.3, 0.08)
    })

    it('caps at what the method can change', () => {
      // maledict only changes dictionary words
      const share = misspelledShare(text, 'maledict', 0.9, 20)
      expect(share).to.be.above(0).and.below(0.9)
    })

    it('does not touch Math.random when an rng is given', () => {
      const orig = Math.random
      Math.random = () => {
        throw new Error('Math.random called')
      }
      try {
        mispelr.respell(text, 'random', { rng: seeded(5), chance: 0.5 })
      } finally {
        Math.random = orig
      }
    })

    it('raising chance only adds respelled words (nested sets)', () => {
      const at = (chance) =>
        mispelr
          .respell(text, 'maxmister', { rng: seeded(9), chance, salt: 's' })
          .split(' ')
      const orig = text.split(' ')
      const low = at(0.2)
      const high = at(0.6)
      low.forEach((w, i) => {
        if (w !== orig[i]) expect(high[i]).to.equal(w)
      })
      expect(changedWords(high.join(' '))).to.be.at.least(
        changedWords(low.join(' '))
      )
    })

    it('chance thins out respelling', () => {
      const full = changedWords(
        mispelr.respell(text, 'maxmister', { rng: seeded(11) })
      )
      const thin = changedWords(
        mispelr.respell(text, 'maxmister', {
          rng: seeded(11),
          chance: 0.2,
          salt: 'x'
        })
      )
      expect(thin).to.be.below(full)
    })

    it('chance 0.3 mixes kept and dropped words within one short text', () => {
      // a weak hash clusters nearby indices, making each call all-or-nothing
      const orig = text.split(' ')
      const full = mispelr.respell(text, 'maxmister', { rng: seeded(13) })
      const eligible = full.split(' ').filter((w, i) => w !== orig[i]).length
      let allOrNothing = 0
      for (let n = 0; n < 50; n++) {
        const out = mispelr.respell(text, 'maxmister', {
          rng: seeded(13),
          chance: 0.3,
          salt: `salt${n}`
        })
        const kept = out.split(' ').filter((w, i) => w !== orig[i]).length
        if (kept === 0 || kept === eligible) allOrNothing++
      }
      expect(allOrNothing).to.be.below(3)
    })
  })
})
