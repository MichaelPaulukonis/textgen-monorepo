# Listmania Lambda Handler

AWS Lambda handler wrapper for the Listmania list generation bot. This handler wraps the existing CLI functionality to enable serverless deployment on AWS Lambda.

## Overview

The Lambda handler provides multiple invocation patterns:

1. **Scheduled Events** (EventBridge/CloudWatch Events) - Automated list generation and posting
2. **Direct Invocation** - Manual triggering with custom options
3. **SQS Events** - Future service separation support

## Event Formats

### Scheduled Event (EventBridge)

```json
{
  "source": "aws.events",
  "detail-type": "Scheduled Event",
  "time": "2024-01-15T12:00:00Z"
}
```

This will generate and post a list using default configuration.

### Direct Invocation - Default

```json
{
  "action": "generate-and-post"
}
```

Generates and posts a list with default settings.

### Direct Invocation - Custom Options

```json
{
  "corporaFilter": "shakespeare",
  "matchPattern": "#Adjective #Noun",
  "method": "matchStrats"
}
```

Supported options:
- `corporaFilter` / `corpora_filter`: Filter corpus by filename substring
- `matchPattern` / `match_pattern` / `patternMatch` / `pattern_match`: NLP pattern for list elements
- `method`: Generation method (matchStrats, posStrats, posStratAdjs, weirdStrats, patternStrats)

### Generate Only (No Posting)

```json
{
  "action": "generate-only",
  "corporaFilter": "poetry"
}
```

Generates a list but does not post to Tumblr.

### Post Only

```json
{
  "action": "post-only",
  "list": {
    "list": ["item1", "item2", "item3"],
    "metadata": {
      "title": "My List",
      "source": "test",
      "strategy": "manual",
      "length": 3
    },
    "printable": "<div class='list'>...</div>"
  }
}
```

Posts a pre-generated list to Tumblr.

## Response Format

### Success Response

```json
{
  "statusCode": 200,
  "body": {
    "message": "List generated and posted successfully",
    "postId": "123456789",
    "listTitle": "Things That Are Lost",
    "listLength": 25,
    "requestId": "abc-123-def"
  }
}
```

### Error Response

```json
{
  "statusCode": 500,
  "body": {
    "error": "List generation failed",
    "message": "No list generated for text 'source.txt' after 5 attempts",
    "requestId": "abc-123-def"
  }
}
```

## Environment Variables

Required environment variables (set in Lambda configuration):

- `consumer_key` - Tumblr OAuth consumer key
- `consumer_secret` - Tumblr OAuth consumer secret
- `token` - Tumblr OAuth access token
- `token_secret` - Tumblr OAuth access token secret
- `post_live` - Set to "true" to enable posting (default: false)

## Local Testing

Test the handler locally using the test script:

```bash
# Run all tests
node lambda/test-handler.js

# Run specific test
node lambda/test-handler.js scheduledEvent
node lambda/test-handler.js directInvocation
node lambda/test-handler.js generateOnly
```

Available test scenarios:
- `scheduledEvent` - Simulates EventBridge scheduled event
- `directInvocation` - Default direct invocation
- `directInvocationWithOptions` - Direct invocation with custom options
- `generateOnly` - Generate without posting

## Deployment

The Lambda function will be deployed using Terraform (see task 8 in the migration plan). The handler expects:

1. Node.js 18.x runtime
2. Environment variables configured
3. EventBridge rule for scheduled execution
4. Appropriate IAM permissions for CloudWatch Logs

## Architecture

The handler follows the same pattern as PoeticalBot:

```
LambdaHandler
├── handle() - Main entry point, routes events
├── processScheduledEvent() - Handles EventBridge events
├── processDirectInvocation() - Handles direct invocations
├── processSQSEvent() - Future: handles SQS messages
├── generateList() - Core list generation logic
├── postList() - Tumblr posting logic
└── generateAndPostList() - Combined operation
```

## Error Handling

The handler includes comprehensive error handling:

- Retry logic for list generation (up to 5 attempts)
- Graceful degradation when posting is disabled
- Detailed error logging with request IDs
- Proper HTTP status codes in responses

## Future Enhancements

The handler includes SQS event processing for future service separation:

- Separate generation and posting services
- Queue-based processing for reliability
- Independent scaling of generation vs. posting

## CLI Compatibility

The Lambda handler maintains full compatibility with the original CLI functionality:

- Same configuration options
- Same generation algorithms
- Same output format
- Preserves all existing features
