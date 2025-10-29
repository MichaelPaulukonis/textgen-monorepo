#!/bin/bash

set -e

echo "Building Lambda Function from src/ directory..."

# Create temporary build directory
BUILD_DIR="build-lambda"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

# Copy src files to build directory
echo "Copying source files..."
cp -r src/* $BUILD_DIR/

# Create package.json for Lambda deployment
echo "Creating Lambda package.json..."
cat > $BUILD_DIR/package.json << 'EOF'
{
  "name": "poeticalbot-lambda",
  "version": "1.0.0",
  "description": "PoeticalBot Lambda Function",
  "main": "index.js",
  "dependencies": {
    "commander": "^6.2.1",
    "compromise": "^11.13.2",
    "dotenv": "^7.0.0",
    "fuzzy-matching": "0.4.3",
    "in-a-nutshell": "0.1.2",
    "natural": "^0.6.3",
    "node-mispelr": "0.0.1",
    "pos": "^0.4.2",
    "ramda": "^0.27.1",
    "random-seed": "0.3.0",
    "rhymes": "^1.0.2",
    "simple-timer": "0.0.5",
    "tagspewer": "0.3.1",
    "tumblr.js": "^3.0.0"
  },
  "engines": {
    "node": "18.x"
  }
}
EOF

# Install production dependencies
echo "Installing production dependencies..."
cd $BUILD_DIR
npm install --production --silent

# Create deployment package
echo "Creating deployment package..."
zip -r ../terraform/poeticalbot-lambda.zip . -x "node_modules/.cache/*" "*.test.js" "test/*" > /dev/null

# Clean up build directory
cd ..
rm -rf $BUILD_DIR

echo "Lambda package created: terraform/poeticalbot-lambda.zip"

# Deploy with Terraform
echo "Deploying with Terraform..."
cd terraform
terraform init -input=false
terraform plan -input=false
terraform apply -auto-approve

echo "Deployment complete!"
echo "Lambda function updated with src/ directory contents"