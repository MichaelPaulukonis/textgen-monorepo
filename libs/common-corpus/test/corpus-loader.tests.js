'use strict';

/**
 * Tests for the consolidated Corpora loader (post index.js/lambda-index.js merge).
 * Covers behavior that didn't previously have coverage: CORPUS_PATH override,
 * cache eviction, case-insensitive/robust cleanName, and per-file load resilience.
 */

(function() {

  var chai = require('chai'),
      expect = chai.expect,
      fs = require('fs'),
      os = require('os'),
      path = require('path'),
      Corpora = require('../index.js');

  describe('Corpus loader (consolidated)', function() {

    describe('cleanName', function() {

      var corpora;

      before(function() {
        corpora = new Corpora();
      });

      it('strips a lowercase .txt extension', function() {
        expect(corpora.cleanName('foo.txt')).to.equal('foo');
      });

      it('strips extensions case-insensitively', function() {
        expect(corpora.cleanName('SWSECOND.TXT')).to.equal('SWSECOND');
      });

      it('strips a leading forward slash', function() {
        expect(corpora.cleanName('/foo.txt')).to.equal('foo');
      });

      it('strips a leading backslash', function() {
        expect(corpora.cleanName('\\foo.txt')).to.equal('foo');
      });

      it('does not eat the last character of the basename', function() {
        // regression: the old unescaped /.(txt|js|zip)$/g matched any char
        // before the extension, silently eating "z" from "quiz.txt"
        expect(corpora.cleanName('quiz.txt')).to.equal('quiz');
      });

    });

    describe('CORPUS_PATH override', function() {

      var tmpDir;

      beforeEach(function() {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'common-corpus-test-'));
        fs.writeFileSync(path.join(tmpDir, 'sample.txt'), 'Hello world. This is a test.');
        process.env.CORPUS_PATH = tmpDir;
      });

      afterEach(function() {
        delete process.env.CORPUS_PATH;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      });

      it('loads texts from CORPUS_PATH instead of the bundled corpus/ dir', function() {
        var corpora = new Corpora();
        expect(corpora.texts).to.have.lengthOf(1);
        expect(corpora.texts[0].name).to.equal('sample');
      });

      it('reads the actual file content from CORPUS_PATH', function() {
        var corpora = new Corpora();
        expect(corpora.texts[0].text()).to.contain('Hello world');
      });

    });

    describe('cache eviction', function() {

      var tmpDir;

      beforeEach(function() {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'common-corpus-cache-'));
        fs.writeFileSync(path.join(tmpDir, 'one.txt'), 'First text.');
        fs.writeFileSync(path.join(tmpDir, 'two.txt'), 'Second text.');
        fs.writeFileSync(path.join(tmpDir, 'three.txt'), 'Third text.');
        process.env.CORPUS_PATH = tmpDir;
      });

      afterEach(function() {
        delete process.env.CORPUS_PATH;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      });

      it('respects maxCacheSize, evicting older entries', function() {
        var corpora = new Corpora({ maxCacheSize: 2 });
        corpora.texts.forEach(function(t) { t.text(); });
        var stats = corpora.getCacheStats();
        expect(stats.cacheSize).to.be.at.most(2);
      });

      it('exposes cache stats with maxCacheSize', function() {
        var corpora = new Corpora({ maxCacheSize: 2 });
        expect(corpora.getCacheStats().maxCacheSize).to.equal(2);
      });

      it('clearCache empties the cache', function() {
        var corpora = new Corpora();
        corpora.texts[0].text();
        corpora.clearCache();
        expect(corpora.getCacheStats().cacheSize).to.equal(0);
      });

    });

    describe('per-file load resilience', function() {

      var tmpDir;

      beforeEach(function() {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'common-corpus-broken-'));
        fs.writeFileSync(path.join(tmpDir, 'broken.sentences.js'), 'this is not valid javascript {{{');
        process.env.CORPUS_PATH = tmpDir;
      });

      afterEach(function() {
        delete process.env.CORPUS_PATH;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      });

      it('does not throw constructing Corpora when a sentences file fails to parse', function() {
        expect(function() { new Corpora(); }).to.not.throw();
      });

      it('returns an empty string from text() for an unparseable sentences file', function() {
        var corpora = new Corpora();
        expect(corpora.texts[0].text()).to.equal('');
      });

      it('returns an empty array from sentences() for an unparseable sentences file', function() {
        var corpora = new Corpora();
        expect(corpora.texts[0].sentences()).to.deep.equal([]);
      });

    });

    describe('readFile error handling', function() {

      it('throws a descriptive error for a missing file', function() {
        var corpora = new Corpora();
        expect(function() { corpora.readFile('/nonexistent/file.txt'); }).to.throw();
      });

    });

    describe('no zip/archive support', function() {

      it('does not depend on node-zipkit or mkdirp', function() {
        var packageJson = require('../package.json');
        expect(packageJson.dependencies).to.not.have.property('node-zipkit');
        expect(packageJson.dependencies).to.not.have.property('mkdirp');
      });

    });

  });

}());
