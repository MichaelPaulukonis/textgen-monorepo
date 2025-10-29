/**
 * AWS Lambda Handler for PoeticalBot
 * Handles Lambda-specific execution logic with future service separation support
 */

const config = require('./config.js')

class LambdaHandler {
  constructor() {
    this.config = config
  }

  /**
   * Main Lambda handler entry point
   * @param {object} event - Lambda event object
   * @param {object} context - Lambda context object
   * @returns {object} Lambda response
   */
  async handle(event, context) {
    // Log request information
    this.logRequest(event, context)

    try {
      // Determine event type and route accordingly
      if (event.source === 'aws.events') {
        // EventBridge scheduled event
        return await this.processScheduledEvent(event, context)
      } else if (event.Records && event.Records[0] && event.Records[0].eventSource === 'aws:sqs') {
        // SQS message event (future service separation)
        return await this.processSQSEvent(event, context)
      } else {
        // Direct invocation or other event types
        return await this.processDirectInvocation(event, context)
      }
    } catch (error) {
      this.logError('Lambda handler error', error)
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Internal server error',
          message: error.message,
          requestId: context.awsRequestId
        })
      }
    }
  }

  /**
   * Process scheduled EventBridge events
   * @param {object} event - EventBridge event
   * @param {object} context - Lambda context
   * @returns {object} Response
   */
  async processScheduledEvent(event, context) {
    this.log('Processing scheduled event for poetry generation and posting')

    const result = await this.generateAndPostPoem()

    if (result.error) {
      this.logError('Scheduled poetry generation failed', new Error(result.error))
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Poetry generation failed',
          message: result.error,
          requestId: context.awsRequestId
        })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: result.posted ? 'Poem generated and posted successfully' : 'Poem generated (posting disabled)',
        postId: result.postId,
        poemTitle: result.poem?.title,
        requestId: context.awsRequestId
      })
    }
  }

  /**
   * Process SQS events (future service separation)
   * @param {object} event - SQS event
   * @param {object} context - Lambda context
   * @returns {object} Response
   */
  async processSQSEvent(event, context) {
    this.log('Processing SQS event (future service separation)')

    const results = []

    for (const record of event.Records) {
      try {
        const message = JSON.parse(record.body)
        
        if (message.type === 'generate-poem') {
          const result = await this.processGenerationRequest(message)
          results.push({ messageId: record.messageId, result })
        } else if (message.type === 'post-poem') {
          const result = await this.processPostingRequest(message)
          results.push({ messageId: record.messageId, result })
        } else {
          this.logError('Unknown SQS message type', new Error(`Unknown type: ${message.type}`))
          results.push({ messageId: record.messageId, error: 'Unknown message type' })
        }
      } catch (error) {
        this.logError('SQS message processing error', error)
        results.push({ messageId: record.messageId, error: error.message })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        processedMessages: results.length,
        results: results,
        requestId: context.awsRequestId
      })
    }
  }

  /**
   * Process direct invocation
   * @param {object} event - Direct invocation event
   * @param {object} context - Lambda context
   * @returns {object} Response
   */
  async processDirectInvocation(event, context) {
    this.log('Processing direct invocation')

    // Check if this is a specific request type
    if (event.action === 'generate-only') {
      const result = await this.generatePoem(event.options || {})
      return {
        statusCode: result.error ? 500 : 200,
        body: JSON.stringify({
          poem: result.poem,
          error: result.error,
          requestId: context.awsRequestId
        })
      }
    } else if (event.action === 'post-only' && event.poem) {
      const result = await this.postPoem(event.poem)
      return {
        statusCode: result.error ? 500 : 200,
        body: JSON.stringify({
          posted: result.success,
          postId: result.postId,
          error: result.error,
          requestId: context.awsRequestId
        })
      }
    } else {
      // Default: generate and post
      const result = await this.generateAndPostPoem()
      return {
        statusCode: result.error ? 500 : 200,
        body: JSON.stringify({
          message: result.posted ? 'Poem generated and posted' : 'Poem generated (posting disabled)',
          poem: result.poem,
          posted: result.posted,
          postId: result.postId,
          error: result.error,
          requestId: context.awsRequestId
        })
      }
    }
  }

  /**
   * Process generation request (future service separation)
   * @param {object} message - Generation request message
   * @returns {object} Generation result
   */
  async processGenerationRequest(message) {
    this.log('Processing generation request')
    return await this.generatePoem(message.options || {})
  }

  /**
   * Process posting request (future service separation)
   * @param {object} message - Posting request message
   * @returns {object} Posting result
   */
  async processPostingRequest(message) {
    this.log('Processing posting request')
    return await this.postPoem(message.poem)
  }

  /**
   * Generate a poem
   * @param {object} options - Generation options
   * @returns {object} Generation result
   */
  async generatePoem(options = {}) {
    try {
      // Create modified config for this generation
      const generationConfig = { ...this.config }
      
      // Override config with options
      if (options.method) {
        generationConfig.poetry = { ...generationConfig.poetry, method: options.method }
      }
      if (options.seed) {
        generationConfig.poetry = { ...generationConfig.poetry, seed: options.seed }
      }
      if (options.corporaFilter) {
        generationConfig.poetry = { ...generationConfig.poetry, corporaFilter: options.corporaFilter }
      }

      const poetifier = new (require('./lib/poetifier.js'))({ config: generationConfig })
      const poem = poetifier.poem()

      if (poem && poem.title && poem.text) {
        this.log(`Generated poem: "${poem.title}" (seed: ${poem.seed})`)
        return { poem, error: null }
      } else {
        return { poem: null, error: 'No poem generated' }
      }
    } catch (error) {
      this.logError('Poem generation error', error)
      return { poem: null, error: error.message }
    }
  }

  /**
   * Post a poem to Tumblr
   * @param {object} poem - Poem to post
   * @returns {object} Posting result
   */
  async postPoem(poem) {
    try {
      const TumblrClient = require('./lib/tumblr-client')
      const client = TumblrClient.fromConfig(this.config)
      
      const result = await client.postPoem(poem, this.config.posting.blogName)
      
      if (result.success) {
        this.log(`Posted poem successfully: ${result.postId}`)
        this.logPoemMetadata(poem)
      } else {
        this.logError('Poem posting failed', new Error(result.error))
      }
      
      return { 
        success: result.success, 
        postId: result.postId, 
        url: result.url,
        error: result.error 
      }
    } catch (error) {
      this.logError('Poem posting error', error)
      return { 
        success: false, 
        postId: null, 
        url: null,
        error: error.message 
      }
    }
  }

  /**
   * Generate and post a poem (combined operation)
   * @returns {object} Combined result
   */
  async generateAndPostPoem() {
    const generationResult = await this.generatePoem()
    
    if (generationResult.error || !generationResult.poem) {
      return {
        poem: generationResult.poem,
        posted: false,
        postId: null,
        error: generationResult.error || 'No poem generated'
      }
    }

    if (this.config.posting.enabled) {
      const postingResult = await this.postPoem(generationResult.poem)
      return {
        poem: generationResult.poem,
        posted: postingResult.success,
        postId: postingResult.postId,
        error: postingResult.error
      }
    } else {
      this.log('Posting disabled, poem generated but not posted')
      return {
        poem: generationResult.poem,
        posted: false,
        postId: null,
        error: null
      }
    }
  }

  /**
   * Log request information
   * @param {object} event - Lambda event
   * @param {object} context - Lambda context
   */
  logRequest(event, context) {
    this.log(`Lambda invocation - RequestId: ${context.awsRequestId}`)
    this.log(`Function: ${context.functionName} v${context.functionVersion}`)
    this.log(`Event source: ${event.source || 'direct'}`)
    
    if (this.config.logging.level === 'debug') {
      this.log('Event details:', JSON.stringify(event, null, 2))
    }
  }

  /**
   * Log poem metadata
   * @param {object} poem - Poem object
   */
  logPoemMetadata(poem) {
    const metadata = {
      seed: poem.seed,
      source: poem.source,
      template: poem.template,
      method: poem.method
    }
    this.log('Poem metadata:', JSON.stringify(metadata))
  }

  /**
   * Log message
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  log(message, data = null) {
    if (data) {
      console.log(`[PoeticalBot] ${message}`, data)
    } else {
      console.log(`[PoeticalBot] ${message}`)
    }
  }

  /**
   * Log error
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  logError(message, error) {
    console.error(`[PoeticalBot ERROR] ${message}:`, error.message)
    if (this.config.logging.level === 'debug') {
      console.error('Stack trace:', error.stack)
    }
  }
}

module.exports = LambdaHandler