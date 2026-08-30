'use strict'

function validateNPF(npfPost) {
  if (
    !npfPost.content ||
    !Array.isArray(npfPost.content) ||
    npfPost.content.length === 0
  ) {
    return false
  }

  for (const block of npfPost.content) {
    if (!block.type) {
      return false
    }

    if (block.type === 'text' && !block.text) {
      return false
    }

    if (block.formatting) {
      for (const format of block.formatting) {
        if (
          typeof format.start !== 'number' ||
          typeof format.end !== 'number'
        ) {
          return false
        }
      }
    }
  }

  return true
}

async function postWithClient(client, blogName, content, options = {}) {
  const npfPost = { content }
  if (options.tags) {
    npfPost.tags = options.tags
  }
  if (options.title) {
    npfPost.title = options.title
  }

  if (!validateNPF(npfPost)) {
    return {
      success: false,
      postId: null,
      url: null,
      error: 'Generated NPF structure is invalid'
    }
  }

  try {
    const response = await client.createPost(blogName, npfPost)
    return {
      success: true,
      postId: response.id,
      url: `https://${blogName}/post/${response.id}`,
      error: null
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

module.exports = {
  validateNPF,
  postWithClient
}
