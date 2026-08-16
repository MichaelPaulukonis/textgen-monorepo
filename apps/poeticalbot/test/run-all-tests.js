#!/usr/bin/env node

/**
 * Comprehensive test runner for PoeticalBot
 * Tests both CLI and Lambda execution paths
 */

require('dotenv').config()

const { execSync } = require('child_process')
const path = require('path')

console.log('🧪 PoeticalBot Comprehensive Test Suite')
console.log('=======================================\n')

async function runTest(testFile, description) {
  console.log(`📋 ${description}`)
  console.log(`   Running: ${testFile}`)

  try {
    const output = execSync(`node ${testFile}`, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 30000
    })

    console.log('✅ PASSED')
    if (process.env.VERBOSE) {
      console.log('   Output:', output.split('\n').slice(-3).join('\n'))
    }
    return true
  } catch (error) {
    console.error('❌ FAILED')
    console.error('   Error:', error.message)
    if (error.stdout) {
      console.error('   Output:', error.stdout.split('\n').slice(-5).join('\n'))
    }
    return false
  }
}

async function runMochaTests(pattern, description) {
  console.log(`📋 ${description}`)
  console.log(`   Running: mocha ${pattern}`)

  try {
    const output = execSync(`npx mocha ${pattern} --timeout 10000`, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 30000
    })

    console.log('✅ PASSED')
    return true
  } catch (error) {
    console.error('❌ FAILED')
    console.error('   Error:', error.message)
    if (error.stdout) {
      console.error('   Output:', error.stdout.split('\n').slice(-5).join('\n'))
    }
    return false
  }
}

async function main() {
  const results = []

  console.log('🔍 Environment Check:')
  console.log('   Node version:', process.version)
  console.log('   Working directory:', process.cwd())
  console.log('   Test environment:', process.env.NODE_ENV || 'development')
  console.log('')

  // Unit tests
  console.log('📦 Unit Tests')
  console.log('=============')
  results.push(
    await runMochaTests('test/poetifier.tests.js', 'Poetifier Core Tests')
  )
  results.push(
    await runMochaTests('test/util.tests.js', 'Utility Functions Tests')
  )
  results.push(
    await runMochaTests('test/textutil.tests.js', 'Text Utilities Tests')
  )
  console.log('')

  // Integration tests
  console.log('🔗 Integration Tests')
  console.log('===================')
  results.push(
    await runTest('test/integration/cli.tests.js', 'CLI Interface Test')
  )
  results.push(
    await runTest(
      'test/integration/lambda-handler.tests.js',
      'Lambda Handler Test'
    )
  )
  results.push(
    await runTest(
      'test/integration/npf-integration.tests.js',
      'NPF Integration Test'
    )
  )
  console.log('')

  // Summary
  const passed = results.filter((r) => r).length
  const total = results.length

  console.log('📊 Test Results Summary')
  console.log('======================')
  console.log(`Passed: ${passed}/${total}`)

  if (passed === total) {
    console.log('✅ All tests passed!')
    console.log('\n💡 Ready for deployment!')
  } else {
    console.log('❌ Some tests failed')
    console.log('\n🔧 Fix failing tests before deployment')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('💥 Test runner error:', error.message)
  process.exit(1)
})
