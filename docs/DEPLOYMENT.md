# NLP Monorepo Deployment Guide

## Overview

This monorepo contains multiple NLP applications deployed as AWS Lambda functions. This guide provides an overview of the deployment architecture and processes for all applications.

## Applications

| Application | Description | Deployment Target |
|-------------|-------------|-------------------|
| **poeticalbot** | Poetry generation bot | AWS Lambda |
| **listmania** | List generation bot | AWS Lambda |
| **common-corpus** | Shared text corpus library | Lambda Layer |

## Quick Start

### Deploy All Applications

```bash
# From monorepo root
npm run deploy:all
```

### Deploy Individual Applications

```bash
# Deploy poeticalbot
npm run deploy:poeticalbot

# Deploy listmania
npm run deploy:listmania
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     NLP Monorepo                            │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ poeticalbot  │  │  listmania   │  │common-corpus │    │
│  │              │  │              │  │              │    │
│  │  src/        │  │  lambda/     │  │  corpus/     │    │
│  │              │  │  lib/        │  │  index.js    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │             │
│         │                 │                 │             │
└─────────┼─────────────────┼─────────────────┼─────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
    ┌─────────┐       ┌─────────┐       ┌─────────┐
    │  Build  │       │  Build  │       │  Build  │
    │ Lambda  │       │ Lambda  │       │  Layer  │
    │ Package │       │ Package │       │ Package │
    └────┬────┘       └────┬────┘       └────┬────┘
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐       ┌─────────┐       ┌─────────┐
    │Terraform│       │Terraform│       │Terraform│
    │ Deploy  │       │ Deploy  │       │ Deploy  │
    └────┬────┘       └────┬────┘       └────┬────┘
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐       ┌─────────┐       ┌─────────┐
    │   AWS   │       │   AWS   │       │   AWS   │
    │ Lambda  │       │ Lambda  │       │ Lambda  │
    │         │       │    +    │       │  Layer  │
    │         │       │EventBrdg│       │         │
    └─────────┘       └─────────┘       └─────────┘
```

## Deployment Workflow

### Standard Deployment Process

Each application follows this workflow:

1. **Build**: Create Lambda deployment package
2. **Plan**: Review Terraform changes
3. **Deploy**: Apply infrastructure changes

### Using Nx Commands

```bash
# Build Lambda package
nx run <app>:build

# Review Terraform plan
nx run <app>:deploy:plan

# Deploy to AWS
nx run <app>:deploy
```

### Using npm Scripts

```bash
# Deploy specific app
npm run deploy:poeticalbot
npm run deploy:listmania

# Deploy all apps
npm run deploy:all
```

## Prerequisites

### Required Tools

- **Node.js**: 18.x or higher
- **Package Manager**: npm or pnpm
- **Terraform**: >= 1.0
- **AWS CLI**: Configured with credentials
- **Nx**: Installed via monorepo dependencies

### AWS Configuration

Configure AWS credentials:

```bash
# Using AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

### Environment Variables

Each application requires a `.env` file with Tumblr API credentials:

```bash
# apps/poeticalbot/.env
TUMBLR_CONSUMER_KEY=your_key
TUMBLR_CONSUMER_SECRET=your_secret
TUMBLR_TOKEN=your_token
TUMBLR_TOKEN_SECRET=your_token_secret

# apps/listmania/.env
TUMBLR_CONSUMER_KEY=your_key
TUMBLR_CONSUMER_SECRET=your_secret
TUMBLR_TOKEN=your_token
TUMBLR_TOKEN_SECRET=your_token_secret
```

## Nx Integration

### Project Configuration

Each application has a `project.json` file defining Nx targets:

```json
{
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "outputs": ["{projectRoot}/terraform/*.zip"],
      "options": {
        "command": "./build-lambda.sh"
      }
    },
    "deploy": {
      "executor": "nx:run-commands",
      "dependsOn": ["build"],
      "options": {
        "commands": [
          "cd terraform && terraform init",
          "cd terraform && terraform plan",
          "cd terraform && terraform apply -auto-approve"
        ]
      }
    }
  }
}
```

### Target Dependencies

The `deploy` target automatically depends on `build`, ensuring:
1. Lambda package is built before deployment
2. Nx caching optimizes repeated builds
3. Proper task ordering across applications

### Caching

Nx caches build outputs for faster subsequent builds:

```bash
# Clear Nx cache if needed
nx reset
```

## Application-Specific Guides

For detailed deployment instructions for each application:

- [PoeticalBot Deployment Guide](../apps/poeticalbot/DEPLOYMENT.md)
- [Listmania Deployment Guide](../apps/listmania/DEPLOYMENT.md)

## Common Deployment Scenarios

### Scenario 1: Deploy After Code Changes

```bash
# 1. Make code changes
# 2. Run tests
nx run-many --target=test --all

