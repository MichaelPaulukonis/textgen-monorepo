#!/bin/bash

# Build Lambda deployment package for PoeticalBot
# This script creates a zip file containing all necessary code and dependencies
# Usage: ./build-lambda.sh

set -e

echo "Building PoeticalBot Lambda deployment package..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Clean up any existing package
rm -f terraform/poeticalbot-lambda.zip

# Create temporary build directory
BUILD_DIR="build-lambda"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

# Copy src files to build directory
echo "Copying source files..."
cp -r src/* $BUILD_DIR/

# Create Lambda-specific package.json (without workspace dependencies)
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

# Get file size
SIZE=$(du -h terraform/poeticalbot-lambda.zip | cut -f1)
echo "✓ Lambda package created: terraform/poeticalbot-lambda.zip ($SIZE)"
echo "✓ Build complete!"
echo ""
echo "Next steps:"
echo "  - Review terraform plan: nx run poeticalbot:deploy:plan"
echo "  - Deploy to AWS: nx run poeticalbot:deploy"
