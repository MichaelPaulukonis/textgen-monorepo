/**
 * Mock Tumblr client for testing without making actual API calls
 */
class MockTumblrClient {
  constructor(credentials = {}) {
    this.credentials = credentials
    this.postHistory = []
    this.shouldFail = false
    this.failureMessage = 'Mock failure'
  }

  /**
   * Mock the createPost method
   */
  async createPost(blogName, options) {
    if (this.shouldFail) {
      throw new Error(this.failureMessage)
    }

    const mockResponse = {
      meta: { status: 201, msg: 'Created' },
      response: {
        id: Math.floor(Math.random() * 1000000),
        id_string: String(Math.floor(Math.random() * 1000000)),
        post_url: `https://${blogName}.tumblr.com/post/${Math.floor(Math.random() * 1000000)}`
      }
    }

    // Store the post for testing verification
    this.postHistory.push({
      blogName,
      options,
      timestamp: new Date(),
      response: mockResponse
    })

    return mockResponse
  }

  /**
   * Mock the blogInfo method
   */
  async blogInfo(blogName) {
    if (this.shouldFail) {
      throw new Error(this.failureMessage)
    }

    return {
      meta: { status: 200, msg: 'OK' },
      response: {
        blog: {
          name: blogName,
          title: `${blogName} Blog`,
          posts: 42,
          url: `https://${blogName}.tumblr.com/`,
          updated: Date.now()
        }
      }
    }
  }

  /**
   * Test helper methods
   */
  getPostHistory() {
    return this.postHistory
  }

  getLastPost() {
    return this.postHistory[this.postHistory.length - 1]
  }

  clearHistory() {
    this.postHistory = []
  }

  setFailureMode(shouldFail, message = 'Mock failure') {
    this.shouldFail = shouldFail
    this.failureMessage = message
  }

  /**
   * Validate credentials (mock implementation)
   */
  validateCredentials() {
    return !!(this.credentials.consumer_key &&
             this.credentials.consumer_secret &&
             this.credentials.token &&
             this.credentials.token_secret)
  }
}

module.exports = MockTumblrClient