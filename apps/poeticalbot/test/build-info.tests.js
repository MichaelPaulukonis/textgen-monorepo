const { expect } = require(`chai`)
const fs = require(`fs`)
const os = require(`os`)
const path = require(`path`)
const { buildId } = require(`../src/lib/build-info.js`)

// textgen-monorepo-7de: posts cite the deployed code next to their seed
describe(`build-info`, () => {
  let dir

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), `build-info-`))
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  const writeInfo = (info) =>
    fs.writeFileSync(path.join(dir, `build-info.json`), JSON.stringify(info))

  it(`uses build-info.json from the Lambda build`, () => {
    writeInfo({ sha: `7151e50`, dirty: false })
    expect(buildId({ dir, env: {} })).to.equal(`7151e50`)
  })

  it(`marks a build from an uncommitted tree`, () => {
    writeInfo({ sha: `7151e50`, dirty: true })
    expect(buildId({ dir, env: {} })).to.equal(`7151e50-dirty`)
  })

  it(`adds the corpus layer version when Lambda passes it`, () => {
    writeInfo({ sha: `7151e50`, dirty: false })
    expect(buildId({ dir, env: { CORPUS_LAYER_VERSION: `4` } })).to.equal(
      `7151e50 (corpus layer v4)`
    )
  })

  it(`falls back to git and marks it local when there is no build file`, () => {
    const id = buildId({ dir, env: {} })
    expect(id).to.match(/^[0-9a-f]{7,}(-dirty)? local$/)
  })
})
