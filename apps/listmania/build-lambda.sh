#!/bin/bash
# Build listmania Lambda deployment package: terraform/listmania-lambda.zip
# Shared logic lives in scripts/build-lambda.sh (textgen-monorepo-s86).
exec "$(dirname "$0")/../../scripts/build-lambda.sh" listmania lambda-handler.js
