#!/bin/bash

# Build Lambda deployment package for listmania
# This script creates a zip file containing all necessary code and dependencies

set -e

echo "Building listmania Lambda deployment package..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_DIR"

# Clean up any existing package
rm -f terraform/listmania-lambda.zip

# Create temporary build directory
BUILD_DIR="build-lambda"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

# Copy necessary files to build directory
echo "Copying source files..."
cp -r lambda $BUILD_DIR/
cp -r lib $BUILD_DIR/
cp config.js $BUILD_DIR/

# Create Lambda-specific package.json (without workspace dependencies)
echo "Creating Lambda package.json..."
cat > $BUILD_DIR/package.json << 'EOF'
{
  "name": "listmania-lambda",
  "version": "0.1.0",
  "description": "Listmania Lambda Function",
  "main": "lambda/index.js",
  "dependencies": {
    "commander": "^7.0.0",
    "compromise": "^13.8.0",
    "corpora-project": "^0.2.0",
    "dotenv": "^8.2.0",
    "fuzzy-matching": "0.4.3",
    "random-seed": "0.3.0",
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
zip -r ../terraform/listmania-lambda.zip . -x "node_modules/.cache/*" "*.test.js" "test/*" > /dev/null

# Clean up build directory
cd ..
rm -rf $BUILD_DIR

# Get file size
SIZE=$(du -h terraform/listmania-lambda.zip | cut -f1)
echo "✓ Lambda package created: terraform/listmania-lambda.zip ($SIZE)"
echo "✓ Build complete!"
