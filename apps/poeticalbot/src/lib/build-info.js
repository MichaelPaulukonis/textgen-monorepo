// Which code made a poem, so a post's seed can be replayed against the right
// build (textgen-monorepo-7de). A seed alone isn't enough: the same seed gives
// a different poem once the code or corpus changes.
//
// Lambda: scripts/build-lambda.sh writes build-info.json next to the src
// files, and terraform passes CORPUS_LAYER_VERSION. Local: git, marked 'local'.
const fs = require(`fs`)
const path = require(`path`)
const { execSync } = require(`child_process`)

const SRC_DIR = path.join(__dirname, `..`)

const readBuildFile = (dir) => {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(dir, `build-info.json`), `utf8`)
    )
  } catch (e) {
    return null
  }
}

const readGit = () => {
  const git = (args) =>
    execSync(`git ${args}`, {
      cwd: SRC_DIR,
      stdio: [`ignore`, `pipe`, `ignore`]
    })
      .toString()
      .trim()
  try {
    return {
      sha: git(`rev-parse --short HEAD`),
      dirty: git(`status --porcelain`) !== ``,
      local: true
    }
  } catch (e) {
    return null
  }
}

let cached = null

function buildId({ dir = SRC_DIR, env = process.env } = {}) {
  const info = readBuildFile(dir) || readGit()
  let id = info ? info.sha + (info.dirty ? `-dirty` : ``) : `unknown`
  if (info && info.local) id += ` local`
  if (env.CORPUS_LAYER_VERSION)
    id += ` (corpus layer v${env.CORPUS_LAYER_VERSION})`
  return id
}

// the build can't change while the process runs, so look it up once
buildId.current = () => cached || (cached = buildId())

module.exports = { buildId }
