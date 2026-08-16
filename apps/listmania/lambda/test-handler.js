/**
 * Local test script for Listmania Lambda handler
 * Tests the handler with various event types
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const { LambdaHandler } = require('./index.js')

// Mock Lambda context
const createMockContext = () => ({
  awsRequestId: 'test-request-' + Date.now(),
  functionName: 'listmania-test',
  functionVersion: '1',
  invokedFunctionArn:
    'arn:aws:lambda:us-east-1:123456789012:function:listmania-test',
  memoryLimitInMB: '512',
  getRemainingTimeInMillis: () => 30000
})

// Test scenarios
const testScenarios = {
  // Test 1: Scheduled event (EventBridge)
  scheduledEvent: {
    name: 'Scheduled Event (EventBridge)',
    event: {
      source: 'aws.events',
      'detail-type': 'Scheduled Event',
      time: new Date().toISOString()
    }
  },

  // Test 2: Direct invocation with default settings
  directInvocation: {
    name: 'Direct Invocation (Default)',
    event: {
      action: 'generate-and-post'
    }
  },

  // Test 3: Direct invocation with custom options
  directInvocationWithOptions: {
    name: 'Direct Invocation (Custom Options)',
    event: {
      corporaFilter: 'shakespeare',
      method: 'matchStrats'
    }
  },

  // Test 4: Generate only (no posting)
  generateOnly: {
    name: 'Generate Only (No Posting)',
    event: {
      action: 'generate-only',
      corporaFilter: 'poetry'
    }
  }
}

// Run a single test
async function runTest(scenario) {
  console.log('\n' + '='.repeat(80))
  console.log(`TEST: ${scenario.name}`)
  console.log('='.repeat(80))
  console.log('Event:', JSON.stringify(scenario.event, null, 2))
  console.log('-'.repeat(80))

  const handler = new LambdaHandler()
  const context = createMockContext()

  try {
    const startTime = Date.now()
    const result = await handler.handle(scenario.event, context)
    const duration = Date.now() - startTime

    console.log('\nRESULT:')
    console.log('Status Code:', result.statusCode)
    console.log('Duration:', duration + 'ms')

    const body = JSON.parse(result.body)
    console.log('Response Body:', JSON.stringify(body, null, 2))

    if (body.list) {
      console.log('\nGenerated List Preview:')
      console.log('Title:', body.list.metadata?.title)
      console.log('Items:', body.list.list?.length)
      console.log('First 3 items:', body.list.list?.slice(0, 3))
    }

    return { success: result.statusCode === 200, result, duration }
  } catch (error) {
    console.error('\nERROR:', error.message)
    console.error('Stack:', error.stack)
    return { success: false, error, duration: 0 }
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n' + '█'.repeat(80))
  console.log('LISTMANIA LAMBDA HANDLER TEST SUITE')
  console.log('█'.repeat(80))

  const results = []

  for (const scenario of Object.values(testScenarios)) {
    const result = await runTest(scenario)
    results.push({ name: scenario.name, ...result })

    // Wait a bit between tests
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  // Summary
  console.log('\n' + '█'.repeat(80))
  console.log('TEST SUMMARY')
  console.log('█'.repeat(80))

  results.forEach((result) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} - ${result.name} (${result.duration}ms)`)
  })

  const passCount = results.filter((r) => r.success).length
  const totalCount = results.length
  console.log(`\nTotal: ${passCount}/${totalCount} tests passed`)
  console.log('█'.repeat(80) + '\n')
}

// Run specific test or all tests
const testName = process.argv[2]

if (testName && testScenarios[testName]) {
  runTest(testScenarios[testName])
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test failed:', err)
      process.exit(1)
    })
} else if (testName) {
  console.error(`Unknown test: ${testName}`)
  console.log('Available tests:', Object.keys(testScenarios).join(', '))
  process.exit(1)
} else {
  runAllTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test suite failed:', err)
      process.exit(1)
    })
}
