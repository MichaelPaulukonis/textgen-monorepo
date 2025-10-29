const config = require('./config.js')
const tumblr = require('tumblr.js')

const util = new (require('./lib/util.js'))({ statusVerbosity: 0 })

const client = tumblr.createClient({
  consumer_key: config.tumblr.consumerKey,
  consumer_secret: config.tumblr.consumerSecret,
  token: config.tumblr.accessToken,
  token_secret: config.tumblr.accessSecret
})

// Environment-aware logger
const logger = (msg) => {
  if (config.logging.destination === 'cloudwatch') {
    console.log(msg) // CloudWatch for Lambda
  } else {
    console.log(msg) // Console for CLI
  }
}
util.log = logger

const { convertPoemToNPF, validateNPF } = require('./lib/npf-formatter')

const prepForPublish = (poem) => {
  const lines = poem.text.split('\n')
  const leadingspacere = /^ */

  const data = JSON.parse(JSON.stringify(poem))
  delete data.text
  delete data.lines

  const clean = lines.map(line => {
    const matches = line.match(leadingspacere)
    const nbsps = matches[0].replace(/ /g, '&nbsp;')
    return line.replace(matches[0], nbsps)
  })
  const dataline = `<!-- config: ${JSON.stringify(data)} -->`

  return clean.join('<br />') + dataline
}

const prepForNPF = (poem) => {
  const npfPost = convertPoemToNPF(poem)

  if (!validateNPF(npfPost)) {
    throw new Error('Invalid NPF structure generated')
  }

  return npfPost
}

/**
 * Core poem generation and posting logic
 * Used by both Lambda and CLI runtimes
 */
async function generateAndProcessPoem(options = {}) {
  try {
    const poetifier = new (require('./lib/poetifier.js'))({ config: config })
    const poem = poetifier.poem()

    if (poem && poem.title && poem.text) {
      const result = {
        poem: poem,
        posted: false,
        postId: null,
        error: null
      }

      // Only post if enabled and not explicitly disabled by options
      if (config.posting.enabled && options.skipPosting !== true) {
        try {
          // Use NPF format for posting
          const npfPost = prepForNPF(poem)
          const response = await client.createPost(config.posting.blogName, npfPost)

          logger('Posted successfully with NPF format')
          logger('Post ID: ' + response.id)
          logger('Poem metadata: ' + JSON.stringify({
            seed: poem.seed,
            source: poem.source,
            template: poem.template,
            method: poem.method
          }))

          result.posted = true
          result.postId = response.id
        } catch (err) {
          logger('NPF post failed: ' + err.message)
          result.error = err.message
        }
      } else {
        // Show NPF format in logs for debugging
        const npfPost = prepForNPF(poem)
        logger('NPF format: ' + JSON.stringify(npfPost, null, 2))
        logger('Original poem: ' + JSON.stringify(poem, null, 2))
      }

      return result
    } else {
      return { poem: null, posted: false, postId: null, error: 'No poem generated' }
    }
  } catch (error) {
    logger('Error: ' + error.message)
    return { poem: null, posted: false, postId: null, error: error.message }
  }
}

/**
 * AWS Lambda handler
 * Delegates to the dedicated Lambda handler class
 */
exports.handler = async (event, context) => {
  const LambdaHandler = require('./lambda-handler')
  const handler = new LambdaHandler()
  return await handler.handle(event, context)
}

/**
 * CLI execution
 * Runs when this file is executed directly
 */
async function runCLI() {
  console.log('🎭 PoeticalBot - Poetry Generation')
  console.log('==================================')
  
  try {
    const result = await generateAndProcessPoem({ skipPosting: !config.posting.enabled })
    
    if (result.error) {
      console.error('❌ Error:', result.error)
      process.exit(1)
    }
    
    if (!result.poem) {
      console.log('❌ No poem generated')
      process.exit(1)
    }
    
    // Display the poem
    console.log('\n📝 Generated Poem:')
    console.log('==================')
    console.log(`Title: ${result.poem.title}`)
    console.log(`\n${result.poem.text}`)
    
    // Display metadata
    console.log('\n📊 Metadata:')
    console.log(`Seed: ${result.poem.seed}`)
    console.log(`Source: ${result.poem.source}`)
    if (result.poem.template) console.log(`Template: ${result.poem.template}`)
    if (result.poem.method) console.log(`Method: ${result.poem.method}`)
    
    // Display posting status
    if (result.posted) {
      console.log(`\n✅ Posted to Tumblr (ID: ${result.postId})`)
    } else if (config.posting.enabled) {
      console.log('\n⚠️  Posting enabled but failed')
    } else {
      console.log('\n💡 Posting disabled (set POST_LIVE=true to enable)')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  }
}

// Detect runtime and execute appropriately
if (require.main === module) {
  // CLI execution
  runCLI()
}
