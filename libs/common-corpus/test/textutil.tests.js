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
        // reference: full parse, one paragraph at a time (paragraphs are
        // hard sentence boundaries; raw text is debreaked once)
        var full = function (text) {
          var t = /\n[ \t]*\n/.test(text) ? debreak(text) : text
          return t
            .split('\n')
            .map(function (p) {
              return p.replace(/\t/g, ' ').replace(/^ +/g, '')
            })
            .filter(function (p) {
              return p.trim()
            })
            .reduce(function (acc, p) {
              return acc.concat(nlp(p).sentences().out('array'))
            }, [])
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

      // textgen-monorepo-qi5: loaded texts are already debreaked (one
      // paragraph per line). sentencify used to debreak AGAIN, which joined
      // every paragraph into one, so unpunctuated lines (lists, headings,
      // labels, table rows) fused into giant 'sentences'.
      describe('paragraph boundaries (qi5)', function () {
        it('keeps unpunctuated paragraphs of debreaked text separate', function () {
          var debreaked =
            'I am very glad to have the honor\nI am very happy to be here\nThe end.'
          expect(textutil.sentencify(debreaked)).to.deep.equal([
            'I am very glad to have the honor',
            'I am very happy to be here',
            'The end.'
          ])
        })

        it('still rejoins word-wrapped raw text before splitting', function () {
          var raw = 'A line\nthat wraps\n\nA new paragraph'
          expect(textutil.sentencify(raw)).to.deep.equal([
            'A line that wraps',
            'A new paragraph'
          ])
        })

        it('gives the same result on raw text and on its debreaked form', function () {
          var debreak = require('../lib/debreak.js')
          var raw =
            'One wrapped\nline here\n\nGDP - real growth rate:\n\nagriculture\n\nDone. Yes.'
          expect(textutil.sentencify(debreak(raw))).to.deep.equal(
            textutil.sentencify(raw)
          )
        })

        it('treats each text in an array as its own paragraph', function () {
          expect(
            textutil.sentencify(['A heading', 'Body text here.'])
          ).to.deep.equal(['A heading', 'Body text here.'])
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
