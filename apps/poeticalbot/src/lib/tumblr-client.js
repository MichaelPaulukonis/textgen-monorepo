/**
 * Unified Tumblr API Client
 * Abstracts tumblr.js library with NPF support and error handling
 */

const { convertPoemToNPF, validateNPF } = require('./npf-formatter')

class TumblrClient {
  constructor(credentials) {
    this.credentials = credentials
    this.client = null
    this.initialized = false
  }

  /**
   * Initialize the Tumblr client
   * @throws {Error} If credentials are invalid
   */
  initialize() {
    if (this.initialized) {
      return
    }

    try {
      const tumblr = require('tumblr.js')
      
      this.client = tumblr.createClient({
        consumer_key: this.credentials.consumerKey,
        consumer_secret: this.credentials.consumerSecret,
        token: this.credentials.accessToken,
        token_secret: this.credentials.accessSecret
      })
      
      this.initialized = true
    } catch (error) {
      throw new Error(`Failed to initialize Tumblr client: ${error.message}`)
    }
  }

  /**
   * Validate Tumblr API credentials
   * @returns {Promise<object>} Validation result
   */
  async validateCredentials() {
    try {
      this.initialize()
      
      const userInfo = await this.client.userInfo()
      
      return {
        valid: true,
        user: userInfo.user.name,
        blogs: userInfo.user.blogs.map(blog => ({
          name: blog.name,
          url: blog.url,
          primary: blog.primary
        })),
        error: null
      }
    } catch (error) {
      return {
        valid: false,
        user: null,
        blogs: [],
        error: error.message
      }
    }
  }

  /**
   * Test connection to Tumblr API
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      const validation = await this.validateCredentials()
      return validation.valid
    } catch (error) {
      return false
    }
  }

  /**
   * Post a poem to Tumblr using NPF format
   * @param {object} poem - Poem object to post
   * @param {string} blogName - Target blog name (e.g., 'poeticalbot.tumblr.com')
   * @returns {Promise<object>} Posting result
   */
  async postPoem(poem, blogName) {
    try {
      this.initialize()
      
      // Convert poem to NPF format
      const npfPost = convertPoemToNPF(poem)
      
      // Validate NPF structure
      if (!validateNPF(npfPost)) {
        throw new Error('Generated NPF structure is invalid')
      }

      // Post to Tumblr
      const response = await this.client.createPost(blogName, npfPost)
      
      return {
        success: true,
        postId: response.id,
        url: `https://${blogName}/post/${response.id}`,
        npfPost: npfPost,
        error: null
      }
    } catch (error) {
      return {
        success: false,
        postId: null,
        url: null,
        npfPost: null,
        error: error.message
      }
    }
  }

  /**
   * Get blog information
   * @param {string} blogName - Blog name to query
   * @returns {Promise<object>} Blog information
   */
  async getBlogInfo(blogName) {
    try {
      this.initialize()
      
      const blogInfo = await this.client.blogInfo(blogName)
      
      return {
        success: true,
        blog: {
          name: blogInfo.blog.name,
          title: blogInfo.blog.title,
          description: blogInfo.blog.description,
          url: blogInfo.blog.url,
          posts: blogInfo.blog.posts,
          followers: blogInfo.blog.followers
        },
        error: null
      }
    } catch (error) {
      return {
        success: false,
        blog: null,
        error: error.message
      }
    }
  }

  /**
   * Get recent posts from a blog
   * @param {string} blogName - Blog name to query
   * @param {object} options - Query options
   * @returns {Promise<object>} Recent posts
   */
  async getRecentPosts(blogName, options = {}) {
    try {
      this.initialize()
      
      const posts = await this.client.blogPosts(blogName, {
        limit: options.limit || 5,
        offset: options.offset || 0,
        type: options.type || 'text'
      })
      
      return {
        success: true,
        posts: posts.posts.map(post => ({
          id: post.id,
          type: post.type,
          title: post.title || post.summary,
          date: post.date,
          tags: post.tags,
          url: post.post_url
        })),
        totalPosts: posts.total_posts,
        error: null
      }
    } catch (error) {
      return {
        success: false,
        posts: [],
        totalPosts: 0,
        error: error.message
      }
    }
  }

  /**
   * Delete a post
   * @param {string} blogName - Blog name
   * @param {string} postId - Post ID to delete
   * @returns {Promise<object>} Deletion result
   */
  async deletePost(blogName, postId) {
    try {
      this.initialize()
      
      await this.client.deletePost(blogName, postId)
      
      return {
        success: true,
        error: null
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get client statistics and health information
   * @returns {object} Client status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      hasCredentials: !!(this.credentials?.consumerKey && 
                        this.credentials?.consumerSecret && 
                        this.credentials?.accessToken && 
                        this.credentials?.accessSecret),
      credentialsPartial: {
        consumerKey: this.credentials?.consumerKey ? `${this.credentials.consumerKey.substring(0, 8)}...` : null,
        accessToken: this.credentials?.accessToken ? `${this.credentials.accessToken.substring(0, 8)}...` : null
      }
    }
  }

  /**
   * Create a TumblrClient instance from configuration
   * @param {object} config - Configuration object with tumblr credentials
   * @returns {TumblrClient} Configured client instance
   */
  static fromConfig(config) {
    if (!config.tumblr) {
      throw new Error('Configuration missing tumblr credentials section')
    }

    return new TumblrClient({
      consumerKey: config.tumblr.consumerKey,
      consumerSecret: config.tumblr.consumerSecret,
      accessToken: config.tumblr.accessToken,
      accessSecret: config.tumblr.accessSecret
    })
  }
}

module.exports = TumblrClient