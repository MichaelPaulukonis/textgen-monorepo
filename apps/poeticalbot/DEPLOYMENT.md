# PoeticalBot Deployment Guide

## Overview

PoeticalBot is deployed as an AWS Lambda function with infrastructure managed by Terraform. This guide covers the complete deployment process using the Nx monorepo tooling.

## Architecture

```
┌─────────────────┐
│   Source Code   │
│   (src/)        │
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
│  Function       │
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
# Deploy poeticalbot only
npm run deploy:poeticalbot

# Or deploy all applications
npm run deploy:all
```

### Step-by-Step Deployment

#### 1. Build Lambda Package

Build the Lambda deployment package:

```bash
# Using Nx (recommended)
nx run poeticalbot:build

# Or directly
cd apps/poeticalbot
./build-lambda.sh
```

This creates `terraform/poeticalbot-lambda.zip` containing:
- All source code from `src/`
- Production dependencies
- Lambda-specific package.json

#### 2. Review Terraform Plan

Before deploying, review what changes will be made:

```bash
nx run poeticalbot:deploy:plan
```

This will:
- Initialize Terraform
- Show planned infrastructure changes
- Highlight any resource modifications

#### 3. Deploy to AWS

Deploy the Lambda function:

```bash
nx run poeticalbot:deploy
```

This will:
- Build the Lambda package (if not already built)
- Initialize Terraform
- Apply infrastructure changes
- Upload the new Lambda function code

## Deployment Scripts Reference

### Nx Targets

| Target | Command | Description |
|--------|---------|-------------|
| `build` | `nx run poeticalbot:build` | Build Lambda deployment package |
| `deploy:plan` | `nx run poeticalbot:deploy:plan` | Review Terraform changes without applying |
| `deploy` | `nx run poeticalbot:deploy` | Deploy to AWS (includes build) |
| `test` | `nx run poeticalbot:test` | Run all tests |
| `lint` | `nx run poeticalbot:lint` | Run linter |

### Shell Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `build-lambda.sh` | Build Lambda package | ✅ Active |
| `deploy.sh` | Legacy full deployment | ⚠️ Deprecated |

**Note**: `deploy.sh` is maintained for backward compatibility but using Nx commands is recommended.

## Deployment Workflow

### Development Workflow

1. Make code changes in `src/`
2. Run tests: `nx run poeticalbot:test`
3. Build package: `nx run poeticalbot:build`
4. Review plan: `nx run poeticalbot:deploy:plan`
5. Deploy: `nx run poeticalbot:deploy`

### CI/CD Integration

For automated deployments:

```bash
# In your CI/CD pipeline
npm install
nx run poeticalbot:test
nx run poeticalbot:deploy
```

## Terraform Configuration

### Files

- `terraform/main.tf` - Main infrastructure definition
- `terraform/variables.tf` - Variable definitions
- `terraform/poeticalbot-lambda.zip` - Deployment package (generated)

### Key Resources

- AWS Lambda Function
- IAM Role and Policies
- CloudWatch Log Group
- EventBridge Schedule (if applicable)

## Troubleshooting

### Build Issues

**Problem**: `build-lambda.sh` fails with permission denied
```bash
chmod +x apps/poeticalbot/build-lambda.sh
```

**Problem**: npm install fails during build
- Check Node.js version (must be 18.x)
- Clear npm cache: `npm cache clean --force`
- Delete `build-lambda` directory and retry

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
cd apps/poeticalbot/terraform
terraform force-unlock <LOCK_ID>
```

### Runtime Issues

**Problem**: Lambda function errors
```bash
# View CloudWatch logs
aws logs tail /aws/lambda/poeticalbot-function --follow

# Or use AWS Console
# CloudWatch > Log groups > /aws/lambda/poeticalbot-function
```

**Problem**: Environment variables not set
- Verify `.env` file exists
- Check Terraform configuration includes environment variables
- Redeploy after updating environment variables

## Rollback Procedure

If a deployment causes issues:

1. **Identify the previous working version**:
   ```bash
   cd apps/poeticalbot/terraform
   terraform state list
   ```

2. **Revert to previous Lambda code**:
   - Restore previous `.zip` file from backup
   - Or rebuild from previous git commit

3. **Redeploy**:
   ```bash
   nx run poeticalbot:deploy
   ```

## Monitoring

### CloudWatch Logs

View logs in AWS Console:
- Navigate to CloudWatch > Log groups
- Find `/aws/lambda/poeticalbot-function`
- View recent invocations and errors

### Metrics

Key metrics to monitor:
- Invocation count
- Error rate
- Duration
- Throttles

## Security Considerations

- API keys stored in environment variables (not in code)
- IAM role follows least-privilege principle
- Lambda function has minimal required permissions
- Terraform state may contain sensitive data (use remote state with encryption)

## Cost Optimization

- Lambda free tier: 1M requests/month
- Monitor invocation frequency
- Optimize function duration to reduce costs
- Use CloudWatch alarms for unexpected usage

## Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Nx Documentation](https://nx.dev)
- [PoeticalBot README](./README.md)

## Support

For issues or questions:
1. Check this deployment guide
2. Review application README
3. Check CloudWatch logs
4. Review Terraform plan output
5. Consult AWS Lambda documentation
