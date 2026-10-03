#!/usr/bin/env node
'use strict'

// Derives a Lambda-safe package.json from an app's real package.json instead
// of hand-maintaining a second, drift-prone copy in a build-lambda.sh heredoc
// (see textgen-monorepo-213). Workspace deps (e.g. common-corpus) are dropped
// since those ship via the Lambda layer, not npm install.

const fs = require('fs')
const path = require('path')

const [, , sourcePackageJsonPath, outputPackageJsonPath, mainEntry] = process.argv

if (!sourcePackageJsonPath || !outputPackageJsonPath) {
  console.error('Usage: generate-lambda-package-json.js <source-package.json> <output-package.json> [main]')
  process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync(sourcePackageJsonPath, 'utf8'))

// Pin each dep to the exact version pnpm installed locally (from the lockfile).
// The Lambda build runs npm install without that lockfile, so a range like
// ^14.16.0 floated to 14.17.0 and the same seed made a different poem on
// Lambda than locally (textgen-monorepo-yfs). Read package.json by path, not
// require.resolve - some packages (compromise) don't export it.
const installedVersion = (name) => {
  const p = path.join(path.dirname(sourcePackageJsonPath), 'node_modules', name, 'package.json')
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')).version
  } catch (error) {
    return null
  }
}

const dependencies = {}
for (const [name, version] of Object.entries(pkg.dependencies || {})) {
  if (!version.startsWith('workspace:')) {
    const pinned = installedVersion(name)
    if (!pinned) {
      console.warn(`WARN: ${name} not installed locally, keeping range ${version} (run pnpm install)`)
    }
    dependencies[name] = pinned || version
  }
}

const lambdaPkg = {
  name: `${pkg.name}-lambda`,
  version: pkg.version,
  description: pkg.description,
  main: mainEntry || pkg.main,
  dependencies,
  engines: pkg.engines
}

fs.writeFileSync(outputPackageJsonPath, JSON.stringify(lambdaPkg, null, 2) + '\n')

const nodeEngine = lambdaPkg.engines && lambdaPkg.engines.node
console.log(`Generated ${outputPackageJsonPath} from ${sourcePackageJsonPath} (${Object.keys(dependencies).length} deps, node ${nodeEngine})`)
