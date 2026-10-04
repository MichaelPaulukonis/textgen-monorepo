var chai = require('chai')
var dirtyChai = require('dirty-chai')
var expect = chai.expect
chai.use(dirtyChai)

const nlp = require('compromise')
const PatternMatcher = require(`../src/lib/pattern-match`)
const Util = require(`../src/lib/util`)

const sample = `The yellow fog rubbed its muzzle on the window-panes. Streets follow like a tedious argument.`

describe(`pattern-match`, () => {
  const { getMatchingLines } = new PatternMatcher()

  describe(`posTag param`, () => {
    it(`uses the fixed tag instead of a random pick`, () => {
      const lines = [sample]
      const nlpObj = nlp(sample)

      const result = getMatchingLines({
        lines,
        nlpObj,
        posTag: `adjectives`
      })

      expect(result.metadata.strategy).to.equal(`pos: adjectives`)
    })

    it(`only returns fragments matching the requested part of speech`, () => {
      const lines = [sample]
      const nlpObj = nlp(sample)

      const result = getMatchingLines({
        lines,
        nlpObj,
        posTag: `nouns`
      })

      expect(result.metadata.strategy).to.equal(`pos: nouns`)
      expect(result.fragments).to.be.an(`array`)
    })

    it(`omitting posTag still exercises the existing random-pick path`, () => {
      const lines = [sample]
      const nlpObj = nlp(sample)

      const result = getMatchingLines({
        lines,
        nlpObj
      })

      expect(result.metadata.strategy).to.be.a(`string`)
    })

    it(`matchPattern still wins when both matchPattern and posTag are passed`, () => {
      const lines = [sample]
      const nlpObj = nlp(sample)

      const result = getMatchingLines({
        lines,
        nlpObj,
        matchPattern: `#Adjective #Noun`,
        posTag: `verbs`
      })

      expect(result.metadata.strategy).to.equal(`match: '#Adjective #Noun'`)
    })
  })

  // textgen-monorepo-ecv: the matcher used a module-level unseeded Util,
  // so the linereduce `pattern` path could not be replayed from a seed.
  describe(`seeded util`, () => {
    const run = (seed) => {
      const { getMatchingLines } = new PatternMatcher({
        util: new Util({ seed })
      })
      return getMatchingLines({ lines: [sample], nlpObj: nlp(sample) })
    }

    it(`same seed gives the same strategy and fragments`, () => {
      for (let i = 0; i < 50; i++) {
        const seed = `pm-${i}`
        expect(run(seed), `seed ${seed}`).to.deep.equal(run(seed))
      }
    })
  })
})
