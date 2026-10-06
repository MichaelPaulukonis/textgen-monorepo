const { expect } = require('chai')
const {
  generatePoem,
  MAX_POEM_ATTEMPTS,
  EXHAUSTED_MARKER
} = require('../src/lib/generate-poem.js')

// Fake Poetifier: returns queued results in order, records each config it saw
const fakePoetifier = (results) => {
  const seen = []
  const snapshots = []
  class FakePoetifier {
    constructor({ config }) {
      seen.push(config)
      snapshots.push({ ...config })
      this.config = config
    }

    poem() {
      const next = results.shift()
      if (next instanceof Error) throw next
      // mimic the real poetifier mutating its config (poetifier.js `config.reduce = true`)
      this.config.reduce = true
      return next
    }
  }
  FakePoetifier.seen = seen
  FakePoetifier.snapshots = snapshots
  return FakePoetifier
}

const empty = { title: '', text: '', seed: 'x', method: 'drone', source: '' }
const good = { title: 'A Title', text: 'some words\nmore words', seed: 'y' }

describe('generatePoem (retry runner)', () => {
  let logs
  const log = (msg) => logs.push(msg)
  beforeEach(() => {
    logs = []
  })

  it('returns the first good poem without retrying', () => {
    const Poetifier = fakePoetifier([good])
    const result = generatePoem({}, { Poetifier, log })
    expect(result.poem).to.equal(good)
    expect(result.error).to.equal(null)
    expect(result.attempts).to.equal(1)
  })

  it('retries empty poems and succeeds on attempt N+1', () => {
    const Poetifier = fakePoetifier([empty, empty, good])
    const result = generatePoem({}, { Poetifier, log })
    expect(result.poem).to.equal(good)
    expect(result.attempts).to.equal(3)
  })

  it('treats whitespace-only title/text as empty', () => {
    const blank = { title: '  ', text: '\n \n' }
    const Poetifier = fakePoetifier([blank, good])
    expect(generatePoem({}, { Poetifier, log }).attempts).to.equal(2)
  })

  it('retries thrown exceptions and logs the stack', () => {
    const Poetifier = fakePoetifier([new Error('kaboom'), good])
    const result = generatePoem({}, { Poetifier, log })
    expect(result.poem).to.equal(good)
    expect(logs.join('\n')).to.include('kaboom')
  })

  it('gives up after MAX_POEM_ATTEMPTS, logs the marker, does not throw', () => {
    const Poetifier = fakePoetifier(Array(10).fill(empty))
    const result = generatePoem({}, { Poetifier, log })
    expect(result.poem).to.equal(null)
    expect(result.error).to.be.a('string')
    expect(result.attempts).to.equal(MAX_POEM_ATTEMPTS)
    expect(Poetifier.seen).to.have.length(MAX_POEM_ATTEMPTS)
    const marked = logs.filter((l) => l.includes(EXHAUSTED_MARKER))
    expect(marked).to.have.length(1)
  })

  it('gives each attempt its own config copy (no leaked mutation)', () => {
    const config = { transform: false }
    const Poetifier = fakePoetifier([empty, good])
    generatePoem(config, { Poetifier, log })
    expect(config).to.deep.equal({ transform: false })
    const [first, second] = Poetifier.seen
    expect(first).to.not.equal(second)
    expect(Poetifier.snapshots[1].reduce).to.equal(undefined)
  })

  // textgen-monorepo-ewv: an OOM or timeout kills the process mid-poem, so the
  // seed has to be in the log before generation starts or the crash can't be
  // replayed
  it('logs each attempt seed before generating, and generates with it', () => {
    const logged = []
    const seenAtPoem = []
    class Spy {
      constructor({ config }) {
        this.config = config
      }

      poem() {
        seenAtPoem.push({ seed: this.config.seed, log: logged.join('\n') })
        return seenAtPoem.length === 1 ? empty : good
      }
    }
    generatePoem({}, { Poetifier: Spy, log: (m) => logged.push(m) })

    expect(seenAtPoem).to.have.lengthOf(2)
    seenAtPoem.forEach(({ seed, log }) => {
      expect(seed).to.be.a('string').and.not.equal('')
      expect(log).to.contain(seed)
    })
    expect(seenAtPoem[0].seed).to.not.equal(seenAtPoem[1].seed)
  })

  it('makes only one attempt when the seed is pinned (retries would repeat)', () => {
    const Poetifier = fakePoetifier([empty, good])
    const result = generatePoem({ seed: 'pinned' }, { Poetifier, log })
    expect(result.poem).to.equal(null)
    expect(result.attempts).to.equal(1)
  })
})
