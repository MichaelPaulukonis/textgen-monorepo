# Design Document

## Overview

This design outlines the technical approach for consolidating PoeticalBot's codebase into a clean `src/` directory structure while maintaining dual runtime support for both local CLI execution and AWS Lambda deployment. The consolidation eliminates code duplication, prevents deploy script overwrites, and creates a maintainable foundation for future enhancements.

## Architecture

### High-Level Structure

```
project-root/
├── src/                           # Single source of truth
│   ├── index.js                   # Main entry point (dual runtime)
│   ├── config.js                  # Environment-aware configuration
│   ├── cli.js                     # CLI-specific entry point
│   ├── lambda-handler.js          # Lambda-specific handler
│   └── lib/                       # Core libraries
│       ├── poetifier.js           # Poetry generation engine
│       ├── npf-formatter.js       # Tumblr NPF formatting
│       ├── layer-require.js       # Environment-aware module loading
│       ├── tumblr-client.js       # Tumblr API abstraction
│       └── [existing lib files]   # All current poetry libraries
├── test/                          # Testing infrastructure
│   ├── integration/               # End-to-end tests
│   ├── unit/                      # Unit tests for lib components
│   └── fixtures/                  # Test data and mocks
├── terraform/                     # AWS infrastructure
├── deploy.sh                      # Deployment orchestration
├── package.json                   # Project dependencies
└── docs/                          # Documentation
```

## Components and Interfaces

### Core Components

**Note**: This design anticipates future separation of poetry generation and Tumblr posting into separate Lambda functions, with components structured to support that evolution.

#### Service Separation Architecture
```
Current: Single Lambda
┌─────────────────────────────┐
│     Lambda Handler          │
│  ┌─────────┐ ┌─────────────┐│
│  │ Poetry  │ │   Tumblr    ││
│  │   Gen   │ │  Posting    ││
│  └─────────┘ └─────────────┘│
└─────────────────────────────┘

Future: Separate Lambdas
┌─────────────┐    ┌─────────────┐
│   Poetry    │    │   Tumblr    │
│ Generation  │───▶│  Posting    │
│   Lambda    │    │   Lambda    │
└─────────────┘    └─────────────┘
```

#### 1. Main Entry Point (`src/index.js`)
**Purpose**: Environment-aware entry point that detects runtime and delegates appropriately

**Interface**:
```javascript
// For Lambda runtime
exports.handler = async (event, context) => { ... }

// For CLI runtime  
if (require.main === module) {
  runCLI()
}
```

**Responsibilities**:
- Detect execution environment (Lambda vs CLI)
- Load appropriate configuration
- Delegate to runtime-specific handlers
- Provide consistent error handling

#### 2. Configuration Manager (`src/config.js`)
**Purpose**: Environment-aware configuration loading with validation

**Interface**:
```javascript
class Config {
  static load(environment = 'auto') { ... }
  static validate(config) { ... }
  static getDefaults() { ... }
}
```

**Responsibilities**:
- Load from `.env` files (local) or environment variables (Lambda)
- Validate required configuration
- Provide sensible defaults
- Handle sensitive data appropriately

#### 3. CLI Handler (`src/cli.js`)
**Purpose**: Command-line interface for local development and testing

**Interface**:
```javascript
class CLI {
  constructor(config) { ... }
  async run(args) { ... }
  async generatePoem(options) { ... }
  async postToTumblr(poem, options) { ... }
}
```

**Responsibilities**:
- Parse command-line arguments
- Generate poems locally
- Optional Tumblr posting
- Display results to console
- Handle CLI-specific error reporting

#### 4. Lambda Handler (`src/lambda-handler.js`)
**Purpose**: AWS Lambda-specific execution logic with separation-ready architecture

**Interface**:
```javascript
class LambdaHandler {
  constructor(config) { ... }
  async handle(event, context) { ... }
  async processScheduledEvent() { ... }
  async processGenerationRequest(event) { ... }
  async processPostingRequest(event) { ... }
}
```

**Responsibilities**:
- Handle Lambda event types (scheduled, SQS, direct invocation)
- Route to appropriate service (generation vs posting)
- CloudWatch logging
- Lambda-specific error handling
- Future: delegate to separate generation/posting services

