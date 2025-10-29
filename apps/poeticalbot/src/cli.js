#!/usr/bin/env node

/**
 * PoeticalBot CLI Interface
 * Command-line interface for local development and testing
 */

const config = require('./config.js')

class CLI {
  constructor() {
    this.config = config
  }

  /**
   * Parse command line arguments
   * @param {string[]} args - Command line arguments
   * @returns {object} Parsed options
   */
  parseArgs(args) {
    const options = {
      help: false,
      post: false,
      method: null,
      seed: null,
      corporaFilter: null,
      transform: null,
      verbose: false
    }

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      
      switch (arg) {
        case '-h':
        case '--help':
          options.help = true
          break
        case '-p':
        case '--post':
          options.post = true
          break
        case '-m':
        case '--method':
          options.method = args[++i]
          break
        case '-s':
        case '--seed':
          options.seed = args[++i]
          break
        case '-c':
        case '--corpora-filter':
          options.corporaFilter = args[++i]
          break
        case '-t':
        case '--transform':
          options.transform = args[++i] === 'true'
          break
        case '-v':
        case '--verbose':
          options.verbose = true
          break
        default:
          if (arg.startsWith('-')) {
            console.warn(`Unknown option: ${arg}`)
          }
      }
    }

    return options
  }

  /**
   * Display help information
   */
  showHelp() {
    console.log(`
🎭 PoeticalBot CLI - Poetry Generation Tool

Usage: node src/cli.js [options]

Options:
  -h, --help              Show this help message
  -p, --post              Post the generated poem to Tumblr
  -m, --method <method>   Poetry generation method (jgnoetry, queneau-buckets, drone)
  -s, --seed <seed>       Random seed for reproducible generation
  -c, --corpora-filter <filter>  Filter corpus by name pattern
  -t, --transform <bool>  Enable/disable text transformations (true/false)
  -v, --verbose           Enable verbose output

Examples:
  node src/cli.js                           # Generate a poem
  node src/cli.js --post                    # Generate and post to Tumblr
  node src/cli.js --method drone --seed abc # Generate with specific method and seed
  node src/cli.js --corpora-filter eliot    # Use only Eliot corpus
  node src/cli.js --verbose                 # Show detailed output

Environment Variables:
  POST_LIVE=true          Enable posting to Tumblr
  POETRY_METHOD=<method>  Default poetry generation method
  CORPORA_FILTER=<filter> Default corpus filter
  LOG_LEVEL=debug         Enable debug logging
`)
  }

  /**
   * Generate a poem with given options
   * @param {object} options - Generation options
   * @returns {object} Generated poem result
   */
  async generatePoem(options = {}) {
    try {
      // Create modified config for this generation
      const generationConfig = { ...this.config }
      
      // Override config with CLI options
      if (options.method) {
        generationConfig.poetry = { ...generationConfig.poetry, method: options.method }
      }
      if (options.seed) {
        generationConfig.poetry = { ...generationConfig.poetry, seed: options.seed }
      }
      if (options.corporaFilter) {
        generationConfig.poetry = { ...generationConfig.poetry, corporaFilter: options.corporaFilter }
      }
      if (options.transform !== null) {
        generationConfig.poetry = { ...generationConfig.poetry, transform: options.transform }
      }

      // Generate poem
      const poetifier = new (require('./lib/poetifier.js'))({ config: generationConfig })
      const poem = poetifier.poem()

      return { poem, error: null }
    } catch (error) {
      return { poem: null, error: error.message }
    }
  }

  /**
   * Post a poem to Tumblr
   * @param {object} poem - Poem object to post
   * @returns {object} Posting result
   */
  async postToTumblr(poem) {
    try {
      const TumblrClient = require('./lib/tumblr-client')
      const client = TumblrClient.fromConfig(this.config)
      
      const result = await client.postPoem(poem, this.config.posting.blogName)
      
      return { 
        success: result.success, 
        postId: result.postId, 
        url: result.url,
        error: result.error 
      }
    } catch (error) {
      return { 
        success: false, 
        postId: null, 
        url: null,
        error: error.message 
      }
    }
  }

  /**
   * Display poem in formatted output
   * @param {object} poem - Poem object
   * @param {object} options - Display options
   */
  displayPoem(poem, options = {}) {
    console.log('\n📝 Generated Poem:')
    console.log('==================')
    
    if (poem.title) {
      console.log(`Title: ${poem.title}`)
      console.log('')
    }
    
    console.log(poem.text)
    
    if (options.verbose) {
      console.log('\n📊 Metadata:')
      console.log('=============')
      if (poem.seed) console.log(`Seed: ${poem.seed}`)
      if (poem.source) console.log(`Source: ${poem.source}`)
      if (poem.template) console.log(`Template: ${poem.template}`)
      if (poem.method) console.log(`Method: ${poem.method}`)
      
      if (poem.metadata) {
        console.log('Additional metadata:', JSON.stringify(poem.metadata, null, 2))
      }
    }
  }

  /**
   * Main CLI execution
   * @param {string[]} args - Command line arguments
   */
  async run(args = process.argv.slice(2)) {
    const options = this.parseArgs(args)

    if (options.help) {
      this.showHelp()
      return
    }

    console.log('🎭 PoeticalBot - Poetry Generation')
    console.log('==================================')

    // Validate configuration if posting is requested
    if (options.post) {
      try {
        if (!this.config.tumblr.consumerKey || !this.config.tumblr.consumerSecret || 
            !this.config.tumblr.accessToken || !this.config.tumblr.accessSecret) {
          throw new Error('Tumblr API credentials not configured')
        }
      } catch (error) {
        console.error('❌ Configuration Error:', error.message)
        console.log('\n💡 Set up your .env file with Tumblr API credentials to enable posting')
        process.exit(1)
      }
    }

    // Generate poem
    console.log('🎲 Generating poem...')
    const result = await this.generatePoem(options)

    if (result.error) {
      console.error('❌ Generation Error:', result.error)
      process.exit(1)
    }

    if (!result.poem) {
      console.log('❌ No poem generated')
      process.exit(1)
    }

    // Display poem
    this.displayPoem(result.poem, options)

    // Post to Tumblr if requested
    if (options.post) {
      console.log('\n📤 Posting to Tumblr...')
      const postResult = await this.postToTumblr(result.poem)

      if (postResult.success) {
        console.log(`✅ Posted successfully! Post ID: ${postResult.postId}`)
        console.log(`🔗 View at: https://${this.config.posting.blogName}/post/${postResult.postId}`)
      } else {
        console.error('❌ Posting failed:', postResult.error)
        process.exit(1)
      }
    } else {
      console.log('\n💡 Use --post flag to publish to Tumblr')
    }
  }
}

// Export for testing
module.exports = CLI

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new CLI()
  cli.run().catch(error => {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  })
}