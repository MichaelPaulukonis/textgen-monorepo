'use strict';

/**
 * Tests for common-corpus workspace integration
 * Verifies that the library works correctly in the Nx monorepo context
 */

(function() {

  var chai = require('chai'),
      expect = chai.expect,
      path = require('path'),
      fs = require('fs');

  describe('Workspace Integration Tests', function() {

    describe('Package Configuration', function() {

      it('should have correct package.json structure for workspace', function() {
        const packagePath = path.join(__dirname, '../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        expect(packageJson.name).to.equal('common-corpus');
        expect(packageJson.main).to.equal('index.js');
        expect(packageJson.scripts).to.have.property('build:layer');
        expect(packageJson.scripts).to.have.property('test');
      });

      it('should have Nx project configuration', function() {
        const projectPath = path.join(__dirname, '../project.json');
        const projectJson = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
        
        expect(projectJson.name).to.equal('common-corpus');
        expect(projectJson.projectType).to.equal('library');
        expect(projectJson.targets).to.have.property('test');
        expect(projectJson.targets).to.have.property('build-layer');
      });

    });

    describe('Dependency Resolution', function() {

      it('should resolve standard index.js from workspace context', function() {
        const Corpora = require('../index.js');
        expect(Corpora).to.be.a('function');
        
        const corpora = new Corpora();
        expect(corpora).to.be.an.instanceof(Corpora);
        expect(corpora.texts).to.be.instanceOf(Array);
      });

      it('should resolve lambda-index.js from workspace context', function() {
        const LambdaCorpora = require('../lambda-index.js');
        expect(LambdaCorpora).to.be.a('function');
        
        const corpora = new LambdaCorpora();
        expect(corpora).to.be.an.instanceof(LambdaCorpora);
        expect(corpora.texts).to.be.instanceOf(Array);
      });

    });

    describe('File Structure Integrity', function() {

      it('should maintain corpus directory structure', function() {
        const corpusPath = path.join(__dirname, '../corpus');
        expect(fs.existsSync(corpusPath)).to.be.true;
        
        const corpusContents = fs.readdirSync(corpusPath);
        expect(corpusContents.length).to.be.greaterThan(0);
      });

      it('should preserve both index.js and lambda-index.js', function() {
        const indexPath = path.join(__dirname, '../index.js');
        const lambdaIndexPath = path.join(__dirname, '../lambda-index.js');
        
        expect(fs.existsSync(indexPath)).to.be.true;
        expect(fs.existsSync(lambdaIndexPath)).to.be.true;
      });

      it('should maintain lib directory with utilities', function() {
        const libPath = path.join(__dirname, '../lib');
        expect(fs.existsSync(libPath)).to.be.true;
        
        const debreakPath = path.join(libPath, 'debreak.js');
        const textutilPath = path.join(libPath, 'textutil.js');
        
        expect(fs.existsSync(debreakPath)).to.be.true;
        expect(fs.existsSync(textutilPath)).to.be.true;
      });

    });

  });

}());