#### 5. Environment-Aware Module Loader (`src/lib/layer-require.js`)
**Purpose**: Smart dependency loading for Lambda layers vs local modules

**Interface**:
```javascript
function layerRequire(moduleName, options = {}) { ... }
function detectEnvironment() { ... }
function validateDependency(moduleName) { ... }
```

**Responsibilities**:
- Detect Lambda vs local environment
- Load from Lambda layers or local node_modules
- Provide fallback mechanisms
- Clear error messages for missing dependencies

#### 6. Tumblr Client Abstraction (`src/lib/tumblr-client.js`)
**Purpose**: Unified Tumblr API interface with NPF support

**Interface**:
```javascript
class TumblrClient {
  constructor(credentials) { ... }
  async postPoem(poem) { ... }
  async validateCredentials() { ... }
  async testConnection() { ... }
}
```

**Responsibilities**:
- Abstract tumblr.js library complexity
- Handle NPF posting (single format)
- Credential validation
- Connection testing
- Rate limiting and error handling

## Data Models

### Poem Object
```javascript
{
  title: string,           // Poem title
  text: string,            // Poem content with line breaks
  lines: string[],         // Individual poem lines
  seed: string,            // Generation seed for reproducibility
  source: string,          // Source corpus information
  template: string,        // Template used for generation
  method: string,          // Generation method (jgnoetry, drone, etc.)
  metadata: {              // Additional generation metadata
    transformations: string[],
    corporaFilter: string,
    options: object
  }
}
```

### Configuration Object
```javascript
{
  // Tumblr API credentials
  tumblr: {
    consumerKey: string,
    consumerSecret: string,
    accessToken: string,
    accessSecret: string
  },
  
  // Posting configuration
  posting: {
    enabled: boolean,
    blogName: string
  },
  
  // Poetry generation
  poetry: {
    method: string,
    corporaFilter: string,
    transform: boolean,
    seed: string
  },
  
  // Environment
  environment: 'lambda' | 'cli' | 'test',
  logging: {
    level: string,
    destination: 'console' | 'cloudwatch'
  }
}
```

### NPF Post Object
```javascript
{
  content: [
    {
      type: 'text',
      subtype: 'heading2',
      text: string,
      formatting: [
        {
          start: number,
          end: number,
          type: 'bold'
        }
      ]
    },
    {
      type: 'text',
      text: string
    }
  ],
  tags: string[]
}
```

## Error Handling

### Error Categories
1. **Configuration Errors**: Missing or invalid configuration
2. **Dependency Errors**: Missing modules or layer issues
3. **Generation Errors**: Poetry generation failures
4. **API Errors**: Tumblr API communication issues
5. **Environment Errors**: Runtime environment problems

### Error Handling Strategy
```javascript
class PoeticalBotError extends Error {
  constructor(message, category, details = {}) {
    super(message)
    this.category = category
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

// Usage patterns:
try {
  // Operation
} catch (error) {
  if (error instanceof PoeticalBotError) {
    // Handle known error types
  } else {
    // Wrap unknown errors
    throw new PoeticalBotError(
      'Unexpected error during operation',
      'UNKNOWN',
      { originalError: error.message }
    )
  }
}
```

## Testing Strategy

### Test Structure
```
test/
├── unit/                          # Unit tests
│   ├── lib/                       # Library component tests
│   │   ├── poetifier.test.js
│   │   ├── npf-formatter.test.js
│   │   └── layer-require.test.js
│   ├── config.test.js
│   └── cli.test.js
├── integration/                   # Integration tests
│   ├── lambda-handler.test.js
│   ├── tumblr-posting.test.js
│   └── end-to-end.test.js
├── fixtures/                      # Test data
│   ├── sample-poems.json
│   ├── mock-config.json
│   └── tumblr-responses.json
└── helpers/                       # Test utilities
    ├── mock-tumblr.js
    └── test-config.js
```

### Testing Approach
- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **Environment Tests**: Verify both CLI and Lambda execution paths
- **Mock Services**: Mock Tumblr API for reliable testing
- **Fixture Data**: Consistent test data across test suites

