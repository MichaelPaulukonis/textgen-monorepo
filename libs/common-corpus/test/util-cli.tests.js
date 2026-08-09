'use strict';

/**
 * Tests for the util.js CLI (node util.js --list / --filter / --text).
 * Regression coverage for a silent-failure bug: commander's option
 * values were read as program.list/program.filter/program.text, which
 * is undefined with the installed commander version — every branch in
 * util.js was always false, so the CLI produced no output for any flag.
 */

(function() {

  var chai = require('chai'),
      expect = chai.expect,
      execSync = require('child_process').execSync;

  describe('util.js CLI', function() {

    this.timeout(10000);

    it('--list prints corpus text names', function() {
      var result = execSync('node util.js --list', { encoding: 'utf8' });
      expect(result).to.match(/Total: \d+/);
    });

    it('--filter prints only matching texts', function() {
      var result = execSync('node util.js --filter gibson', { encoding: 'utf8' });
      expect(result.toLowerCase()).to.contain('gibson');
      expect(result).to.match(/Total: \d+/);
    });

    it('--text prints the full text of a single matching entry', function() {
      var listOutput = execSync('node util.js --filter gibson', { encoding: 'utf8' });
      var firstName = listOutput.split('\n')[0];
      var result = execSync('node util.js --text "' + firstName + '"', { encoding: 'utf8' });
      expect(result.length).to.be.greaterThan(0);
      expect(result).to.not.match(/Total: \d+/);
    });

  });

}());
