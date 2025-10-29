# Listmania Migration Analysis

## Current Application Overview

**Listmania** is a Node.js CLI application that generates creative lists using natural language processing. It analyzes text corpora to extract and transform content into various types of lists, then posts them to Tumblr.

### Core Functionality

#### CLI Interface
- **Entry Point**: `index.js`
- **Command Line Options**:
  - `-c, --corporaFilter [string]`: Filter text sources by filename substring
  - `-p, --patternMatch [string]`: NLP-compromise match pattern for list elements
  - `-m, --method [string]`: Generation method (matchStrats, posStrats, posStratAdjs, weirdStrats, patternStrats)
- **Version**: 0.1.0

#### List Generation Process
1. **Text Source Selection**: Uses common-corpus library to select text sources
2. **Content Extraction**: Extracts 50,000 character chunks from selected texts
3. **NLP Processing**: Uses compromise.js for natural language processing
4. **List Building**: Applies various strategies to build lists:
   - **matchStrats**: Pattern matching using NLP tags
   - **posStrats**: Part-of-speech based extraction
   - **posStratAdjs**: Adjective + noun combinations
   - **weirdStrats**: Creative combinations (celebrity + body part, etc.)
   - **patternStrats**: Dynamic pattern generation
5. **Post-Processing**: Cleans, sorts, and formats the final list
6. **Publishing**: Posts to Tumblr blog "leanstooneside"

#### Key Dependencies
- **common-corpus**: Text corpus library (currently GitHub dependency)
- **compromise**: Natural language processing
- **corpora-project**: Additional data sources
- **tumblr.js**: Tumblr API client
- **commander**: CLI argument parsing
- **fuzzy-matching**: Method name matching

### Current Deployment Configuration

#### Heroku Deployment
- **Platform**: Currently deployed on Heroku
- **Scheduling**: Uses Heroku Scheduler addon for periodic execution
- **Environment Variables**:
  - `consumer_key`: Tumblr API consumer key
  - `consumer_secret`: Tumblr API consumer secret
  - `token`: Tumblr access token
  - `token_secret`: Tumblr access token secret
  - `post_live`: Boolean flag to enable/disable live posting
- **Scripts**: 
  - `heroku logs -n 1500 > heroku.log`: Log retrieval
  - No Procfile found (likely uses default `npm start`)

#### Configuration Management
- Uses `dotenv` for local development environment variables
- Configuration loaded in `config.js`
- Supports both development (.env file) and production (environment variables) modes

### Code Structure Analysis

#### Main Components
1. **index.js**: Main entry point, CLI setup, and orchestration
2. **lib/listify.js**: Core list generation logic (1000+ lines)
3. **lib/util.js**: Utility functions for randomization and text processing
4. **lib/textutil.js**: Text processing utilities
5. **lib/prep.js**: Post-processing and formatting for publication
6. **config.js**: Environment configuration management

#### Data Sources
- **data/clue_combo.json**: Crossword clue combinations
- **data/fifteen.thousand.json**: Word frequency data
- **corpora-project**: External data collections (interjections, geography, etc.)

#### Testing
- **Test Framework**: Mocha with Chai
- **Coverage**: NYC for code coverage
- **Linting**: Standard.js
- **Tests**: Unit tests for core utilities (listify, textutil, util)

## Lambda Migration Requirements

### Handler Wrapper Design
The Lambda handler needs to:

1. **Event Processing**: Convert Lambda events to CLI arguments
2. **Environment Adaptation**: Handle Lambda environment differences
3. **Error Handling**: Provide proper Lambda response formatting
4. **Timeout Management**: Handle Lambda execution time limits
5. **Logging**: Adapt logging for CloudWatch

### Event-to-CLI Conversion
Lambda events should map to CLI options:
```javascript
// Example event structure
{
  "corporaFilter": "eliot",
  "method": "weirdStrats",
  "patternMatch": "#Adjective #Noun",
  "postLive": true
}

// Maps to CLI: node index.js -c eliot -m weirdStrats -p "#Adjective #Noun"
```

### Environment Variables Migration
Heroku → Lambda environment variable mapping:
- `consumer_key` → `CONSUMER_KEY`
- `consumer_secret` → `CONSUMER_SECRET`
- `token` → `TOKEN`
- `token_secret` → `TOKEN_SECRET`
- `post_live` → `POST_LIVE`

### Scheduling Migration
- **From**: Heroku Scheduler addon
- **To**: AWS EventBridge/CloudWatch Events
- **Frequency**: Needs to be determined from current Heroku scheduler configuration
- **Event Payload**: Should include generation parameters

### Dependencies Considerations
- **common-corpus**: Will use workspace dependency instead of GitHub
- **File System**: Lambda has read-only file system except /tmp
- **Memory**: Current memory usage needs assessment
- **Cold Start**: Minimize initialization time

### Terraform Configuration Requirements
1. **Lambda Function**: Node.js 18.x runtime
2. **IAM Role**: Basic Lambda execution permissions
3. **EventBridge Rule**: For scheduled execution
4. **Environment Variables**: Tumblr API credentials
5. **CloudWatch Logs**: For monitoring and debugging

## Migration Strategy

### Phase 1: Workspace Integration
1. Update package.json to use workspace common-corpus dependency
2. Create Nx project configuration
3. Preserve existing CLI functionality

### Phase 2: Lambda Handler Creation
1. Create lambda/index.js wrapper
2. Implement event-to-CLI argument conversion
3. Add Lambda-specific error handling and response formatting

### Phase 3: Infrastructure Setup
1. Create terraform configuration for Lambda deployment
2. Set up EventBridge scheduling
3. Configure environment variables and IAM roles

### Phase 4: Testing and Validation
1. Test Lambda handler locally
2. Validate workspace dependency resolution
3. Test deployment pipeline

## Potential Challenges

1. **File System Dependencies**: Ensure all file operations work in Lambda
2. **Memory Usage**: Monitor memory consumption with large text processing
3. **Cold Start Performance**: Optimize initialization time
4. **Timeout Limits**: Ensure generation completes within Lambda timeout
5. **Dependency Size**: Manage Lambda package size with all dependencies

## Success Criteria

1. ✅ Listmania successfully migrated to apps/listmania/
2. ✅ Workspace common-corpus dependency working
3. ✅ Existing CLI functionality preserved
4. ✅ Lambda handler successfully wraps CLI functionality
5. ✅ Terraform deployment working
6. ✅ EventBridge scheduling replacing Heroku scheduler
7. ✅ All tests passing in monorepo context