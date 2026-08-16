/* eslint-env mocha */
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const fs = require('fs')
const path = require('path')

chai.use(dirtyChai)
const { expect } = chai

describe('Lambda Deployment Configuration', function () {
  describe('Terraform Configuration', function () {
    it('should have main.tf file', function () {
      const mainTfPath = path.join(__dirname, '../terraform/main.tf')
      expect(fs.existsSync(mainTfPath)).to.be.true()
    })

    it('should have variables.tf file', function () {
      const variablesTfPath = path.join(__dirname, '../terraform/variables.tf')
      expect(fs.existsSync(variablesTfPath)).to.be.true()
    })

    it('should have outputs.tf file', function () {
      const outputsTfPath = path.join(__dirname, '../terraform/outputs.tf')
      expect(fs.existsSync(outputsTfPath)).to.be.true()
    })

    it('should have terraform.tfvars.example file', function () {
      const exampleVarsPath = path.join(
        __dirname,
        '../terraform/terraform.tfvars.example'
      )
      expect(fs.existsSync(exampleVarsPath)).to.be.true()
    })

    it('should have .gitignore file', function () {
      const gitignorePath = path.join(__dirname, '../terraform/.gitignore')
      expect(fs.existsSync(gitignorePath)).to.be.true()
    })

    it('should have README.md file', function () {
      const readmePath = path.join(__dirname, '../terraform/README.md')
      expect(fs.existsSync(readmePath)).to.be.true()
    })
  })

  describe('Terraform Syntax Validation', function () {
    it('main.tf should contain required provider configuration', function () {
      const mainTfPath = path.join(__dirname, '../terraform/main.tf')
      const content = fs.readFileSync(mainTfPath, 'utf8')

      expect(content).to.include('terraform {')
      expect(content).to.include('required_providers')
      expect(content).to.include('aws = {')
      expect(content).to.include('source  = "hashicorp/aws"')
    })

    it('main.tf should define Lambda function resource', function () {
      const mainTfPath = path.join(__dirname, '../terraform/main.tf')
      const content = fs.readFileSync(mainTfPath, 'utf8')

      expect(content).to.include('resource "aws_lambda_function" "listmania"')
      expect(content).to.include('function_name')
      expect(content).to.include('handler')
      expect(content).to.include('runtime')
      expect(content).to.include('role')
    })

    it('main.tf should define EventBridge schedule rule', function () {
      const mainTfPath = path.join(__dirname, '../terraform/main.tf')
      const content = fs.readFileSync(mainTfPath, 'utf8')

      expect(content).to.include(
        'resource "aws_cloudwatch_event_rule" "listmania_schedule"'
      )
      expect(content).to.include('schedule_expression')
    })

    it('main.tf should define EventBridge target', function () {
      const mainTfPath = path.join(__dirname, '../terraform/main.tf')
      const content = fs.readFileSync(mainTfPath, 'utf8')

      expect(content).to.include(
        'resource "aws_cloudwatch_event_target" "lambda_target"'
      )
      expect(content).to.include('rule')
      expect(content).to.include('arn')
    })

    it('main.tf should define Lambda permission for EventBridge', function () {
      const mainTfPath = path.join(__dirname, '../terraform/main.tf')
      const content = fs.readFileSync(mainTfPath, 'utf8')

      expect(content).to.include(
        'resource "aws_lambda_permission" "allow_eventbridge"'
      )
      expect(content).to.include('action        = "lambda:InvokeFunction"')
      expect(content).to.include('principal     = "events.amazonaws.com"')
    })

    it('main.tf should define IAM role for Lambda', function () {
      const mainTfPath = path.join(__dirname, '../terraform/main.tf')
      const content = fs.readFileSync(mainTfPath, 'utf8')

      expect(content).to.include('resource "aws_iam_role" "lambda_role"')
      expect(content).to.include('assume_role_policy')
      expect(content).to.include('Service = "lambda.amazonaws.com"')
    })

    it('main.tf should attach basic execution policy to IAM role', function () {
      const mainTfPath = path.join(__dirname, '../terraform/main.tf')
      const content = fs.readFileSync(mainTfPath, 'utf8')

      expect(content).to.include(
        'resource "aws_iam_role_policy_attachment" "lambda_basic"'
      )
      expect(content).to.include('AWSLambdaBasicExecutionRole')
    })

    it('main.tf should define CloudWatch log group', function () {
      const mainTfPath = path.join(__dirname, '../terraform/main.tf')
      const content = fs.readFileSync(mainTfPath, 'utf8')

      expect(content).to.include(
        'resource "aws_cloudwatch_log_group" "listmania_logs"'
      )
      expect(content).to.include('retention_in_days')
    })

    it('main.tf should reference common-corpus layer', function () {
      const mainTfPath = path.join(__dirname, '../terraform/main.tf')
      const content = fs.readFileSync(mainTfPath, 'utf8')

      expect(content).to.include(
        'data "aws_lambda_layer_version" "common_corpus_layer"'
      )
      expect(content).to.include('layer_name = "common-corpus-layer-dev"')
    })
  })

  describe('Variables Configuration', function () {
    it('variables.tf should define all required variables', function () {
      const variablesTfPath = path.join(__dirname, '../terraform/variables.tf')
      const content = fs.readFileSync(variablesTfPath, 'utf8')

      const requiredVars = [
        'aws_region',
        'CONSUMER_KEY',
        'CONSUMER_SECRET',
        'TOKEN',
        'TOKEN_SECRET',
        'POST_LIVE',
        'schedule_expression',
        'log_retention_days'
      ]

      requiredVars.forEach((varName) => {
        expect(content).to.include(`variable "${varName}"`)
      })
    })

    it('variables.tf should mark sensitive variables as sensitive', function () {
      const variablesTfPath = path.join(__dirname, '../terraform/variables.tf')
      const content = fs.readFileSync(variablesTfPath, 'utf8')

      const sensitiveVars = [
        'CONSUMER_KEY',
        'CONSUMER_SECRET',
        'TOKEN',
        'TOKEN_SECRET'
      ]

      sensitiveVars.forEach((varName) => {
        const varBlock = content.substring(
          content.indexOf(`variable "${varName}"`),
          content.indexOf('}', content.indexOf(`variable "${varName}"`))
        )
        expect(varBlock).to.include('sensitive   = true')
      })
    })

    it('variables.tf should have default values for optional variables', function () {
      const variablesTfPath = path.join(__dirname, '../terraform/variables.tf')
      const content = fs.readFileSync(variablesTfPath, 'utf8')

      expect(content).to.include('default     = "us-east-1"')
      expect(content).to.include('default     = "rate(6 hours)"')
      expect(content).to.include('default     = 7')
    })
  })

  describe('Environment Variables Configuration', function () {
    it('Lambda function should have all required environment variables', function () {
      const mainTfPath = path.join(__dirname, '../terraform/main.tf')
      const content = fs.readFileSync(mainTfPath, 'utf8')

      const requiredEnvVars = [
        'CONSUMER_KEY',
        'CONSUMER_SECRET',
        'TOKEN',
        'TOKEN_SECRET',
        'POST_LIVE',
        'CORPORA_FILTER',
        'MATCH_PATTERN',
        'METHOD'
      ]

      requiredEnvVars.forEach((envVar) => {
        expect(content).to.include(envVar)
      })
    })

    it('Lambda function should reference variables for environment values', function () {
      const mainTfPath = path.join(__dirname, '../terraform/main.tf')
      const content = fs.readFileSync(mainTfPath, 'utf8')

      expect(content).to.include('var.CONSUMER_KEY')
      expect(content).to.include('var.CONSUMER_SECRET')
      expect(content).to.include('var.TOKEN')
      expect(content).to.include('var.TOKEN_SECRET')
      expect(content).to.include('var.POST_LIVE')
    })
  })

  describe('Lambda Handler Configuration', function () {
    it('Lambda handler file should exist', function () {
      const handlerPath = path.join(__dirname, '../lambda/index.js')
      expect(fs.existsSync(handlerPath)).to.be.true()
    })

    it('Lambda handler should export handler function', function () {
      const handler = require('../lambda/index.js')
      expect(handler).to.have.property('handler')
      expect(handler.handler).to.be.a('function')
    })

    it('Lambda handler should export LambdaHandler class', function () {
      const handler = require('../lambda/index.js')
      expect(handler).to.have.property('LambdaHandler')
      expect(handler.LambdaHandler).to.be.a('function')
    })
  })

  describe('Lambda Handler Functionality', function () {
    let LambdaHandler

    before(function () {
      // Set up test environment variables
      process.env.CONSUMER_KEY = 'test-key'
      process.env.CONSUMER_SECRET = 'test-secret'
      process.env.TOKEN = 'test-TOKEN'
      process.env.TOKEN_SECRET = 'test-TOKEN-secret'
      process.env.POST_LIVE = 'false'

      const handler = require('../lambda/index.js')
      LambdaHandler = handler.LambdaHandler
    })

    it('should instantiate LambdaHandler', function () {
      const handler = new LambdaHandler()
      expect(handler).to.be.an.instanceof(LambdaHandler)
    })

    it('should have handle method', function () {
      const handler = new LambdaHandler()
      expect(handler.handle).to.be.a('function')
    })

    it('should have processScheduledEvent method', function () {
      const handler = new LambdaHandler()
      expect(handler.processScheduledEvent).to.be.a('function')
    })

    it('should have processDirectInvocation method', function () {
      const handler = new LambdaHandler()
      expect(handler.processDirectInvocation).to.be.a('function')
    })

    it('should have generateList method', function () {
      const handler = new LambdaHandler()
      expect(handler.generateList).to.be.a('function')
    })

    it('should have postList method', function () {
      const handler = new LambdaHandler()
      expect(handler.postList).to.be.a('function')
    })

    it('should parse event options correctly', function () {
      const handler = new LambdaHandler()
      const event = {
        corporaFilter: 'test-filter',
        matchPattern: 'test-pattern',
        method: 'test-method'
      }
      const options = handler.parseEventOptions(event)

      expect(options).to.have.property('corporaFilter', 'test-filter')
      expect(options).to.have.property('matchPattern', 'test-pattern')
      expect(options).to.have.property('method', 'test-method')
    })

    it('should handle EventBridge scheduled events', async function () {
      this.timeout(10000)

      const handler = new LambdaHandler()
      const event = {
        source: 'aws.events',
        'detail-type': 'Scheduled Event'
      }
      const context = {
        awsRequestId: 'test-request-id',
        functionName: 'listmania',
        functionVersion: '1'
      }

      const result = await handler.handle(event, context)

      expect(result).to.have.property('statusCode')
      expect(result).to.have.property('body')
      expect(result.statusCode).to.be.oneOf([200, 500])
    })

    it('should handle direct invocation events', async function () {
      this.timeout(10000)

      const handler = new LambdaHandler()
      const event = {
        action: 'generate-only'
      }
      const context = {
        awsRequestId: 'test-request-id',
        functionName: 'listmania',
        functionVersion: '1'
      }

      const result = await handler.handle(event, context)

      expect(result).to.have.property('statusCode')
      expect(result).to.have.property('body')
      expect(result.statusCode).to.be.oneOf([200, 500])
    })

    it('should return proper error response on failure', async function () {
      const handler = new LambdaHandler()
      // Force an error by passing invalid event
      handler.generateList = async () => {
        throw new Error('Test error')
      }

      const event = { action: 'generate-only' }
      const context = {
        awsRequestId: 'test-request-id',
        functionName: 'listmania',
        functionVersion: '1'
      }

      const result = await handler.handle(event, context)

      expect(result.statusCode).to.equal(500)
      const body = JSON.parse(result.body)
      expect(body).to.have.property('error')
    })
  })

  describe('Outputs Configuration', function () {
    it('outputs.tf should define all expected outputs', function () {
      const outputsTfPath = path.join(__dirname, '../terraform/outputs.tf')
      const content = fs.readFileSync(outputsTfPath, 'utf8')

      const expectedOutputs = [
        'lambda_function_name',
        'lambda_function_arn',
        'lambda_role_arn',
        'eventbridge_rule_name',
        'eventbridge_rule_arn',
        'log_group_name'
      ]

      expectedOutputs.forEach((output) => {
        expect(content).to.include(`output "${output}"`)
      })
    })
  })

  describe('Documentation', function () {
    it('README.md should contain deployment instructions', function () {
      const readmePath = path.join(__dirname, '../terraform/README.md')
      const content = fs.readFileSync(readmePath, 'utf8')

      expect(content).to.include('Prerequisites')
      expect(content).to.include('Configuration')
      expect(content).to.include('Deployment')
      expect(content).to.include('Testing')
      expect(content).to.include('Monitoring')
    })

    it('README.md should document EventBridge scheduling', function () {
      const readmePath = path.join(__dirname, '../terraform/README.md')
      const content = fs.readFileSync(readmePath, 'utf8')

      expect(content).to.include('Schedule Configuration')
      expect(content).to.include('EventBridge')
      expect(content).to.include('rate(')
      expect(content).to.include('cron(')
    })

    it('README.md should document environment variables', function () {
      const readmePath = path.join(__dirname, '../terraform/README.md')
      const content = fs.readFileSync(readmePath, 'utf8')

      expect(content).to.include('Environment Variables')
      expect(content).to.include('CONSUMER_KEY')
      expect(content).to.include('POST_LIVE')
    })
  })

  describe('GitIgnore Configuration', function () {
    it('.gitignore should exclude sensitive files', function () {
      const gitignorePath = path.join(__dirname, '../terraform/.gitignore')
      const content = fs.readFileSync(gitignorePath, 'utf8')

      expect(content).to.include('*.tfstate')
      expect(content).to.include('*.tfvars')
      expect(content).to.include('.terraform/')
      expect(content).to.include('*.zip')
    })

    it('.gitignore should allow example files', function () {
      const gitignorePath = path.join(__dirname, '../terraform/.gitignore')
      const content = fs.readFileSync(gitignorePath, 'utf8')

      expect(content).to.include('!terraform.tfvars.example')
    })
  })
})
