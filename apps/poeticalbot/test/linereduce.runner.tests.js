var chai = require('chai')
var dirtyChai = require('dirty-chai')
var expect = chai.expect
let util = new (require(`../src/lib/util.js`))()
chai.use(dirtyChai)
const { linereduceRunner: LinereduceRunner } = require('../src/lib')
const testData = require('./testdata')
const { types } = require(`../src/lib/linereduce.js`)
const nlp = require('compromise')

// extracted from linereduce itself
// so... maybe it's a utility?
const stripPunct = (t) => t.replace(/^[^a-z0-9-]|[^a-z0-9-]$/gi, ``)

describe(`linereduceRunner `, () => {
  describe(`API`, () => {
    it(`...provides a Runner method`, () => {
      expect(LinereduceRunner).to.be.a(`function`)
    })
  })

  describe('... in action', () => {
    it('... will get a set of sentences that START with the same word', () => {
      const reduced = new LinereduceRunner({
        util,
        texts: [testData.corporaDummy],
        reduceType: types.start
      })
      expect(reduced).to.be.an('object')
      expect(reduced).to.have.property('lines')
      expect(reduced).to.have.property('text')
      expect(reduced).to.have.property('name')

      expect(reduced.name).to.be.a('string')
      expect(reduced.text).to.be.a('string')
      expect(reduced.lines).to.be.an('array')

      expect(reduced.lines.length).to.be.greaterThan(0)
      expect(reduced.text.length).to.be.greaterThan(0)

      const firstWord = stripPunct(reduced.lines[0].split(' ')[0])
      const allSame = reduced.lines.reduce(
        (p, line) => p && stripPunct(line).startsWith(firstWord),
        true
      )
      expect(allSame).to.be.true()
    })

    it('... will get a set of sentences that END with the same word', () => {
      const reduced = new LinereduceRunner({
        util,
        texts: [testData.corporaDummy],
        reduceType: types.end
      })
      expect(reduced).to.be.an('object')
      expect(reduced).to.have.property('lines')
      expect(reduced).to.have.property('text')
      expect(reduced).to.have.property('name')

      expect(reduced.name).to.be.a('string')
      expect(reduced.text).to.be.a('string')
      expect(reduced.lines).to.be.an('array')

      expect(reduced.lines.length).to.be.greaterThan(0)
      expect(reduced.text.length).to.be.greaterThan(0)

      const lastWord = stripPunct(reduced.lines[0].split(' ').slice(-1)[0])
      const allSame = reduced.lines.reduce(
        (p, line) => p && stripPunct(line).endsWith(lastWord),
        true
      )
      expect(allSame).to.be.true()
    })

    it('... will get a set of sentences that contain a 2+ word sequence', () => {
      const reduced = new LinereduceRunner({
        util,
        texts: [testData.corporaDummy],
        reduceType: types.search
      })
      expect(reduced).to.be.an('object')
      expect(reduced).to.have.property('lines')
      expect(reduced).to.have.property('text')
      expect(reduced).to.have.property('name')

      expect(reduced.name).to.be.a('string')
      expect(reduced.text).to.be.a('string')
      expect(reduced.lines).to.be.an('array')

      expect(reduced.lines.length).to.be.greaterThan(0)
      expect(reduced.text.length).to.be.greaterThan(0)

      const ngrams = nlp(reduced.text).ngrams()
      expect(ngrams.length).to.be.greaterThan(0)
    })

    it('... will get a set of sentences that match a pattern (nouns)', () => {
      const config = {
        util,
        texts: [testData.corporaDummy],
        reduceType: types.pattern,
        matchPattern: '#noun'
      }
      const reduced = new LinereduceRunner(config)
      expect(reduced).to.be.an('object')
      expect(reduced).to.have.property('lines')
      expect(reduced).to.have.property('text')
      expect(reduced).to.have.property('name')

      expect(reduced.name).to.be.a('string')
      expect(reduced.text).to.be.a('string')
      expect(reduced.lines).to.be.an('array')

      expect(reduced.lines.length).to.be.greaterThan(25)
    })

    it('... will get a set of sentences that match a pattern (adjective)', () => {
      const config = {
        util,
        texts: [testData.corporaDummy],
        reduceType: types.pattern,
        matchPattern: '#Adjective'
      }
      const reduced = new LinereduceRunner(config)
      expect(reduced).to.be.an('object')
      expect(reduced).to.have.property('lines')
      expect(reduced).to.have.property('text')
      expect(reduced).to.have.property('name')

      expect(reduced.name).to.be.a('string')
      expect(reduced.text).to.be.a('string')
      expect(reduced.lines).to.be.an('array')

      expect(reduced.lines.length).to.be.greaterThan(7)
    })

    it('... will get a set of sentences that match a pattern (person)', () => {
      const config = {
        util,
        texts: [testData.corporaDummy],
        reduceType: types.pattern,
        matchPattern: '#Person'
      }
      const reduced = new LinereduceRunner(config)
      expect(reduced).to.be.an('object')
      expect(reduced).to.have.property('lines')
      expect(reduced).to.have.property('text')
      expect(reduced).to.have.property('name')

      expect(reduced.name).to.be.a('string')
      expect(reduced.text).to.be.a('string')
      expect(reduced.lines).to.be.an('array')

      expect(reduced.lines.length).to.be.greaterThan(3)
    })

    it('... will try more than one on a failure with a specified pattern', () => {
      const config = {
        util,
        texts: [testData.corporaDummy],
        reduceType: types.pattern,
        matchPattern: '#Grundig'
      }
      // TODO: sinon spy to track calls?
      const reduced = new LinereduceRunner(config)
      expect(reduced).to.be.an('object')
      expect(reduced).to.have.property('lines')
      expect(reduced).to.have.property('text')
      expect(reduced).to.have.property('name')

      expect(reduced.name).to.be.a('string')
      expect(reduced.text).to.be.a('string')
      expect(reduced.lines).to.be.an('array')

      expect(reduced.lines.length).to.be.greaterThan(0)
    })
  })

  // Seeded sweep (textgen-monorepo-imu): the single-sample tests above use an
  // unseeded util, so a bug that only some seeds hit fails ~5% of runs and
  // looks like flakiness. Looping fixed seeds makes it deterministic, and a
  // failure names the seed to replay with new Util({ seed }).
  describe('... seeded sweep', () => {
    const Util = require(`../src/lib/util.js`)
    const SEEDS = 200
    const words = (line) => line.trim().split(/\s+/).map(stripPunct)

    const sweep = (reduceType, wordOf) => {
      for (let i = 0; i < SEEDS; i++) {
        const seed = `sweep-${i}`
        const { lines } = new LinereduceRunner({
          util: new Util({ seed }),
          texts: [testData.corporaDummy],
          reduceType
        })
        const target = wordOf(words(lines[0])).toLowerCase()
        const stray = lines.find(
          (l) => wordOf(words(l)).toLowerCase() !== target
        )
        expect(stray, `seed ${seed}: "${stray}" vs "${target}"`).to.equal(
          undefined
        )
      }
    }

    it(`START lines share the same whole first word, ${SEEDS} seeds`, () => {
      sweep(types.start, (w) => w[0])
    })

    it(`END lines share the same whole last word, ${SEEDS} seeds`, () => {
      sweep(types.end, (w) => w[w.length - 1])
    })
  })

  // textgen-monorepo-986: pattern/search run a full compromise parse over
  // every selected sentence (~300x the text size in memory). Multi-MB corpus
  // selections OOM'd or timed out on Lambda, so they parse a seeded window.
  describe('NLP input cap', () => {
    const Util = require(`../src/lib/util.js`)
    const { capSentences, NLP_CHAR_CAP } = LinereduceRunner
    const sentence = (i) => `Sentence number ${i} is about a red fox.`
    const many = Array.from({ length: 20000 }, (_, i) => sentence(i))
    const chars = (arr) => arr.reduce((n, s) => n + s.length + 1, 0)

    it('leaves selections under the cap untouched, drawing no randomness', () => {
      const few = many.slice(0, 10)
      const a = new Util({ seed: 'cap' })
      const b = new Util({ seed: 'cap' })
      expect(capSentences(few, a)).to.equal(few)
      expect(a.random()).to.equal(b.random())
    })

    it('returns a contiguous window within the cap, chosen by seed', () => {
      const w1 = capSentences(many, new Util({ seed: 'cap-1' }))
      const w1again = capSentences(many, new Util({ seed: 'cap-1' }))
      const w2 = capSentences(many, new Util({ seed: 'cap-2' }))
      expect(chars(w1)).to.be.at.most(NLP_CHAR_CAP)
      expect(chars(w1)).to.be.above(NLP_CHAR_CAP * 0.9)
      expect(w1).to.deep.equal(w1again)
      expect(w1[0]).to.not.equal(w2[0])
      const start = many.indexOf(w1[0])
      w1.forEach((s, i) => expect(s).to.equal(many[(start + i) % many.length]))
    })

    it('pattern path only parses the capped window', function () {
      this.timeout(60000)
      const reduced = new LinereduceRunner({
        util: new Util({ seed: 'cap-pattern' }),
        texts: [{ name: 'big', sentences: () => many }],
        reduceType: types.pattern
      })
      expect(reduced.text.length).to.be.at.most(NLP_CHAR_CAP)
    })
  })
})