## Deployment Strategy

### Build Process
1. **Validation**: Lint code and run tests
2. **Dependency Resolution**: Install production dependencies
3. **Package Creation**: Create deployment package from `src/`
4. **Infrastructure Update**: Apply Terraform changes
5. **Function Deployment**: Deploy Lambda function
6. **Verification**: Run post-deployment tests

### Deployment Script Updates
```bash
#!/bin/bash
set -e

echo "Building from src/ directory..."
cd src
npm ci --production

echo "Creating deployment package..."
zip -r ../terraform/poeticalbot-lambda.zip . -x "*.test.js" "test/*"

echo "Deploying infrastructure..."
cd ../terraform
terraform apply

echo "Verifying deployment..."
# Run post-deployment verification
```

### Environment Variables
Lambda environment variables will be managed through Terraform:
```hcl
resource "aws_lambda_function" "poeticalbot" {
  # ... other configuration
  
  environment {
    variables = {
      CONSUMER_KEY    = var.consumer_key
      CONSUMER_SECRET = var.consumer_secret
      TOKEN          = var.token
      TOKEN_SECRET   = var.token_secret
      POST_LIVE      = var.post_live
      ENVIRONMENT    = "lambda"
    }
  }
}
```

## Migration Plan

### Phase 1: Structure Creation
1. Create `src/` directory structure
2. Move core files from `lambda/` to `src/`
3. Update import paths and references
4. Create environment detection logic

### Phase 2: Dual Runtime Implementation
1. Implement CLI entry point
2. Create Lambda handler wrapper
3. Add environment-aware configuration
4. Update layer-require for new structure

### Phase 3: Testing and Validation
1. Create comprehensive test suite
2. Validate both CLI and Lambda execution
3. Test deployment process
4. Verify NPF posting functionality

### Phase 4: Cleanup and Documentation
1. Remove duplicate files from root
2. Update deployment scripts
3. Create usage documentation
4. Update README and setup guides

## Future Enhancement Readiness

### Service Separation Support
The current design anticipates separation into distinct Lambda functions:

#### Poetry Generation Service
- **Input**: Generation parameters (method, seed, corpus filter)
- **Output**: Poem object with metadata
- **Storage**: Could output to SQS, S3, or direct invocation response
- **Components**: Poetifier, corpus management, generation libraries

#### Tumblr Posting Service  
- **Input**: Poem object (from generation service)
- **Output**: Post confirmation and metadata
- **Components**: NPF formatter, Tumblr client, posting logic

#### Communication Patterns
```javascript
// Current: Direct coupling
const poem = await poetifier.generate()
await tumblrClient.post(poem)

// Future: Service separation
const poem = await invokeGenerationLambda(params)
await invokePostingLambda(poem)

// Or via queue
await sendToQueue('poetry-generation', params)
// Generation Lambda processes and sends to posting queue
await sendToQueue('tumblr-posting', poem)
```

### Extensibility Points
1. **Service Architecture**: Components designed for easy extraction into separate services
2. **New Poetry Methods**: Plugin architecture in `src/lib/generators/`
3. **Output Formats**: Extensible formatter system
4. **Deployment Targets**: Environment detection can support new platforms
5. **API Integrations**: Modular client architecture
6. **Inter-Service Communication**: Support for SQS, direct invocation, or HTTP APIs

### Configuration Expansion
The configuration system is designed to accommodate:
- Multiple social media platforms
- Different posting schedules
- Advanced poetry generation options
- Custom corpus management
- Enhanced metadata tracking
- Service-to-service authentication
- Queue and messaging configuration

### Migration Path to Separate Services
1. **Phase 1**: Current consolidated implementation
2. **Phase 2**: Add service interfaces and abstractions
3. **Phase 3**: Extract generation logic to separate deployable unit
4. **Phase 4**: Extract posting logic to separate deployable unit
5. **Phase 5**: Add inter-service communication (SQS, API Gateway, etc.)

This design provides a solid foundation for the current consolidation while enabling future service separation and maintaining clean separation of concerns across different runtime environments.