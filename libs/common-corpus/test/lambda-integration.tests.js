'use strict';

/**
 * Tests for lambda-index.js functionality in monorepo context
 * Verifies Lambda-optimized version works correctly
 */

(function() {

  var chai = require('chai'),
      expect = chai.expect,
      LambdaCorpora = require('../lambda-index.js');

  describe('Lambda Integration Tests', function() {

    describe('Lambda-Optimized API', function() {

      it('should create instance with default configuration', function() {
        const corpora = new LambdaCorpora();
        expect(corpora).to.be.an.instanceof(LambdaCorpora);
        expect(corpora.texts).to.be.instanceOf(Array);
      });

      it('should create instance without new keyword', function() {
        const corpora = LambdaCorpora();
        expect(corpora).to.be.an.instanceof(LambdaCorpora);
      });

      it('should accept configuration options', function() {
        const corpora = new LambdaCorpora({ maxCacheSize: 5 });
        const config = corpora.getConfig();
        expect(config.maxCacheSize).to.equal(5);
      });

    });

    describe('Enhanced Lambda Methods', function() {

      let corpora;

      beforeEach(function() {
        corpora = new LambdaCorpora();
      });

      it('should provide health check functionality', function() {
        const health = corpora.healthCheck();
        expect(health).to.be.an('object');
        expect(health.status).to.equal('ok');
        expect(health.textsLoaded).to.be.a('number');
        expect(health.cacheSize).to.be.a('number');
        expect(health.timestamp).to.be.a('string');
      });

      it('should provide cache statistics', function() {
        const stats = corpora.getCacheStats();
        expect(stats).to.be.an('object');
        expect(stats.cacheSize).to.be.a('number');
        expect(stats.maxCacheSize).to.be.a('number');
        expect(stats.cachedTexts).to.be.instanceOf(Array);
      });

      it('should allow cache clearing', function() {
        // Load some text to populate cache
        if (corpora.texts.length > 0) {
          corpora.texts[0].text();
        }
        
        corpora.clearCache();
        const stats = corpora.getCacheStats();
        expect(stats.cacheSize).to.equal(0);
      });

    });

    describe('Functional Compatibility', function() {

      let corpora;

      beforeEach(function() {
        corpora = new LambdaCorpora();
      });

      it('should maintain same API as standard version', function() {
        expect(corpora.texts).to.be.instanceOf(Array);
        expect(corpora.filter).to.be.a('function');
        expect(corpora.readFile).to.be.a('function');
        expect(corpora.cleanName).to.be.a('function');
      });

      it('should provide text content like standard version', function() {
        if (corpora.texts.length > 0) {
          const text = corpora.texts[0].text();
          expect(text).to.be.a('string');
          expect(text.length).to.be.greaterThan(0);
        }
      });

      it('should provide sentences like standard version', function() {
        this.timeout(10000); // Allow time for sentence processing
        
        if (corpora.texts.length > 0) {
          const sentences = corpora.texts[0].sentences();
          expect(sentences).to.be.instanceOf(Array);
          if (sentences.length > 0) {
            expect(sentences[0]).to.be.a('string');
          }
        }
      });

      it('should filter texts correctly', function() {
        const allTexts = corpora.texts.length;
        if (allTexts > 0) {
          // Try to find a text with a common word
          const filtered = corpora.filter('the');
          expect(filtered).to.be.instanceOf(Array);
          // Filter should return subset or same set, never more
          expect(filtered.length).to.be.at.most(allTexts);
        }
      });

    });

    describe('Error Handling', function() {

      let corpora;

      beforeEach(function() {
        corpora = new LambdaCorpora();
      });

      it('should handle invalid filter patterns gracefully', function() {
        const result = corpora.filter('[invalid regex');
        expect(result).to.be.instanceOf(Array);
        expect(result.length).to.equal(0);
      });

      it('should handle missing files gracefully', function() {
        // This test verifies error handling is in place
        // Actual missing file scenarios would be environment-specific
        expect(() => {
          corpora.readFile('/nonexistent/file.txt');
        }).to.throw();
      });

    });

    describe('Memory Management', function() {

      it('should respect cache size limits', function() {
        const corpora = new LambdaCorpora({ maxCacheSize: 2 });
        
        // Load texts to test cache eviction
        if (corpora.texts.length >= 3) {
          corpora.texts[0].text();
          corpora.texts[1].text();
          corpora.texts[2].text(); // Should evict first entry
          
          const stats = corpora.getCacheStats();
          expect(stats.cacheSize).to.be.at.most(2);
        }
      });

    });

  });

}());