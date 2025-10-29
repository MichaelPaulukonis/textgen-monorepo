# Implementation Plan

- [x] 1. Create src directory structure and move core files

  - Create src/ directory with proper subdirectories
  - Move lambda/index.js to src/index.js as main entry point
  - Move lambda/config.js to src/config.js
  - Move lambda/lib/ directory to src/lib/ maintaining all existing files
  - Move lambda/filter/ directory to src/filter/
  - _Requirements: 1.1, 1.2, 3.3_

- [x] 2. Implement environment-aware configuration system

  - Update src/config.js to detect Lambda vs CLI environments
  - Add support for .env file loading in CLI mode
  - Add support for environment variables in Lambda mode
  - Implement configuration validation and error handling
  - Add default configuration values for missing settings
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Create dual runtime entry point system

  - Update src/index.js to detect execution environment
  - Add Lambda handler export for AWS Lambda runtime
  - Add CLI execution path for local development
  - Implement proper error handling for both environments
  - _Requirements: 2.1, 2.2, 5.1_

- [x] 4. Implement CLI interface for local development

  - Create src/cli.js with command-line argument parsing
  - Add poem generation functionality for local testing
  - Implement optional Tumblr posting from CLI
  - Add console output formatting for generated poems
  - Support configuration overrides via CLI arguments
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Create Lambda handler wrapper for AWS deployment

  - Create src/lambda-handler.js for Lambda-specific logic
  - Implement event type detection (scheduled, SQS, direct)
  - Add CloudWatch logging integration
  - Handle Lambda-specific error responses
  - Prepare for future service separation architecture
  - _Requirements: 2.3, 2.4_

- [x] 6. Update layer-require system for new structure

  - Move lambda/lib/layer-require.js to src/lib/layer-require.js
  - Update environment detection for src/ directory structure
  - Test common-corpus loading in both environments
  - Add dependency validation and clear error messages
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 7. Create unified Tumblr client abstraction

  - Create src/lib/tumblr-client.js wrapping tumblr.js library
  - Implement NPF posting functionality
  - Add credential validation methods
  - Add connection testing capabilities
  - Remove HTML fallback logic (NPF only)
  - _Requirements: 2.1, 2.3_

- [x] 8. Update deployment script for src directory

  - Modify deploy.sh to build from src/ instead of copying files
  - Remove file copying logic that overwrites changes
  - Update zip creation to package src/ directory contents
  - Test deployment process with new structure
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Consolidate and update testing infrastructure

  - Update test imports to reference src/ directory instead of lib/ and config.js
  - Move lambda/test/ files to root test/ directory (merge with existing tests)
  - Create integration tests for both CLI and Lambda execution paths
  - Add NPF formatting validation tests
  - Create mock Tumblr client for testing without API calls
  - Update test scripts in package.json to work with new structure
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 10. Update package.json and dependency management

  - Add CLI-specific scripts for local development (cli:run, cli:test)
  - Remove lambda/package.json (no longer needed)
  - Update main entry point to src/index.js
  - Update test scripts to work with consolidated structure
  - _Requirements: 3.1, 3.2_

- [ ] 11. Clean up duplicate and legacy files

  - Remove root index.js (legacy Heroku entry point)
  - Remove root config.js (consolidated into src/)
  - Remove Procfile (Heroku no longer needed)
  - Remove duplicate lib/ and filter/ directories from root
  - Remove entire lambda/ directory after confirming all functionality moved
  - Update .gitignore for new structure
  - _Requirements: 3.5, 9.3_

- [ ] 12. Create comprehensive documentation

  - Update README.md with new directory structure
  - Document CLI usage and local development setup
  - Document deployment process changes
  - Create troubleshooting guide for common issues
  - Document migration from old structure
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 13. Validate dual runtime functionality

  - Test poem generation in CLI mode with various options
  - Test poem generation and posting in Lambda mode
  - Verify environment detection works correctly in both contexts
  - Test configuration loading from .env (CLI) and environment variables (Lambda)
  - Validate NPF posting functionality end-to-end
  - _Requirements: 2.1, 2.2, 2.3, 5.1, 9.3_

- [ ] 14. Perform end-to-end testing and validation
  - Run complete test suite in both environments
  - Deploy to AWS and verify Lambda functionality
  - Test CLI interface with various configuration options
  - Validate that no functionality is lost during consolidation
  - Test rollback capability if issues arise
  - _Requirements: 7.4, 9.1, 9.2, 9.4, 9.5_
