# Listmania Deployment Guide

## Overview

Listmania is deployed as an AWS Lambda function with infrastructure managed by Terraform. This application was migrated from Heroku to Lambda as part of the monorepo consolidation. This guide covers the complete deployment process using the Nx monorepo tooling.

## Architecture

```
┌─────────────────┐
│   Source Code   │
│ lambda/, lib/   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build Process  │
│  build-lambda.sh│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lambda Package │
│  .zip file      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Terraform     │
│   Deploy        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AWS Lambda     │
│  + EventBridge  │
└─────────────────┘
```

## Prerequisites

### Required Tools
- Node.js 18.x or higher
- npm or pnpm
- Terraform >= 1.0
- AWS CLI configured with appropriate credentials
- Nx CLI (installed via monorepo)

### AWS Credentials
Ensure your AWS credentials are configured:
```bash
aws configure
```

Or set environment variables:
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

### Environment Variables
Create a `.env` file in the app directory with required Tumblr API credentials:
```bash
TUMBLR_CONSUMER_KEY=your_consumer_key
TUMBLR_CONSUMER_SECRET=your_consumer_secret
TUMBLR_TOKEN=your_token
TUMBLR_TOKEN_SECRET=your_token_secret
```

## Deployment Process

### Quick Deployment (Recommended)

From the monorepo root:

```bash
# Deploy listmania only
npm run deploy:listmania

# Or deploy all applications
npm run deploy:all
```

### Step-by-Step Deployment

#### 1. Build Lambda Package

Build the Lambda deployment package:

```bash
# Using Nx (recommended)
nx run listmania:build

# Or directly
cd apps/listmania
./build-lambda.sh
```

This creates `terraform/listmania-lambda.zip` containing:
- Lambda handler code from `lambda/`
- Core library code from `lib/`
- Configuration from `config.js`
- Production dependencies

#### 2. Review Terraform Plan

Before deploying, review what changes will be made:

```bash
nx run listmania:deploy:plan
```

This will:
- Initialize Terraform
- Show planned infrastructure changes
- Highlight any resource modifications

#### 3. Deploy to AWS

Deploy the Lambda function:

```bash
nx run listmania:deploy
```

This will:
- Build the Lambda package (if not already built)
- Initialize Terraform
- Apply infrastructure changes
- Upload the new Lambda function code
- Configure EventBridge schedule

## Deployment Scripts Reference

### Nx Targets

| Target | Command | Description |
|--------|---------|-------------|
| `build` | `nx run listmania:build` | Build Lambda deployment package |
| `deploy:plan` | `nx run listmania:deploy:plan` | Review Terraform changes without applying |
| `deploy` | `nx run listmania:deploy` | Deploy to AWS (includes build) |
| `test` | `nx run listmania:test` | Run all tests |
| `lint` | `nx run listmania:lint` | Run linter |
| `lambda:test` | `nx run listmania:lambda:test` | Test Lambda handler locally |

### Shell Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `build-lambda.sh` | Build Lambda package | ✅ Active |
| `deploy.sh` | Legacy full deployment | ⚠️ Deprecated |
| `terraform/build-lambda-package.sh` | Duplicate build script | ❌ Removed |

**Note**: `deploy.sh` is maintained for backward compatibility but using Nx commands is recommended. The redundant `terraform/build-lambda-package.sh` has been removed.

## Migration from Heroku

Listmania was originally deployed on Heroku with scheduled tasks. The Lambda deployment includes:

### Key Differences

| Aspect | Heroku | Lambda |
|--------|--------|--------|
| Scheduling | Heroku Scheduler | EventBridge/CloudWatch Events |
| Environment | Dyno | Lambda Function |
| Scaling | Dyno count | Automatic |
| Logs | Heroku logs | CloudWatch Logs |
| Cost | Monthly dyno cost | Pay per invocation |

### EventBridge Schedule

The Terraform configuration includes an EventBridge rule that triggers the Lambda function on a schedule (replacing Heroku Scheduler). Configure the schedule in `terraform/main.tf`.

## Deployment Workflow

### Development Workflow

1. Make code changes in `lambda/` or `lib/`
2. Run tests: `nx run listmania:test`
3. Test Lambda handler: `nx run listmania:lambda:test`
4. Build package: `nx run listmania:build`
5. Review plan: `nx run listmania:deploy:plan`
6. Deploy: `nx run listmania:deploy`

### CI/CD Integration

For automated deployments:

```bash
# In your CI/CD pipeline
npm install
nx run listmania:test
nx run listmania:deploy
```

## Terraform Configuration

### Files

- `terraform/main.tf` - Main infrastructure definition
- `terraform/variables.tf` - Variable definitions
- `terraform/outputs.tf` - Output values
- `terraform/terraform.tfvars` - Variable values (gitignored)
- `terraform/terraform.tfvars.example` - Example variable values
- `terraform/listmania-lambda.zip` - Deployment package (generated)

