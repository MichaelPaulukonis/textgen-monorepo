#!/bin/bash

# DEPRECATED: This script is maintained for backward compatibility
# 
# Recommended approach: Use Nx commands instead
#   Build Lambda package: nx run poeticalbot:build
#   Review changes:       nx run poeticalbot:deploy:plan
#   Deploy to AWS:        nx run poeticalbot:deploy
#
# Or use the monorepo-wide commands:
#   Deploy all apps:      npm run deploy:all
#   Deploy poeticalbot:   npm run deploy:poeticalbot

set -e

echo "⚠️  DEPRECATION NOTICE ⚠️"
echo "This script is deprecated. Please use Nx commands instead:"
echo ""
echo "  Build:  nx run poeticalbot:build"
echo "  Plan:   nx run poeticalbot:deploy:plan"
echo "  Deploy: nx run poeticalbot:deploy"
echo ""
echo "Continuing with legacy deployment in 3 seconds..."
sleep 3

# Build Lambda package
./build-lambda.sh

# Deploy with Terraform
echo ""
echo "Deploying with Terraform..."
cd terraform
terraform init -input=false
terraform plan -input=false
terraform apply -auto-approve

echo ""
echo "✓ Deployment complete!"
echo "Lambda function updated with src/ directory contents"
