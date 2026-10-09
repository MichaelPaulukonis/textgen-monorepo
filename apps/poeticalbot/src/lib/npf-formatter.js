/**
 * NPF (Neue Post Format) Formatter for PoeticalBot
 * Converts poem objects to Tumblr's NPF content blocks
 */

/**
 * Tumblr NPF caps a text block at 4,096 characters, counted in Unicode code
 * points. A longer block gets 400 Bad Request (textgen-monorepo-mz6).
 */
const MAX_TEXT_BLOCK = 4096

const cpLength = (text) => [...text].length

// Split one over-long line at spaces; a single word over the limit is cut.
function splitLine(line, max) {
  const pieces = []
  let current = ''
  for (const word of line.split(' ')) {
    const candidate = current ? `${current} ${word}` : word
    if (cpLength(candidate) <= max) {
      current = candidate
      continue
    }
    if (current) pieces.push(current)
    current = ''
    if (cpLength(word) <= max) {
      current = word
    } else {
      const cps = [...word]
      for (let i = 0; i < cps.length; i += max) {
        pieces.push(cps.slice(i, i + max).join(''))
      }
    }
  }
  if (current) pieces.push(current)
  return pieces
}

/**
 * Split text into chunks of at most `max` code points, breaking between
 * lines (and only inside a line when that line alone is too long). Text
 * under the limit comes back as a single chunk, unchanged.
 */
function splitTextBlocks(text, max = MAX_TEXT_BLOCK) {
  if (cpLength(text) <= max) return [text]
  const chunks = []
  let current = null
  for (const line of text.split('\n')) {
    if (cpLength(line) > max) {
      if (current !== null) chunks.push(current)
      current = null
      chunks.push(...splitLine(line, max))
      continue
    }
    const candidate = current === null ? line : `${current}\n${line}`
    if (cpLength(candidate) <= max) {
      current = candidate
    } else {
      chunks.push(current)
      current = line
    }
  }
  if (current !== null) chunks.push(current)
  return chunks.filter((chunk) => chunk !== '')
}

/**
 * Convert a poem object to NPF format
 * @param {Object} poem - Poem object with title, text, and metadata
 * @returns {Object} NPF-compatible post object
 */
function convertPoemToNPF(poem) {
  const content = []

  // Add title as heading2 with bold formatting
  if (poem.title) {
    content.push({
      type: 'text',
      subtype: 'heading2',
      text: poem.title,
      formatting: [
        {
          start: 0,
          end: poem.title.length,
          type: 'bold'
        }
      ]
    })
  }

  // Add poem text as main content, split to fit Tumblr's block limit
  if (poem.text) {
    for (const text of splitTextBlocks(poem.text)) {
      content.push({
        type: 'text',
        text
      })
    }
  }

  // Add metadata as italic text
  if (poem.seed || poem.source) {
    for (const text of splitTextBlocks(createMetadataText(poem))) {
      content.push({
        type: 'text',
        text,
        formatting: [
          {
            start: 0,
            end: cpLength(text),
            type: 'italic'
          },
          {
            start: 0,
            end: cpLength(text),
            type: 'small'
          }
        ]
      })
    }
  }

  return {
    content: content,
    tags: ['poetry', 'generated', 'poeticalbot']
  }
}

function flattenObj(obj, parent, res = {}) {
  for (let key in obj) {
    let propName = parent ? parent + '_' + key : key
    if (typeof obj[key] === 'object') {
      flattenObj(obj[key], propName, res)
    } else {
      res[propName] = obj[key]
    }
  }
  return res
}

/**
 * Create metadata text from poem properties
 * @param {Object} poem - Poem object
 * @returns {string} Formatted metadata text
 */
function createMetadataText(poem) {
  const parts = []

  if (poem.seed) {
    parts.push(`Generated with seed: ${poem.seed}`)
  }

  if (poem.source) {
    parts.push(`Source: ${poem.source}`)
  }

  if (poem.template) {
    parts.push(`Template: ${poem.template}`)
  }

  if (poem.options) {
    const flatOptions = flattenObj(poem.options)
    for (const [key, value] of Object.entries(flatOptions)) {
      parts.push(`${key}: ${value}`)
    }
  }

  if (poem.method) {
    parts.push(`Method: ${poem.method}`)
  }

  return parts.join('\n')
}

/**
 * Alternative: Convert poem to NPF with separate metadata handling
 * This version puts metadata in AWS logs instead of the post
 * @param {Object} poem - Poem object
 * @param {Function} logger - Logger function for metadata
 * @returns {Object} NPF-compatible post object
 */
function convertPoemToNPFWithLogging(poem, logger) {
  const content = []

  // Add title as heading2 with bold formatting
  if (poem.title) {
    content.push({
      type: 'text',
      subtype: 'heading2',
      text: poem.title,
      formatting: [
        {
          start: 0,
          end: poem.title.length,
          type: 'bold'
        }
      ]
    })
  }

  // Add poem text as main content
  if (poem.text) {
    content.push({
      type: 'text',
      text: poem.text
    })
  }

  // Log metadata instead of including in post
  if (logger && (poem.seed || poem.source)) {
    const metadata = {
      seed: poem.seed,
      source: poem.source,
      template: poem.template,
      method: poem.method
    }
    logger('Poem metadata: ' + JSON.stringify(metadata))
  }

  return {
    content: content,
    tags: ['poetry', 'generated', 'poeticalbot']
  }
}

/**
 * Validate NPF content structure
 * @param {Object} npfPost - NPF post object
 * @returns {boolean} True if valid
 */
function validateNPF(npfPost) {
  if (
    !npfPost.content ||
    !Array.isArray(npfPost.content) ||
    npfPost.content.length === 0
  ) {
    return false
  }

  // Check each content block
  for (const block of npfPost.content) {
    if (!block.type) {
      return false
    }

    if (block.type === 'text' && !block.text) {
      return false
    }

    if (block.type === 'text' && cpLength(block.text) > MAX_TEXT_BLOCK) {
      return false
    }

    // Validate formatting if present
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
  MAX_TEXT_BLOCK,
  splitTextBlocks,
  convertPoemToNPF,
  convertPoemToNPFWithLogging,
  createMetadataText,
  validateNPF
}
