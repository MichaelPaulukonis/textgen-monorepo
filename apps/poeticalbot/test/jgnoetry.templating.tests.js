const chai = require(`chai`)
const expect = chai.expect
const templating = require(`../src/lib/jgnoetry/templating.js`)

describe(`jGnoetry.templating tests`, () => {
  describe(`API tests`, () => {
    // templates, cleanTemplateArray, makeTemplate, countSyllables
    it(`should expose a makeTemplate method`, () => {
      expect(templating.makeTemplate).to.be.a(`function`)
    })

    it(`should expose a countSyllables method`, () => {
      expect(templating.countSyllables).to.be.a(`function`)
    })
    it(`should expose a cleanTemplateArray method`, () => {
      expect(templating.cleanTemplateArray).to.be.a(`function`)
    })
    it(`should expose a templates object`, () => {
      expect(templating.templates).to.be.an(`object`)
    })
  })

  describe(`syllableCount tests`, () => {
    // TODO: more words with more syllables
    let sylbs = [[`and`, 1], [`but`, 1], [`hate`, 1]]
    for (let i = 0, len = sylbs.length; i < len; i++) {
      let s = sylbs[i]
      it(`should count syllables correctly for '${s[0]}' with algorithm (non-exception words)`, () => {
        expect(templating.countSyllables(s[0])).to.equal(s[1])
      })
    }

    let knownFailSylbs = [[`apple`, 1]]
    // TODO: more exceptions, taken from..... ????
    for (let i = 0, len = knownFailSylbs.length; i < len; i++) {
      let s = knownFailSylbs[i]
      it(`counts the wrong syllable count for '${s[0]}' := ${s[1]} with algorithm (non-exception words)`, () => {
        expect(templating.countSyllables(s[0])).to.equal(s[1])
      })
    }
  })
})
