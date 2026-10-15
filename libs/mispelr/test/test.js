const { expect } = require('chai')
const mispelr = require('../index.js')

describe('node-mispelr', () => {
  describe('API (0.0.1 call style)', () => {
    it('exposes respell as a plain function', () => {
      expect(mispelr.respell).to.be.a('function')
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

    it('leaves non-alpha tokens alone', () => {
      expect(mispelr.respell('1234 !!', 'random')).to.equal('1234 !!')
    })
  })
})
