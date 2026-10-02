'use strict'

;(function () {
  var chai = require('chai'),
    expect = chai.expect,
    pkg = require('../package.json'),
    textutil = require('../lib/textutil.js')

  describe('textutil', function () {
    it('does not depend on the abandoned nlp_compromise package', function () {
      expect(pkg.dependencies).to.not.have.property('nlp_compromise')
      expect(pkg.dependencies).to.have.property('compromise')
    })

    describe('sentencify', function () {
      it('splits text into an array of trimmed sentences', function () {
        var text = 'Hello world. This is a test. Did it work?'
        expect(textutil.sentencify(text)).to.deep.equal([
          'Hello world.',
          'This is a test.',
          'Did it work?'
        ])
      })

      // sentencify uses the tokenizer-only compromise/one build (no POS
      // tagging) for speed; output must match the full parse exactly
      describe('matches full compromise sentence parse', function () {
        var nlp = require('compromise'),
          debreak = require('../lib/debreak.js'),
          Corpora = require('../index.js')
        var full = function (text) {
          var t = debreak(text).replace(/\t/g, ' ').replace(/^ +/g, '')
          return nlp(t).sentences().out('array')
        }
        var fixtures = {
          abbreviations:
            'Mr. Smith went to Washington, D.C. on Jan. 5th. Dr. Who? No... maybe.',
          quotes:
            '"Stop!" she said. \'Why?\' he asked.  It was 3.14 p.m. in the U.S.A.',
          linebreaks: 'A line\nthat wraps\n\nA new paragraph.\tTabbed! End',
          dubliners: new Corpora().texts
            .filter(function (x) {
              return /dubliners/i.test(x.name)
            })[0]
            .text()
            .slice(0, 30000)
        }
        Object.keys(fixtures).forEach(function (name) {
          it(name, function () {
            this.timeout(10000)
            expect(textutil.sentencify(fixtures[name])).to.deep.equal(
              full(fixtures[name])
            )
          })
        })
      })

      it('joins an array of texts before splitting', function () {
        var texts = ['Hello world.', 'This is a test.']
        expect(textutil.sentencify(texts)).to.deep.equal([
          'Hello world.',
          'This is a test.'
        ])
      })
    })
  })
})()
