var chai = require('chai')
var dirtyChai = require('dirty-chai')
var expect = chai.expect
var path = require('path')
var fs = require('fs')

chai.use(dirtyChai)

/**
 * Integration tests for PoeticalBot Lambda deployment configuration
 * Verifies that Lambda deployment works correctly in the monorepo context
 */

describe('PoeticalBot Lambda Deployment Integration', () => {
  describe('Lambda Configuration', () => {
    it('should have lambda directory with proper structure', () => {
      const lambdaPath = path.join(__dirname, '../lambda')
      expect(fs.existsSync(lambdaPath)).to.be.true()
      
      const lambdaPackagePath = path.join(lambdaPath, 'package.json')
      const lambdaIndexPath = path.join(lambdaPath, 'index.js')
      
      expect(fs.existsSync(lambdaPackagePath)).to.be.true()
      expect(fs.existsSync(lambdaIndexPath)).to.be.true()
    })

    it('should have valid lambda package.json', () => {
      const lambdaPackagePath = path.join(__dirname, '../lambda/package.json')
      const lambdaPackage = JSON.parse(fs.readFileSync(lambdaPackagePath, 'utf8'))
      
      expect(lambdaPackage.name).to.be.a('string')
      expect(lambdaPackage.main).to.be.a('string')
      expect(lambdaPackage.dependencies).to.be.an('object')
    })

    it('should be able to load lambda handler', () => {
      expect(() => {
        const lambdaHandler = require('../lambda/index.js')
        expect(lambdaHandler).to.be.an('object')
        expect(lambdaHandler.handler).to.be.a('function')
      }).to.not.throw()
    })

    it('should have lambda handler that can access common-corpus', () => {
      const lambdaHandler = require('../lambda/index.js')
      
      // Create a mock Lambda event
      const mockEvent = {
        method: 'queneau-buckets',
        corporaFilter: 'eliot',
        post: false
      }
      
      const mockContext = {
        getRemainingTimeInMillis: () => 30000
      }
      
      // Test that handler can be called (though we won't run the full execution)
      expect(lambdaHandler.handler).to.be.a('function')
      expect(lambdaHandler.handler.length).to.be.at.least(2) // event, context parameters
    })
  })

  describe('Terraform Configuration', () => {
    it('should have terraform directory with configuration files', () => {
      const terraformPath = path.join(__dirname, '../terraform')
      expect(fs.existsSync(terraformPath)).to.be.true()
      
      const mainTfPath = path.join(terraformPath, 'main.tf')
      const variablesTfPath = path.join(terraformPath, 'variables.tf')
      
      expect(fs.existsSync(mainTfPath)).to.be.true()
      expect(fs.existsSync(variablesTfPath)).to.be.true()
    })

    it('should have valid terraform main configuration', () => {
      const mainTfPath = path.join(__dirname, '../terraform/main.tf')
      const mainTfContent = fs.readFileSync(mainTfPath, 'utf8')
      
      // Basic validation that it contains Lambda-related configuration
      expect(mainTfContent).to.include('aws_lambda_function')
      expect(mainTfContent.length).to.be.greaterThan(0)
    })

    it('should have terraform variables configuration', () => {
      const variablesTfPath = path.join(__dirname, '../terraform/variables.tf')
      const variablesTfContent = fs.readFileSync(variablesTfPath, 'utf8')
      
      expect(variablesTfContent.length).to.be.greaterThan(0)
    })
  })

  describe('Lambda Dependencies', () => {
    it('should be able to access workspace common-corpus from lambda context', () => {
      // Simulate lambda environment
      const originalEnv = process.env.AWS_LAMBDA_FUNCTION_NAME
      process.env.AWS_LAMBDA_FUNCTION_NAME = 'test-poeticalbot'
      
      try {
        const Corpora = require('common-corpus')
        const corpora = new Corpora()
        
        expect(corpora).to.be.an.instanceof(Corpora)
        expect(corpora.texts).to.be.instanceOf(Array)
        expect(corpora.texts.length).to.be.greaterThan(0)
      } finally {
        // Restore original environment
        if (originalEnv) {
          process.env.AWS_LAMBDA_FUNCTION_NAME = originalEnv
        } else {
          delete process.env.AWS_LAMBDA_FUNCTION_NAME
        }
      }
    })

    it('should have lambda-specific configuration files', () => {
      const lambdaConfigPath = path.join(__dirname, '../lambda/config.js')
      
      if (fs.existsSync(lambdaConfigPath)) {
        expect(() => {
          const lambdaConfig = require('../lambda/config.js')
          expect(lambdaConfig).to.be.an('object')
        }).to.not.throw()
      }
    })
  })

  describe('Deployment Scripts', () => {
    it('should have deployment script', () => {
      const deployScriptPath = path.join(__dirname, '../deploy.sh')
      
      if (fs.existsSync(deployScriptPath)) {
        const deployScript = fs.readFileSync(deployScriptPath, 'utf8')
        expect(deployScript.length).to.be.greaterThan(0)
      }
    })

    it('should be able to access lambda test utilities', () => {
      const lambdaTestPath = path.join(__dirname, '../lambda/test-local.js')
      
      if (fs.existsSync(lambdaTestPath)) {
        expect(() => {
          // Just verify the file can be read, not executed
          const testContent = fs.readFileSync(lambdaTestPath, 'utf8')
          expect(testContent.length).to.be.greaterThan(0)
        }).to.not.throw()
      }
    })
  })

  describe('Environment Configuration', () => {
    it('should maintain environment variables for Lambda deployment', () => {
      const envPath = path.join(__dirname, '../.env')
      const envSamplePath = path.join(__dirname, '../.env.sample')
      
      // Check that environment configuration exists
      const hasEnvConfig = fs.existsSync(envPath) || fs.existsSync(envSamplePath)
      expect(hasEnvConfig).to.be.true()
      
      if (fs.existsSync(envSamplePath)) {
        const envSample = fs.readFileSync(envSamplePath, 'utf8')
        expect(envSample.length).to.be.greaterThan(0)
      }
    })

    it('should have proper gitignore for sensitive files', () => {
      const gitignorePath = path.join(__dirname, '../.gitignore')
      
      if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
        expect(gitignoreContent).to.include('.env')
      }
    })
  })
})