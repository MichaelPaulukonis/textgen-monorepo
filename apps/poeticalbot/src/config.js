/**
 * Environment-aware configuration system
 * Supports both CLI (.env files) and Lambda (environment variables) execution
 */

class Config {
  constructor() {
    this.environment = this.detectEnvironment()
    this.loadEnvironmentConfig()
  }

  /**
   * Detect execution environment
   * @returns {string} 'lambda' | 'cli' | 'test'
   */
  detectEnvironment() {
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return 'lambda'
    }
    if (process.env.NODE_ENV === 'test') {
      return 'test'
    }
    return 'cli'
  }

  /**
   * Load configuration based on environment
   */
  loadEnvironmentConfig() {
    // Load .env files for CLI and test environments
    if (this.environment === 'cli' || this.environment === 'test') {
      try {
        require('dotenv').config()
      } catch (error) {
        console.warn('dotenv not available, using environment variables only')
      }
    }

    // Load and validate configuration
    this.config = this.buildConfig()
    this.validateConfig()
  }

  /**
   * Build configuration object from environment variables
   * @returns {object} Configuration object
   */
  buildConfig() {
    return {
      // Tumblr API credentials
      tumblr: {
        consumerKey: process.env.CONSUMER_KEY,
        consumerSecret: process.env.CONSUMER_SECRET,
        accessToken: process.env.TOKEN,
        accessSecret: process.env.TOKEN_SECRET
      },

      // Posting configuration
      posting: {
        enabled: process.env.POST_LIVE && process.env.POST_LIVE.toLowerCase() === 'true',
        blogName: process.env.BLOG_NAME || 'poeticalbot.tumblr.com'
      },

      // Poetry generation
      poetry: {
        method: process.env.POETRY_METHOD,
        corporaFilter: process.env.CORPORA_FILTER,
        transform: process.env.TRANSFORM !== 'false', // default true
        seed: process.env.POETRY_SEED
      },

      // Environment and logging
      environment: this.environment,
      logging: {
        level: process.env.LOG_LEVEL || (this.environment === 'lambda' ? 'info' : 'debug'),
        destination: this.environment === 'lambda' ? 'cloudwatch' : 'console'
      }
    }
  }

  /**
   * Validate required configuration
   * @throws {Error} If required configuration is missing
   */
  validateConfig() {
    const required = [
      'tumblr.consumerKey',
      'tumblr.consumerSecret',
      'tumblr.accessToken',
      'tumblr.accessSecret'
    ]

    const missing = required.filter(key => {
      const value = this.getNestedValue(this.config, key)
      return !value || value.trim() === ''
    })

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`)
    }
  }

  /**
   * Get nested object value by dot notation
   * @param {object} obj - Object to search
   * @param {string} path - Dot notation path
   * @returns {any} Value at path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj)
  }

  /**
   * Get configuration object
   * @returns {object} Configuration
   */
  getConfig() {
    return this.config
  }

  /**
   * Get default configuration values
   * @returns {object} Default configuration
   */
  static getDefaults() {
    return {
      posting: {
        enabled: false,
        blogName: 'poeticalbot.tumblr.com'
      },
      poetry: {
        transform: true
      },
      logging: {
        level: 'info'
      }
    }
  }
}

// Create and export singleton instance
const configInstance = new Config()

// Export both the instance and the class for testing
module.exports = configInstance.getConfig()
module.exports.Config = Config
module.exports.instance = configInstance
