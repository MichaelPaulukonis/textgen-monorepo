# Requirements Document

## Introduction

PoeticalBot currently has duplicated code between the root directory and the `lambda/` directory. The codebase should be consolidated into a `src/` directory as the single source of truth while maintaining the ability to run both locally (CLI) and in AWS Lambda environments. Lambda-specific deployment configurations can remain in a separate `lambda/` folder or be moved to root. This consolidation will eliminate confusion from the deploy script overwriting changes and create a cleaner, more maintainable codebase.

## Requirements

### Requirement 1: Single Source of Truth

**User Story:** As a developer, I want all PoeticalBot code to live in the `src/` directory so that I have one canonical location for all functionality.

#### Acceptance Criteria

1. WHEN I make changes to core poetry generation logic THEN those changes should persist and not be overwritten by deploy scripts
2. WHEN I look for PoeticalBot functionality THEN I should find it in the `src/` directory structure
3. WHEN I deploy to AWS THEN the deployment should use the src directory as the source
4. WHEN deployment configurations are needed THEN they should be in the root directory or deployment-specific folders

### Requirement 2: Dual Runtime Support

**User Story:** As a developer, I want to run PoeticalBot both locally via CLI and in AWS Lambda so that I can test and develop efficiently.

#### Acceptance Criteria

1. WHEN I run PoeticalBot locally THEN it should work without AWS Lambda environment variables
2. WHEN PoeticalBot runs in AWS Lambda THEN it should use the layer-require system for dependencies
3. WHEN running locally THEN the common-corpus dependency should load from local node_modules
4. WHEN running in Lambda THEN the common-corpus dependency should load from the Lambda layer
5. IF the environment detection fails THEN the system should gracefully fallback with clear error messages

### Requirement 3: Clean Directory Structure

**User Story:** As a developer, I want a clear, logical directory structure so that I can easily navigate and maintain the codebase.

#### Acceptance Criteria

1. WHEN I examine the project structure THEN the src directory should contain all active code
2. WHEN I look at the root directory THEN it should contain project metadata, deployment scripts, and tests
3. WHEN I need to find core libraries THEN they should be in `src/lib/`
4. WHEN I need NPF formatting THEN it should be in `src/lib/npf-formatter.js`
5. WHEN I need to run tests THEN they should be in the root `test/` directory
6. IF there are duplicate files THEN they should be removed or clearly marked as deprecated

### Requirement 4: Deployment Script Consolidation

**User Story:** As a developer, I want the deployment process to work from the consolidated codebase so that deployments are predictable and don't overwrite my changes.

#### Acceptance Criteria

1. WHEN I run the deploy script THEN it should deploy from the src directory without copying files
2. WHEN deployment completes THEN my local changes should remain intact
3. WHEN I make changes to src code THEN those changes should be included in the next deployment
4. IF the deployment fails THEN I should get clear error messages about what went wrong

### Requirement 5: Local CLI Interface

**User Story:** As a developer, I want to run PoeticalBot from the command line locally so that I can test poem generation without deploying to AWS.

#### Acceptance Criteria

1. WHEN I run a local CLI command THEN it should generate and display a poem
2. WHEN running locally THEN it should support the same configuration options as the Lambda version
3. WHEN I specify CLI arguments THEN they should override default configuration
4. WHEN running locally THEN it should NOT attempt to post to Tumblr unless explicitly requested
5. IF dependencies are missing locally THEN I should get clear instructions on how to install them

### Requirement 6: Environment Configuration Management

**User Story:** As a developer, I want consistent configuration management across local and Lambda environments so that behavior is predictable.

#### Acceptance Criteria

1. WHEN running locally THEN configuration should load from `.env` files
2. WHEN running in Lambda THEN configuration should load from environment variables
3. WHEN configuration is missing THEN the system should provide helpful error messages
4. WHEN I need to test different configurations THEN I should be able to override settings easily
5. IF sensitive configuration is detected THEN it should never be logged or exposed

### Requirement 7: Testing Infrastructure Consolidation

**User Story:** As a developer, I want consolidated testing that works for both local and Lambda environments so that I can verify functionality comprehensively.

#### Acceptance Criteria

1. WHEN I run tests THEN they should work for both local and Lambda execution paths
2. WHEN testing NPF formatting THEN tests should validate both structure and content
3. WHEN testing Tumblr integration THEN tests should work without requiring live API calls
4. WHEN I run the full test suite THEN it should complete without requiring AWS credentials
5. IF tests fail THEN I should get clear information about what functionality is broken

### Requirement 8: Documentation and Migration Guide

**User Story:** As a developer, I want clear documentation about the new structure so that I can effectively work with the consolidated codebase.

#### Acceptance Criteria

1. WHEN I need to understand the new structure THEN documentation should explain the consolidation
2. WHEN I want to run locally THEN documentation should provide clear setup instructions
3. WHEN I need to deploy THEN documentation should explain the updated deployment process
4. WHEN migrating from old structure THEN documentation should explain what changed
5. IF I encounter issues THEN documentation should provide troubleshooting guidance

### Requirement 9: Backward Compatibility During Transition

**User Story:** As a developer, I want to maintain existing functionality during the consolidation so that nothing breaks during the transition.

#### Acceptance Criteria

1. WHEN the consolidation is in progress THEN existing Lambda deployments should continue working
2. WHEN I need to rollback THEN the previous deployment should still be available
3. WHEN testing the new structure THEN all existing functionality should work identically
4. WHEN NPF posting is enabled THEN it should work exactly as before
5. IF something breaks during consolidation THEN I should be able to quickly revert to working state

### Requirement 10: Future Enhancement Readiness

**User Story:** As a developer, I want the consolidated structure to support future enhancements so that the codebase can evolve cleanly.

#### Acceptance Criteria

1. WHEN adding new poetry generation methods THEN the structure should accommodate them easily
2. WHEN adding new output formats THEN the NPF formatter pattern should be extensible
3. WHEN adding new deployment targets THEN the environment detection should be expandable
4. WHEN integrating new APIs THEN the configuration system should support additional credentials
5. IF new dependencies are needed THEN the layer-require system should handle them gracefully
