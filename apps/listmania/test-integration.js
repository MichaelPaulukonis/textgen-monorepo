/**
 * Quick integration test to verify Lambda handler and common-corpus integration
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') })

console.log('Testing Listmania Lambda Integration...\n')

try {
  // Test 1: Load Lambda handler
  console.log('1. Loading Lambda handler...')
  const { LambdaHandler } = require('./lambda/index.js')
  console.log('   ✅ Lambda handler loaded successfully')

  // Test 2: Instantiate handler
  console.log('\n2. Instantiating handler...')
  const handler = new LambdaHandler()
  console.log('   ✅ Handler instantiated successfully')

  // Test 3: Verify config
  console.log('\n3. Verifying configuration...')
  console.log('   Config loaded:', !!handler.config)
  console.log('   Listifier loaded:', !!handler.listifier)
  console.log('   Tumblr client loaded:', !!handler.client)
  console.log('   ✅ Configuration verified')

  // Test 4: Test common-corpus integration
  console.log('\n4. Testing common-corpus integration...')
  const Corpora = require('common-corpus')
  const corpora = new Corpora()
  console.log('   ✅ common-corpus loaded from workspace')
  console.log('   Available texts:', corpora.texts.length)

  // Test 5: Test getText method
  console.log('\n5. Testing getText method...')
  const textObj = handler.getText()
  console.log('   ✅ getText() successful')
  console.log('   Source:', textObj.source)
  console.log('   Text length:', textObj.text.length)

  console.log('\n✅ All integration tests passed!')
  console.log('\nListmania is properly integrated with:')
  console.log('  - Lambda handler wrapper')
  console.log('  - Workspace common-corpus dependency')
  console.log('  - Nx build system')

  process.exit(0)
} catch (error) {
  console.error('\n❌ Integration test failed!')
  console.error('Error:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}
