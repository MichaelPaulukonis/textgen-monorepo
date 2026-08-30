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

module.exports = {
  validateNPF
}
