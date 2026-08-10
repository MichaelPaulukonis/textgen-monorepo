var chai = require(`chai`)
var expect = chai.expect
var Util = require(`../src/lib/util.js`)
var util = new Util()

describe(`util tests`, () => {
  describe(`API tests`, () => {
    it(`should return a new instance with new`, () => {
      var newutil = new Util()
      expect(newutil).to.be.a(`object`)
      expect(newutil).to.be.an.instanceof(Util)
    })

    it(`should return a new instance even without new`, () => {
      var util = Util()
      expect(util).to.be.a(`object`)
      expect(util).to.be.an.instanceof(Util)
    })

    it(`should expose a debug method`, () => {
      expect(util.debug).to.be.a(`function`)
    })

    it(`should expose a debugOutput method`, () => {
      expect(util.debugOutput).to.be.a(`function`)
    })

    it(`should expose a randomProperty method`, () => {
      expect(util.randomProperty).to.be.a(`function`)
    })

    it(`should expose a pick method`, () => {
      expect(util.pick).to.be.a(`function`)
    })

    it(`should expose a pickCount method`, () => {
      expect(util.pickCount).to.be.a(`function`)
    })

    it(`should expose a random method`, () => {
      expect(util.random).to.be.a(`function`)
    })

    it(`should expose a randomInRange method`, () => {
      expect(util.randomInRange).to.be.a(`function`)
    })

    it(`should expose a coinflip method`, () => {
      expect(util.coinflip).to.be.a(`function`)
    })

    it(`should expose a pickRemove method`, () => {
      expect(util.pickRemove).to.be.a(`function`)
    })

    it(`should expose a shuffle method`, () => {
      expect(util.shuffle).to.be.a(`function`)
    })

    // TODO: okay, now actually test the methods!
  })

  describe(`functional tests`, () => {
    describe(`pickRemove`, () => {
      // regression: random-seed's math.random() takes no arguments, so
      // math.random(arr.length) silently ignored the arg and returned a
      // float in [0,1), truncated to index 0 by splice — pickRemove
      // always removed the first element, never a random one.
      it(`removes elements in a seeded-random order, not always index 0`, () => {
        var seededUtil = new Util({ seed: `test-seed`, statusVerbosity: 0 })
        var arr = [`a`, `b`, `c`, `d`, `e`]
        var removed = [1, 2, 3, 4, 5].map(() => seededUtil.pickRemove(arr))
        expect(removed).to.deep.equal([`e`, `a`, `b`, `c`, `d`])
      })

      it(`removes and returns exactly one element, shrinking the array by one`, () => {
        var arr = [`a`, `b`, `c`]
        var removedItem = util.pickRemove(arr)
        expect(arr).to.have.lengthOf(2)
        expect([`a`, `b`, `c`]).to.include(removedItem)
        expect(arr).to.not.include(removedItem)
      })
    })
  })
})