# 3. Build and deploy
npm run deploy:all
```

### Scenario 2: Deploy Single Application

```bash
# Build and review changes
nx run poeticalbot:build
nx run poeticalbot:deploy:plan

# Deploy if plan looks good
nx run poeticalbot:deploy
```

### Scenario 3: Rollback Deployment

```bash
# 1. Checkout previous version
git checkout <previous-commit>

# 2. Rebuild and redeploy
nx run <app>:build
nx run <app>:deploy
```

### Scenario 4: Update Environment Variables

```bash
# 1. Update .env file in app directory
# 2. Update Terraform configuration if needed
# 3. Redeploy
nx run <app>:deploy
```

## Troubleshooting

### Common Issues

#### Build Failures

**Problem**: Permission denied on build script
```bash
chmod +x apps/*/build-lambda.sh
```

**Problem**: npm install fails
```bash
# Clear npm cache
npm cache clean --force

# Or use pnpm
pnpm install
```

#### Deployment Failures

**Problem**: AWS authentication fails
```bash
# Verify credentials
aws sts get-caller-identity

# Reconfigure
aws configure
```

**Problem**: Terraform state lock
```bash
cd apps/<app>/terraform
terraform force-unlock <LOCK_ID>
```

#### Runtime Issues

**Problem**: Lambda function errors
```bash
# View logs
aws logs tail /aws/lambda/<function-name> --follow
```

### Getting Help

1. Check application-specific deployment guide
2. Review CloudWatch logs
3. Verify Terraform plan output
4. Check AWS Console for resource status

## Best Practices

### Development

- ✅ Run tests before deploying
- ✅ Review Terraform plan before applying
- ✅ Use Nx commands for consistency
- ✅ Keep environment variables in `.env` files
- ✅ Commit Terraform state to remote backend

### Deployment

- ✅ Deploy to staging environment first
- ✅ Monitor CloudWatch logs after deployment
- ✅ Set up CloudWatch alarms for errors
- ✅ Document any manual configuration steps
- ✅ Tag releases in git

### Security

- ✅ Never commit API keys or secrets
- ✅ Use IAM roles with least privilege
- ✅ Enable CloudWatch logging
- ✅ Encrypt Terraform state
- ✅ Rotate credentials regularly

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Applications

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: nx run-many --target=test --all
      
      - name: Deploy applications
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: npm run deploy:all
```

## Monitoring

### CloudWatch Dashboards

Create dashboards to monitor:
- Lambda invocation counts
- Error rates
- Function durations
- Cost metrics

### Alarms

Set up alarms for:
- High error rates (> 5%)
- Long execution times (> 30s)
- Throttling events
- Unexpected invocation patterns

## Cost Management

### Lambda Costs

- Free tier: 1M requests/month
- Pricing: $0.20 per 1M requests
- Duration: $0.0000166667 per GB-second

### Optimization Tips

- Monitor invocation frequency
- Optimize function memory allocation
- Reduce function duration
- Use Lambda Layers for shared dependencies
- Set up cost alerts

## Additional Resources

- [Nx Documentation](https://nx.dev)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS EventBridge Documentation](https://docs.aws.amazon.com/eventbridge/)

## Support

For deployment issues:

1. Check this guide and application-specific guides
2. Review CloudWatch logs
3. Verify AWS credentials and permissions
4. Check Terraform state and plan output
5. Consult AWS documentation

## Changelog

### 2024-11-17
- Standardized deployment process across applications
- Integrated Nx build system
- Created comprehensive deployment documentation
- Removed redundant build scripts
- Added deployment diagrams and troubleshooting guides
