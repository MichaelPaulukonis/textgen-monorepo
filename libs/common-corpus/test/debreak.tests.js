'use strict'

const { expect } = require('chai')
const debreak = require('../lib/debreak.js')

describe('debreak', function () {
  it('joins word-wrapped lines into one paragraph per line', function () {
    expect(debreak('A line\nthat wraps\n\nNext para')).to.equal(
      'A line that wraps\nNext para'
    )
  })

  // textgen-monorepo-qi5: table rows (a mid-line gap of 3+ spaces) are not
  // word-wrapped prose; each row stays its own paragraph, spacing intact
  // (owner decision: keep column spacing)
  it('keeps table rows as separate paragraphs with their column spacing', function () {
    const table = [
      'Some intro text that',
      'wraps here.',
      'James Bush                      Somerset            1664',
      'James Device                    Lancs               1613',
      '',
      'After the table.'
    ].join('\n')
    expect(debreak(table).split('\n')).to.deep.equal([
      'Some intro text that wraps here.',
      'James Bush                      Somerset            1664',
      'James Device                    Lancs               1613',
      'After the table.'
    ])
  })

  it('does not treat leading indentation as a column gap', function () {
    expect(debreak('    Indented verse line\n    continues here')).to.equal(
      'Indented verse line continues here'
    )
  })
})
