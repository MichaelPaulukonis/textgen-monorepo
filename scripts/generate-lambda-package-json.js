#!/usr/bin/env node
'use strict'

// Derives a Lambda-safe package.json from an app's real package.json instead
// of hand-maintaining a second, drift-prone copy in a build-lambda.sh heredoc
// (see textgen-monorepo-213). Workspace deps (e.g. common-corpus) are dropped
// since those ship via the Lambda layer, not npm install.

const fs = require('fs')

const [, , sourcePackageJsonPath, outputPackageJsonPath, mainEntry] = process.argv

if (!sourcePackageJsonPath || !outputPackageJsonPath) {
  console.error('Usage: generate-lambda-package-json.js <source-package.json> <output-package.json> [main]')
  process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync(sourcePackageJsonPath, 'utf8'))

const dependencies = {}
for (const [name, version] of Object.entries(pkg.dependencies || {})) {
  if (!version.startsWith('workspace:')) {
    dependencies[name] = version
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
