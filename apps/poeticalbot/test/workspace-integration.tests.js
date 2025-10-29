var chai = require('chai')
var dirtyChai = require('dirty-chai')
var expect = chai.expect
var path = require('path')
var fs = require('fs')

chai.use(dirtyChai)

/**
 * Integration tests for PoeticalBot workspace integration
 * Verifies that the application works correctly in the Nx monorepo context
 */

describe('PoeticalBot Workspace Integration', () => {
  describe('Package Configuration', () => {
    it('should have correct package.json structure for workspace', () => {
      const packagePath = path.join(__dirname, '../package.json')
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
      
      expect(packageJson.name).to.equal('poeticalbot')
      expect(packageJson.main).to.equal('src/index.js')
      expect(packageJson.dependencies).to.have.property('common-corpus')
      expect(packageJson.dependencies['common-corpus']).to.equal('workspace:*')
    })

    it('should have Nx project configuration', () => {
      const projectPath = path.join(__dirname, '../project.json')
      const projectJson = JSON.parse(fs.readFileSync(projectPath, 'utf8'))
      
      expect(projectJson.name).to.equal('poeticalbot')
      expect(projectJson.projectType).to.equal('application')
      expect(projectJson.targets).to.have.property('test')
      expect(projectJson.targets).to.have.property('deploy')
      expect(projectJson.implicitDependencies).to.include('common-corpus')
    })
  })

  describe('Common-Corpus Dependency Resolution', () => {
    it('should resolve common-corpus from workspace', () => {
      // This test verifies that common-corpus can be required from the workspace
      const Corpora = require('common-corpus')
      expect(Corpora).to.be.a('function')
      
      const corpora = new Corpora()
      expect(corpora).to.be.an.instanceof(Corpora)
      expect(corpora.texts).to.be.instanceOf(Array)
    })

    it('should use common-corpus in poetifier functionality', () => {
      // Test that poetifier can use the workspace common-corpus
      // Set up minimal test environment variables
      const originalEnv = {
        CONSUMER_KEY: process.env.CONSUMER_KEY,
        CONSUMER_SECRET: process.env.CONSUMER_SECRET,
        TOKEN: process.env.TOKEN,
        TOKEN_SECRET: process.env.TOKEN_SECRET
      }
      
      // Set test credentials
      process.env.CONSUMER_KEY = 'test_key'
      process.env.CONSUMER_SECRET = 'test_secret'
      process.env.TOKEN = 'test_token'
      process.env.TOKEN_SECRET = 'test_token_secret'
      
      try {
        // Clear require cache to get fresh config
        delete require.cache[require.resolve('../src/config.js')]
        const config = require('../src/config.js')
        const Poetifier = require('../src/lib/poetifier.js')
        
        // Poetifier expects options.config structure
        const poetifierOptions = { config: config }
        const poetifier = new Poetifier(poetifierOptions)
        expect(poetifier).to.be.an.instanceof(Poetifier)
      } finally {
        // Restore original environment
        Object.keys(originalEnv).forEach(key => {
          if (originalEnv[key] !== undefined) {
            process.env[key] = originalEnv[key]
          } else {
            delete process.env[key]
          }
        })
        
        // Clear require cache again
        delete require.cache[require.resolve('../src/config.js')]
      }
    })

    it('should access corpus texts through workspace dependency', () => {
      const Corpora = require('common-corpus')
      const corpora = new Corpora()
      
      // Verify we can access texts
      expect(corpora.texts.length).to.be.greaterThan(0)
      
      // Verify we can get text content
      if (corpora.texts.length > 0) {
        const firstText = corpora.texts[0]
        expect(firstText.name).to.be.a('string')
        expect(firstText.text).to.be.a('function')
        
        const textContent = firstText.text()
        expect(textContent).to.be.a('string')
        expect(textContent.length).to.be.greaterThan(0)
      }
    })
  })

  describe('Application Structure Integrity', () => {
    it('should maintain existing lambda directory structure', () => {
      const lambdaPath = path.join(__dirname, '../lambda')
      expect(fs.existsSync(lambdaPath)).to.be.true()
      
      const lambdaIndexPath = path.join(lambdaPath, 'index.js')
      expect(fs.existsSync(lambdaIndexPath)).to.be.true()
    })

    it('should maintain existing terraform configuration', () => {
      const terraformPath = path.join(__dirname, '../terraform')
      expect(fs.existsSync(terraformPath)).to.be.true()
      
      const terraformMainPath = path.join(terraformPath, 'main.tf')
      expect(fs.existsSync(terraformMainPath)).to.be.true()
    })

    it('should preserve .kiro configuration', () => {
      const kiroPath = path.join(__dirname, '../.kiro')
      expect(fs.existsSync(kiroPath)).to.be.true()
    })

    it('should preserve .specstory configuration', () => {
      const specstoryPath = path.join(__dirname, '../.specstory')
      expect(fs.existsSync(specstoryPath)).to.be.true()
    })

    it('should maintain existing source structure', () => {
      const srcPath = path.join(__dirname, '../src')
      expect(fs.existsSync(srcPath)).to.be.true()
      
      const indexPath = path.join(srcPath, 'index.js')
      const cliPath = path.join(srcPath, 'cli.js')
      const configPath = path.join(srcPath, 'config.js')
      
      expect(fs.existsSync(indexPath)).to.be.true()
      expect(fs.existsSync(cliPath)).to.be.true()
      expect(fs.existsSync(configPath)).to.be.true()
    })
  })

  describe('CLI Integration', () => {
    it('should be able to load CLI module', () => {
      expect(() => {
        require('../src/cli.js')
      }).to.not.throw()
    })

    it('should be able to load main application module', () => {
      expect(() => {
        require('../src/index.js')
      }).to.not.throw()
    })
  })

  describe('Configuration Integration', () => {
    it('should load configuration without errors', () => {
      expect(() => {
        const config = require('../src/config.js')
        expect(config).to.be.an('object')
      }).to.not.throw()
    })

    it('should maintain environment configuration', () => {
      const envPath = path.join(__dirname, '../.env')
      const envSamplePath = path.join(__dirname, '../.env.sample')
      
      // At least one should exist
      const hasEnvConfig = fs.existsSync(envPath) || fs.existsSync(envSamplePath)
      expect(hasEnvConfig).to.be.true()
    })
  })
})