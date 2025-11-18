#!/bin/bash

# DEPRECATED: This script is maintained for backward compatibility
# 
# Recommended approach: Use Nx commands instead
#   Build Lambda package: nx run listmania:build
#   Review changes:       nx run listmania:deploy:plan
#   Deploy to AWS:        nx run listmania:deploy
#
# Or use the monorepo-wide commands:
#   Deploy all apps:      npm run deploy:all
#   Deploy listmania:     npm run deploy:listmania

set -e

echo "⚠️  DEPRECATION NOTICE ⚠️"
echo "This script is deprecated. Please use Nx commands instead:"
echo ""
echo "  Build:  nx run listmania:build"
echo "  Plan:   nx run listmania:deploy:plan"
echo "  Deploy: nx run listmania:deploy"
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
echo "Lambda function updated successfully"
