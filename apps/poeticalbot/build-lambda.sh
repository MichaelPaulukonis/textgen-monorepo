#!/bin/bash
# Build PoeticalBot Lambda deployment package: terraform/poeticalbot-lambda.zip
# Shared logic lives in scripts/build-lambda.sh (textgen-monorepo-s86).
exec "$(dirname "$0")/../../scripts/build-lambda.sh" poeticalbot index.js
