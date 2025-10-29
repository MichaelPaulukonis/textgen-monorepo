let expect = require(`chai`).expect
let util = new (require(`../src/lib/util.js`))()
let Titlifier = require(`../src/lib/titlifier`).Titlifier
let titlifierTypes = require(`../src/lib/titlifier`).types
let titlifier = new (require(`../src/lib/titlifier`)).Titlifier({ util: util })

describe(`titlefier tests`, function () {
  describe(`API`, function () {
    it(`should return a new instance with new`, function () {
      var newtitlifier = new Titlifier({ util: util })
      expect(newtitlifier).to.be.a(`object`)
      expect(newtitlifier).to.be.an.instanceof(Titlifier)
    })

    it(`should return a new instance even without new`, function () {
      var titlifier = Titlifier({ util: util })
      expect(titlifier).to.be.a(`object`)
      expect(titlifier).to.be.an.instanceof(Titlifier)
    })

    it(`should throw a TypeError if not provided with a util`, function () {
      expect(function () {
        (() => new Titlifier())()
      }).to.throw(Error)
    })

    it(`should expose a generate method`, function () {
      expect(titlifier.generate).to.be.a(`function`)
    })

    it(`should expose types`, function () {
      expect(titlifierTypes).to.be.an(`object`)
    })
  })

  describe(`generate title`, function () {
    it(`should return [UNTITLED] if provided with empty string`, function () {
      expect(titlifier.generate(``)).to.equal(`[UNTITLED]`)
    })

    it(`should return [UNTITLED] if provided with no text`, function () {
      expect(titlifier.generate()).to.equal(`[UNTITLED]`)
    })
  })

  describe(`generate title with explicit methods from all-punct blob`, function () {
    let puncts = [`..............................................`,
      `.........................................`,
      `...................................`,
      `..............................`,
      `.........................`,
      `....................`,
      `...............`,
      `..........`,
      `.....`]
    let punctpoem = puncts.join(`\n`)
    let firstLine = puncts[0]
    let lastLine = puncts[puncts.length - 1]

    it(`should return the first line when indicated`, function () {
      expect(titlifier.generate(punctpoem, titlifierTypes.LineFirst)).to.equal(firstLine)
    })

    it(`should return the last line when indicated`, function () {
      expect(titlifier.generate(punctpoem, titlifierTypes.LineLast)).to.equal(lastLine)
    })

    it(`should return a random line when indicated`, function () {
      expect(titlifier.generate(punctpoem, titlifierTypes.RandomLine)).to.have.length.above(lastLine.length - 1)
    })

    it(`should not fail when summary indicated`, function () {
      expect(() => titlifier.generate(punctpoem, titlifierTypes.Summary)).to.not.throw(Error)
    })

    it(`should not fail when summary indicated`, function () {
      expect(titlifier.generate(punctpoem, titlifierTypes.Summary)).to.equal(`[UNTITLED]`)
    })
  })
})
