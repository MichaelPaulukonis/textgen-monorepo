/**
 * AWS Lambda Handler for Listmania
 * Handles Lambda-specific execution logic for list generation and posting
 */

const config = require('../config.js')

class LambdaHandler {
  constructor () {
    this.config = config
    this.listifier = new (require('../lib/listify'))()
    this.util = require('../lib/util.js')({ statusVerbosity: 0 })
    this.tumblr = require('tumblr.js')
    this.client = this.tumblr.createClient({
      consumer_key: this.config.consumerKey,
      consumer_secret: this.config.consumerSecret,
      token: this.config.accessToken,
      token_secret: this.config.accessSecret
    })
  }

  /**
   * Main Lambda handler entry point
   * @param {object} event - Lambda event object
   * @param {object} context - Lambda context object
   * @returns {object} Lambda response
   */
  async handle (event, context) {
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
  async processScheduledEvent (event, context) {
    this.log('Processing scheduled event for list generation and posting')

    const result = await this.generateAndPostList()

    if (result.error) {
      this.logError('Scheduled list generation failed', new Error(result.error))
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'List generation failed',
          message: result.error,
          requestId: context.awsRequestId
        })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: result.posted ? 'List generated and posted successfully' : 'List generated (posting disabled)',
        postId: result.postId,
        listTitle: result.list?.metadata?.title,
        listLength: result.list?.list?.length,
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
  async processSQSEvent (event, context) {
    this.log('Processing SQS event (future service separation)')

    const results = []

    for (const record of event.Records) {
      try {
        const message = JSON.parse(record.body)

        if (message.type === 'generate-list') {
          const result = await this.processGenerationRequest(message)
          results.push({ messageId: record.messageId, result })
        } else if (message.type === 'post-list') {
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
        results,
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
  async processDirectInvocation (event, context) {
    this.log('Processing direct invocation')

    // Parse CLI-style options from event
    const options = this.parseEventOptions(event)

    // Check if this is a specific request type
    if (event.action === 'generate-only') {
      const result = await this.generateList(options)
      return {
        statusCode: result.error ? 500 : 200,
        body: JSON.stringify({
          list: result.list,
          error: result.error,
          requestId: context.awsRequestId
        })
      }
    } else if (event.action === 'post-only' && event.list) {
      const result = await this.postList(event.list)
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
      const result = await this.generateAndPostList(options)
      return {
        statusCode: result.error ? 500 : 200,
        body: JSON.stringify({
          message: result.posted ? 'List generated and posted' : 'List generated (posting disabled)',
          list: result.list,
          posted: result.posted,
          postId: result.postId,
          error: result.error,
          requestId: context.awsRequestId
        })
      }
    }
  }

  /**
   * Parse event options to CLI-style configuration
   * Converts Lambda event parameters to the format expected by the CLI
   * @param {object} event - Lambda event
   * @returns {object} Parsed options
   */
  parseEventOptions (event) {
    const options = {}

    // Map event parameters to CLI options
    if (event.corporaFilter || event.corpora_filter) {
      options.corporaFilter = event.corporaFilter || event.corpora_filter
    }

    if (event.matchPattern || event.match_pattern || event.patternMatch || event.pattern_match) {
      options.matchPattern = event.matchPattern || event.match_pattern ||
                            event.patternMatch || event.pattern_match
    }

    if (event.method) {
      options.method = event.method
    }

    return options
  }

  /**
   * Process generation request (future service separation)
   * @param {object} message - Generation request message
   * @returns {object} Generation result
   */
  async processGenerationRequest (message) {
    this.log('Processing generation request')
    return await this.generateList(message.options || {})
  }

  /**
   * Process posting request (future service separation)
   * @param {object} message - Posting request message
   * @returns {object} Posting result
   */
  async processPostingRequest (message) {
    this.log('Processing posting request')
    return await this.postList(message.list)
  }

  /**
   * Get text from corpus
   * @param {string} corporaFilter - Optional filter for corpus selection
   * @returns {object} Text object with text and source
   */
  getText (corporaFilter) {
    const Corpora = require('common-corpus')
    const corpora = new Corpora()
    const source = corporaFilter ? corpora.filter(corporaFilter) : corpora.texts
    const chars = 50000
    const textObj = this.util.pick(source)
    const text = textObj.text()
    const startPos = this.util.randomInRange(0, text.length - chars)
    const blob = (text.length <= chars ? text : text.slice(startPos, startPos + chars))

    return {
      text: blob,
      source: textObj.name
    }
  }

  /**
   * Generate a list
   * @param {object} options - Generation options
   * @returns {object} Generation result
   */
  async generateList (options = {}) {
    try {
      // Apply options to config
      const corporaFilter = options.corporaFilter || this.config.corporaFilter
      const matchPattern = options.matchPattern || this.config.matchPattern
      const method = options.method || this.config.method

      const text = this.getText(corporaFilter)
      let list = {}
      let attempt = 0

      // Try up to 5 times to generate a valid list
      while (attempt < 5) {
        attempt++
        list = this.listifier.getList({
          text,
          matchPattern,
          method
        })
        if (list.list && list.list.length > 0) {
          break
        }
      }

      if (list.list && list.list.length > 0) {
        const { prepForPublish, prefixifiers } = require('../lib/prep')
        const pfx = this.util.pick(Object.keys(prefixifiers))
        list.printable = prepForPublish(list, prefixifiers[pfx])

        this.log(`Generated list: "${list.metadata.title}" (${list.list.length} items)`)
        this.logListMetadata(list)

        return { list, error: null }
      } else {
        const errorMsg = `No list generated for text '${text.source}' after ${attempt} attempts`
        this.log(errorMsg)
        return { list: null, error: errorMsg }
      }
    } catch (error) {
      this.logError('List generation error', error)
      return { list: null, error: error.message }
    }
  }

  /**
   * Post a list to Tumblr
   * @param {object} list - List to post
   * @returns {object} Posting result
   */
  async postList (list) {
    try {
      if (!list || !list.printable || !list.metadata || !list.metadata.title) {
        return {
          success: false,
          postId: null,
          error: 'Invalid list object'
        }
      }

      return new Promise((resolve) => {
        this.client.createTextPost('leanstooneside',
          {
            title: list.metadata.title,
            body: list.printable
          },
          (err, data) => {
            if (err) {
              this.logError('Tumblr posting error', err)
              resolve({
                success: false,
                postId: null,
                error: err.message || JSON.stringify(err)
              })
            } else {
              this.log(`Posted list successfully: ${data.id}`)
              resolve({
                success: true,
                postId: data.id,
                error: null
              })
            }
          }
        )
      })
    } catch (error) {
      this.logError('List posting error', error)
      return {
        success: false,
        postId: null,
        error: error.message
      }
    }
  }

  /**
   * Generate and post a list (combined operation)
   * @param {object} options - Generation options
   * @returns {object} Combined result
   */
  async generateAndPostList (options = {}) {
    const generationResult = await this.generateList(options)

    if (generationResult.error || !generationResult.list) {
      return {
        list: generationResult.list,
        posted: false,
        postId: null,
        error: generationResult.error || 'No list generated'
      }
    }

    if (this.config.postLive) {
      const postingResult = await this.postList(generationResult.list)
      return {
        list: generationResult.list,
        posted: postingResult.success,
        postId: postingResult.postId,
        error: postingResult.error
      }
    } else {
      this.log('Posting disabled, list generated but not posted')
      return {
        list: generationResult.list,
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
  logRequest (event, context) {
    this.log(`Lambda invocation - RequestId: ${context.awsRequestId}`)
    this.log(`Function: ${context.functionName} v${context.functionVersion}`)
    this.log(`Event source: ${event.source || 'direct'}`)
  }

  /**
   * Log list metadata
   * @param {object} list - List object
   */
  logListMetadata (list) {
    const metadata = {
      source: list.metadata.source,
      strategy: list.metadata.strategy,
      title: list.metadata.title,
      length: list.metadata.length
    }
    this.log('List metadata:', JSON.stringify(metadata))
  }

  /**
   * Log message
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  log (message, data = null) {
    if (data) {
      console.log(`[Listmania] ${message}`, data)
    } else {
      console.log(`[Listmania] ${message}`)
    }
  }

  /**
   * Log error
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  logError (message, error) {
    console.error(`[Listmania ERROR] ${message}:`, error.message || error)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
  }
}

// Lambda handler export
const handler = new LambdaHandler()

exports.handler = async (event, context) => {
  return await handler.handle(event, context)
}

// Export class for testing
exports.LambdaHandler = LambdaHandler
