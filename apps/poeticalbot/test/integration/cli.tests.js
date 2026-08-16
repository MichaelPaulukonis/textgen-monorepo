#!/usr/bin/env node

// CLI integration test
require('dotenv').config()

const CLI = require('../../src/cli')

console.log('🧪 Testing CLI Interface')
console.log('========================')

async function testCLI() {
  try {
    const cli = new CLI()

    console.log('📋 Testing poem generation...')
    const result = await cli.generatePoem({
      method: 'queneau-buckets',
      corporaFilter: 'eliot'
    })

    if (result.error) {
      console.error('❌ Generation failed:', result.error)
      return false
    }

    if (!result.poem) {
      console.error('❌ No poem generated')
      return false
    }

    console.log('✅ Poem generated successfully')
    console.log('Title:', result.poem.title)
    console.log('Text length:', result.poem.text.length)
    console.log('Seed:', result.poem.seed)

    return true
  } catch (error) {
    console.error('❌ CLI test failed:', error.message)
    return false
  }
}

testCLI()
  .then((success) => {
    if (success) {
      console.log('\n✅ CLI test completed successfully')
    } else {
      console.log('\n❌ CLI test failed')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error.message)
    process.exit(1)
  })
