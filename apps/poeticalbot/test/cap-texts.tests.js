const { expect } = require('chai')
const Util = require('../src/lib/util.js')
const { capTexts, TEXT_CHAR_CAP } = require('../src/lib/cap-texts.js')

// textgen-monorepo-986: sentence splitting costs ~75x the text size in
// memory, so a multi-MB corpus selection (12.7MB factbook alone) OOM'd on
// Lambda. Poetifier windows the selected texts down to TEXT_CHAR_CAP total.
describe('capTexts', () => {
  const para = (i) => `Paragraph ${i} has a sentence. And another one here.`
  const bigText = (name, n) => {
    const text = Array.from({ length: n }, (_, i) => para(i)).join('\n')
    return { name, text: () => text, sentences: () => text.split('\n') }
  }
  const small = bigText('small', 10)
  const total = (texts) => texts.reduce((n, t) => n + t.text().length, 0)

  it('returns selections under the cap untouched, drawing no randomness', () => {
    const a = new Util({ seed: 'ct' })
    const b = new Util({ seed: 'ct' })
    const texts = [small, bigText('also-small', 20)]
    expect(capTexts(texts, a)).to.equal(texts)
    expect(a.random()).to.equal(b.random())
  })

  it('windows a big selection to the cap, keeping names and order', () => {
    const texts = [bigText('a', 40000), small, bigText('b', 20000)]
    const capped = capTexts(texts, new Util({ seed: 'ct-1' }))
    expect(capped.map((t) => t.name)).to.deep.equal(['a', 'small', 'b'])
    expect(total(capped)).to.be.at.most(TEXT_CHAR_CAP)
    expect(total(capped)).to.be.above(TEXT_CHAR_CAP * 0.8)
  })

  it('keeps small texts whole; only big ones get windowed', () => {
    const texts = [bigText('huge', 60000), small, bigText('medium', 2000)]
    const capped = capTexts(texts, new Util({ seed: 'ct-7' }))
    expect(capped[1]).to.equal(small)
    expect(capped[2]).to.equal(texts[2])
    expect(total(capped)).to.be.at.most(TEXT_CHAR_CAP)
  })

  it('cuts windows on paragraph boundaries, as a contiguous slice', () => {
    const big = bigText('a', 60000)
    const [w] = capTexts([big], new Util({ seed: 'ct-2' }))
    const lines = w.text().split('\n')
    lines.forEach((l) => expect(l).to.match(/^Paragraph \d+ has/))
    const first = Number(lines[0].match(/\d+/)[0])
    lines.forEach((l, i) =>
      expect(Number(l.match(/\d+/)[0])).to.equal(first + i)
    )
  })

  it('same seed gives the same window; another seed a different one', () => {
    const big = bigText('a', 60000)
    const w = (seed) => capTexts([big], new Util({ seed }))[0].text()
    expect(w('ct-3')).to.equal(w('ct-3'))
    expect(w('ct-3')).to.not.equal(w('ct-4'))
  })

  it('sentences() splits the window, not the whole text', () => {
    const [w] = capTexts([bigText('a', 60000)], new Util({ seed: 'ct-5' }))
    const sents = w.sentences()
    expect(sents.join(' ').length).to.be.at.most(TEXT_CHAR_CAP)
    expect(sents.length).to.be.above(1)
  })

  it('pre-split sentence corpora window by line, without re-splitting', () => {
    const lines = Array.from({ length: 60000 }, (_, i) => `Line ${i} here`)
    const sentenceCorpus = {
      name: 'sentences/big',
      text: () => lines.join('\n'),
      sentences: () => lines
    }
    const [w] = capTexts([sentenceCorpus], new Util({ seed: 'ct-6' }))
    expect(w.sentences()).to.deep.equal(w.text().split('\n'))
  })
})