### Key Resources

- AWS Lambda Function
- IAM Role and Policies
- CloudWatch Log Group
- EventBridge Rule (schedule)
- EventBridge Target (Lambda)

### Configuration Variables

Copy `terraform.tfvars.example` to `terraform.tfvars` and configure:

```hcl
aws_region = "us-east-1"
lambda_function_name = "listmania"
schedule_expression = "rate(1 hour)"  # Adjust as needed
```

## Troubleshooting

### Build Issues

**Problem**: `build-lambda.sh` fails with permission denied
```bash
chmod +x apps/listmania/build-lambda.sh
```

**Problem**: npm install fails during build
- Check Node.js version (must be 18.x)
- Clear npm cache: `npm cache clean --force`
- Delete `build-lambda` directory and retry

**Problem**: Missing files in package
- Verify `lambda/`, `lib/`, and `config.js` exist
- Check `build-lambda.sh` copy commands
- Review `.gitignore` to ensure files aren't excluded

### Deployment Issues

**Problem**: Terraform authentication fails
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Reconfigure if needed
aws configure
```

**Problem**: Lambda package too large
- Review dependencies in `build-lambda.sh`
- Consider using Lambda Layers for large dependencies
- Check for unnecessary files in the package

**Problem**: Terraform state lock
```bash
# If deployment was interrupted
cd apps/listmania/terraform
terraform force-unlock <LOCK_ID>
```

**Problem**: EventBridge rule not triggering
- Verify schedule expression in `terraform/main.tf`
- Check EventBridge rule is enabled
- Review CloudWatch Events in AWS Console

### Runtime Issues

**Problem**: Lambda function errors
```bash
# View CloudWatch logs
aws logs tail /aws/lambda/listmania-function --follow

# Or use AWS Console
# CloudWatch > Log groups > /aws/lambda/listmania-function
```

**Problem**: Environment variables not set
- Verify `.env` file exists
- Check Terraform configuration includes environment variables
- Redeploy after updating environment variables

**Problem**: Handler not found
- Verify `lambda/index.js` exports `handler` function
- Check `main` field in Lambda package.json
- Review Lambda configuration in Terraform

## Testing

### Local Testing

Test the Lambda handler locally:

```bash
nx run listmania:lambda:test
```

This runs `lambda/test-handler.js` which simulates Lambda invocation.

### Integration Testing

Test the full deployment:

1. Deploy to AWS
2. Manually invoke Lambda:
   ```bash
   aws lambda invoke \
     --function-name listmania \
     --payload '{}' \
     response.json
   ```
3. Check response and CloudWatch logs

## Rollback Procedure

If a deployment causes issues:

1. **Identify the previous working version**:
   ```bash
   cd apps/listmania/terraform
   terraform state list
   ```

2. **Revert to previous Lambda code**:
   - Restore previous `.zip` file from backup
   - Or rebuild from previous git commit

3. **Redeploy**:
   ```bash
   nx run listmania:deploy
   ```

## Monitoring

### CloudWatch Logs

View logs in AWS Console:
- Navigate to CloudWatch > Log groups
- Find `/aws/lambda/listmania-function`
- View recent invocations and errors

### Metrics

Key metrics to monitor:
- Invocation count
- Error rate
- Duration
- Throttles
- EventBridge rule triggers

### Alarms

Consider setting up CloudWatch alarms for:
- High error rate
- Function duration exceeding threshold
- Failed EventBridge triggers

## Scheduling

### Adjusting Schedule

To change the invocation schedule:

1. Edit `terraform/terraform.tfvars`:
   ```hcl
   schedule_expression = "rate(2 hours)"  # or "cron(0 12 * * ? *)"
   ```

2. Redeploy:
   ```bash
   nx run listmania:deploy
   ```

### Schedule Expression Formats

- Rate: `rate(1 hour)`, `rate(30 minutes)`
- Cron: `cron(0 12 * * ? *)` (daily at noon UTC)

See [AWS Schedule Expressions](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html) for more formats.

## Security Considerations

- API keys stored in environment variables (not in code)
- IAM role follows least-privilege principle
- Lambda function has minimal required permissions
- Terraform state may contain sensitive data (use remote state with encryption)
- EventBridge rule permissions scoped to specific Lambda function

## Cost Optimization

- Lambda free tier: 1M requests/month
- Monitor invocation frequency via schedule
- Optimize function duration to reduce costs
- Use CloudWatch alarms for unexpected usage
- Consider adjusting schedule based on actual needs

## Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS EventBridge Documentation](https://docs.aws.amazon.com/eventbridge/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Nx Documentation](https://nx.dev)
- [Listmania README](./README.md)

## Support

For issues or questions:
1. Check this deployment guide
2. Review application README
3. Check CloudWatch logs
4. Review Terraform plan output
5. Test Lambda handler locally
6. Consult AWS Lambda documentation
