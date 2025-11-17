# Listmania Lambda Deployment

This directory contains Terraform configuration for deploying Listmania as an AWS Lambda function with EventBridge scheduling.

## Prerequisites

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **Terraform**: Install Terraform (version 1.0+)
3. **AWS CLI**: Configure AWS credentials (`aws configure`)
4. **Common Corpus Layer**: The common-corpus Lambda layer must be deployed first
5. **Lambda Package**: Build the Lambda deployment package

## Configuration

1. Copy the example variables file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your actual values:
   - AWS region
   - Tumblr API credentials
   - Posting configuration
   - Schedule expression
   - Log retention settings

## Building the Lambda Package

Before deploying, you need to create the Lambda deployment package:

```bash
# From the apps/listmania directory
cd apps/listmania

# Install dependencies
npm install --production

# Create deployment package
zip -r terraform/listmania-lambda.zip \
  lambda/ \
  lib/ \
  config.js \
  node_modules/ \
  package.json \
  -x "*.git*" "*.DS_Store" "test/*"
```

## Deployment

1. Initialize Terraform:
   ```bash
   cd terraform
   terraform init
   ```

2. Review the planned changes:
   ```bash
   terraform plan
   ```

3. Apply the configuration:
   ```bash
   terraform apply
   ```

4. Confirm the deployment when prompted

## Schedule Configuration

The Lambda function is triggered by EventBridge (CloudWatch Events) on a schedule. You can configure the schedule using the `schedule_expression` variable:

### Rate Expressions
- `rate(1 hour)` - Every hour
- `rate(6 hours)` - Every 6 hours (default)
- `rate(1 day)` - Once per day

### Cron Expressions
- `cron(0 12 * * ? *)` - Daily at noon UTC
- `cron(0 */6 * * ? *)` - Every 6 hours
- `cron(0 9 ? * MON-FRI *)` - Weekdays at 9 AM UTC

Note: All times are in UTC.

## Environment Variables

The Lambda function uses the following environment variables (configured in Terraform):

- `CONSUMER_KEY`: Tumblr consumer key
- `CONSUMER_SECRET`: Tumblr consumer secret
- `TOKEN`: Tumblr access TOKEN
- `TOKEN_SECRET`: Tumblr TOKEN secret
- `POST_LIVE`: Whether to post live to Tumblr (true/false)
- `CORPORA_FILTER`: Optional corpus filter
- `MATCH_PATTERN`: Optional pattern matching configuration
- `METHOD`: List generation method (default: clue_combo)

## Testing

### Test the Lambda Function Directly

```bash
# Invoke the Lambda function manually
aws lambda invoke \
  --function-name listmania \
  --payload '{"action":"generate-only"}' \
  response.json

# View the response
cat response.json
```

### Test with EventBridge

The function will be automatically triggered according to the schedule. You can also trigger it manually:

```bash
aws events put-events \
  --entries '[{"Source":"manual.test","DetailType":"Manual Test","Detail":"{}"}]'
```

### View Logs

```bash
# View recent logs
aws logs tail /aws/lambda/listmania --follow

# View logs for a specific time range
aws logs filter-log-events \
  --log-group-name /aws/lambda/listmania \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

## Monitoring

CloudWatch metrics are automatically collected for:
- Invocation count
- Error count
- Duration
- Throttles

Access these in the AWS Console under CloudWatch > Metrics > Lambda.

## Updating

To update the Lambda function after code changes:

1. Rebuild the deployment package (see "Building the Lambda Package")
2. Run `terraform apply` to update the function

## Cleanup

To remove all resources:

```bash
terraform destroy
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure your AWS credentials have Lambda and EventBridge permissions
2. **Layer Not Found**: Deploy the common-corpus layer first
3. **Timeout Errors**: Increase the `timeout` value in `main.tf`
4. **Memory Errors**: Increase the `memory_size` value in `main.tf`

### Debugging

Enable detailed logging by checking CloudWatch Logs:
```bash
aws logs tail /aws/lambda/listmania --follow
```

## Architecture

```
EventBridge Rule (Schedule)
    ↓
Lambda Function (listmania)
    ↓
Common Corpus Layer
    ↓
Tumblr API
```

## Cost Estimation

Approximate monthly costs (as of 2024):
- Lambda: ~$0.20 per million requests + compute time
- EventBridge: First 1M events free
- CloudWatch Logs: ~$0.50 per GB ingested

For a 6-hour schedule (120 invocations/month), expect < $1/month.

## Security Notes

- All Tumblr credentials are marked as sensitive in Terraform
- Use AWS Secrets Manager for production deployments
- Never commit `terraform.tfvars` to version control
- The `.gitignore` should exclude `*.tfvars` and `*.tfstate*`
