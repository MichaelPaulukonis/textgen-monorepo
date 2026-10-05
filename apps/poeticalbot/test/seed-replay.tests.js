const chai = require('chai')
const expect = chai.expect

const mispelr = require(`node-mispelr`)
const Poetifier = require(`../src/lib/poetifier.js`)

// textgen-monorepo-e8o: the same seed must produce the same poem, run after
// run in one process. Guards the leaks found under ecv (unseeded Util in
// pattern-match.js) and ovo (node-mispelr's bare Math.random), and anything
// like them. Poetifier mutates its config, so each run gets a fresh copy.
// Pinned to one small text: whole-corpus runs take 1ms-30s+ per poem, and
// corpus selection is already seeded upstream of both leaks.
describe(`seed replay`, function () {
  this.timeout(60000)

  const corporaFilter = `hugh.selwyn.mauberley`

  const poemFor = (config) => new Poetifier({ config: { ...config } }).poem()

  const expectReplays = (seeds, config) => {
    seeds.forEach((seed) => {
      const first = poemFor({ ...config, corporaFilter, seed })
      const second = poemFor({ ...config, corporaFilter, seed })
      // two identical errors would also deep-equal
      expect(first.error, `seed ${seed}`).to.be.undefined
      expect(second, `seed ${seed}`).to.deep.equal(first)
    })
  }

  const seeds = (prefix, n) =>
    Array.from({ length: n }, (_, i) => `${prefix}-${i}`)

  // count calls into the two formerly leaky paths, so a pass can't come from
  // never reaching them
  let respellCalls
  let origRespell
  beforeEach(() => {
    respellCalls = 0
    origRespell = mispelr.respell
    mispelr.respell = function () {
      respellCalls++
      return origRespell.apply(this, arguments)
    }
  })
  afterEach(() => {
    mispelr.respell = origRespell
  })

  it(`random pipeline with a transform on every poem`, () => {
    expectReplays(seeds(`any`, 40), { transform: true, transformChance: 1 })
    expect(respellCalls, `mispeller transform reached`).to.be.above(0)
  })

  // reduce + reduceType force lrRunner's pattern branch (poetifier.js)
  it(`linereduce pattern path`, () => {
    expectReplays(seeds(`pattern`, 20), { reduce: true, reduceType: `pattern` })
  })
})
