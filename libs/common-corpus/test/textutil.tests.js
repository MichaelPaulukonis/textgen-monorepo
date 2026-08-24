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
