'use strict'

const util = require('./util.js')({ statusVerbosity: 0 })

function toNPFContent(list) {
  const titleBlock = {
    type: 'text',
    subtype: 'heading2',
    text: list.metadata.title,
    formatting: [
      { start: 0, end: list.metadata.title.length, type: 'bold' }
    ]
  }

  const subtype = util.coinflip()
    ? 'numbered-list-item'
    : 'unordered-list-item'

  const itemBlocks = list.list.map((item) => ({
    type: 'text',
    subtype,
    text: item
  }))

  return [titleBlock, ...itemBlocks]
}

module.exports = { toNPFContent }
