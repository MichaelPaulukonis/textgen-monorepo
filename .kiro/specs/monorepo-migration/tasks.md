# Implementation Plan

- [x] 1. Initialize Nx workspace and root configuration

  - Create nx.json with workspace configuration and plugins
  - Set up pnpm-workspace.yaml for package management
  - Create root package.json with shared dependencies and Nx scripts
  - Initialize .gitignore with Nx and Node.js patterns
  - _Requirements: 1.1, 1.3, 5.1, 5.3, 7.5_

- [ ] 2. Set up monorepo directory structure

  - Create apps/ directory for applications
  - Create libs/ directory for shared libraries
  - Create docs/ directory for consolidated documentation
  - Create tools/ directory for build and deployment scripts
  - _Requirements: 7.1, 7.2, 7.4, 7.5_

- [ ] 3. Migrate common-corpus as shared library

  - Copy common-corpus source code to libs/common-corpus/
  - Create libs/common-corpus/project.json with Nx library configuration
  - Update libs/common-corpus/package.json for workspace compatibility
  - Preserve both index.js and lambda-index.js functionality
  - Maintain existing corpus/ directory and lambda layer build capability
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.4_

- [ ] 3.1 Write unit tests for common-corpus library integration

  - Test workspace dependency resolution
  - Verify lambda-index.js functionality in monorepo context
  - _Requirements: 3.1, 3.2_

- [ ] 4. Migrate PoeticalBot application

  - Copy PoeticalBot source code to apps/poeticalbot/
  - Create apps/poeticalbot/project.json with Nx application configuration
  - Update package.json to reference workspace common-corpus dependency
  - Preserve existing lambda/ directory and terraform/ configuration
  - Maintain existing .kiro/ and .specstory/ configurations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 4.1 Write integration tests for PoeticalBot workspace integration

  - Test common-corpus dependency resolution
  - Verify Lambda deployment configuration
  - _Requirements: 2.2, 2.4_

- [ ] 5. Create Lambda handler wrapper for listmania

  - Analyze existing listmania CLI interface and functionality
  - Create lambda/index.js handler wrapper around existing CLI functionality
  - Implement event-to-CLI argument conversion logic
  - Add error handling and Lambda response formatting
  - _Requirements: 4.2, 4.5_

- [ ] 6. Migrate listmania application with Lambda conversion

  - Copy listmania source code to apps/listmania/
  - Create apps/listmania/project.json with Nx application configuration
  - Update package.json to reference workspace common-corpus dependency
  - Integrate the Lambda handler wrapper created in task 5
  - _Requirements: 4.1, 4.4, 4.5_

- [ ] 7. Create terraform configuration for listmania Lambda deployment

  - Create apps/listmania/terraform/ directory
  - Write terraform configuration for AWS Lambda function
  - Configure EventBridge/CloudWatch Events for scheduling (replacing Heroku scheduler)
  - Set up environment variables and IAM roles for Lambda execution
  - _Requirements: 4.3, 4.5_

- [ ] 7.1 Write deployment validation tests for listmania Lambda

  - Test terraform configuration syntax
  - Verify Lambda handler functionality
  - _Requirements: 4.2, 4.3_

- [ ] 8. Configure Nx task orchestration and shared tooling

  - Set up Nx executors for build, test, lint, and deploy targets across all applications
  - Create unified npm scripts using nx run-many commands
  - Configure shared ESLint configuration integrated with Nx
  - Set up Nx dependency graph and implicit dependencies
  - _Requirements: 1.3, 1.5, 5.4, 6.3, 6.4_

- [ ] 9. Consolidate documentation and create monorepo README

  - Create root-level README.md with monorepo structure and getting started instructions
  - Copy and organize existing documentation from all applications into docs/
  - Preserve individual application documentation in their respective directories
  - Create development workflow documentation for Nx-based development
  - _Requirements: 6.1, 6.2, 7.4_

- [ ] 9.1 Write documentation validation scripts

  - Verify all documentation links are functional
  - Check that code examples in documentation are syntactically correct
  - _Requirements: 6.1, 6.2_

- [ ] 10. Optimize shared dependencies and workspace configuration

  - Identify and consolidate shared dependencies like compromise, commander, tumblr.js
  - Move common devDependencies to root package.json
  - Configure Nx caching for optimal build performance
  - Set up proper dependency hoisting with pnpm workspace configuration
  - _Requirements: 5.2, 5.3, 5.5_

- [ ] 11. Create deployment and development scripts

  - Create tools/deploy-all.js script for deploying all applications
  - Create tools/test-all.js script for comprehensive testing
  - Set up development environment setup script
  - Create Lambda layer build script for common-corpus
  - _Requirements: 1.5, 6.3, 3.4_

- [ ] 11.1 Write validation tests for deployment scripts

  - Test deployment script error handling
  - Verify development environment setup
  - _Requirements: 1.5, 6.3_

- [ ] 12. Consolidate and migrate Kiro configurations

  - Merge .kiro/ configurations from all applications
  - Preserve application-specific Kiro settings in respective directories
  - Create root-level .kiro/ configuration for monorepo-wide settings
  - Update steering files and hooks for monorepo development workflow
  - _Requirements: 6.5, 2.3_

- [ ] 13. Final integration testing and validation
  - Verify all applications build and run correctly in monorepo context
  - Test Lambda deployments for both PoeticalBot and listmania
  - Validate common-corpus integration across all consuming applications
  - Run comprehensive test suite across all applications using Nx
  - Verify documentation accuracy and completeness
  - _Requirements: 1.2, 1.4, 3.5, 4.4, 5.4_
