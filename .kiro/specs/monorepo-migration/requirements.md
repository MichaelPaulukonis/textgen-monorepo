# Requirements Document

## Introduction

This document outlines the requirements for migrating three separate Node.js applications (PoeticalBot, common-corpus, and listmania) into a unified Nx-based monorepo structure, following the established pattern from genart-monorepo. PoeticalBot is a poetry generation bot already converted to AWS Lambda, common-corpus is a shared text corpus library with lambda-layer capabilities, and listmania is a list-generation bot currently on Heroku that needs lambda conversion. All applications share common-corpus as a dependency and use similar NLP/text generation patterns.

## Glossary

- **Monorepo**: A single repository containing multiple related applications and shared code
- **PoeticalBot**: A Tumblr poetry generation bot (NaPoGenMo2016) with existing AWS Lambda architecture and comprehensive documentation
- **Common-corpus**: A shared text corpus library with both standard and lambda-optimized versions, used by both other applications
- **Listmania**: A Tumblr list-generation bot currently deployed on Heroku, depends on common-corpus
- **Lambda Layer**: AWS Lambda deployment package containing shared code and dependencies (common-corpus has lambda-index.js for this)
- **Migration System**: The overall system responsible for consolidating the three applications
- **Nx Monorepo**: A monorepo structure using Nx build system for task orchestration and dependency management
- **Workspace Structure**: The organized directory layout following Nx conventions with apps/ and libs/ directories
- **NLP Applications**: Natural Language Processing applications that generate creative text content
- **Nx Executors**: Nx-based build targets for development, testing, and deployment tasks

## Requirements

### Requirement 1

**User Story:** As a developer, I want to consolidate three separate applications into an Nx-based monorepo, so that I can manage related codebases with unified task orchestration and dependency management following the established genart-monorepo pattern.

#### Acceptance Criteria

1. THE Migration System SHALL initialize an Nx workspace with nx.json configuration
2. THE Migration System SHALL create pnpm workspace configuration for package management
3. THE Migration System SHALL establish Nx executors for build, test, lint, and deploy targets
4. THE Migration System SHALL preserve all existing functionality from each source application
5. THE Migration System SHALL create unified scripts using Nx run-many commands for cross-application tasks

### Requirement 2

**User Story:** As a developer, I want to import PoeticalBot into the monorepo as 'poeticalbot', so that I can maintain its existing lambda functionality while integrating it with other applications.

#### Acceptance Criteria

1. THE Migration System SHALL copy all PoeticalBot source code to the 'apps/poeticalbot' directory
2. THE Migration System SHALL preserve the existing lambda/ directory with its AWS Lambda configuration
3. THE Migration System SHALL maintain all existing .kiro/ and .specstory/ configurations from PoeticalBot
4. THE Migration System SHALL preserve the comprehensive docs/ folder and README documentation
5. THE Migration System SHALL update the common-corpus dependency to reference the monorepo version

### Requirement 3

**User Story:** As a developer, I want to integrate common-corpus as a shared library in the monorepo, so that both PoeticalBot and listmania can efficiently use the text corpus functionality through Nx's dependency management.

#### Acceptance Criteria

1. THE Migration System SHALL place common-corpus in the 'libs/common-corpus' directory following Nx library conventions
2. THE Migration System SHALL create an Nx library configuration with appropriate project.json
3. THE Migration System SHALL preserve both the standard index.js and lambda-optimized lambda-index.js versions
4. THE Migration System SHALL maintain the existing lambda layer deployment capability with common-corpus-layer.zip
5. THE Migration System SHALL configure Nx dependency graph to properly track common-corpus usage

### Requirement 4

**User Story:** As a developer, I want to convert listmania from Heroku to AWS Lambda, so that I can standardize the deployment architecture across all applications.

#### Acceptance Criteria

1. THE Migration System SHALL copy listmania source code to the 'apps/listmania' directory
2. THE Migration System SHALL create a lambda handler wrapper around the existing CLI-based functionality
3. THE Migration System SHALL convert the Heroku-based scheduling to AWS EventBridge/CloudWatch Events
4. THE Migration System SHALL update the common-corpus dependency to reference the monorepo shared package
5. THE Migration System SHALL create lambda deployment configuration similar to PoeticalBot's structure

### Requirement 5

**User Story:** As a developer, I want to establish shared dependency management using Nx and pnpm workspaces, so that common libraries are efficiently managed across all applications following the genart-monorepo pattern.

#### Acceptance Criteria

1. THE Migration System SHALL create a root-level pnpm-workspace.yaml configuration with apps/* and libs/* patterns
2. THE Migration System SHALL identify and consolidate shared dependencies like compromise, commander, and tumblr.js at the workspace root
3. THE Migration System SHALL establish workspace-level package.json with common devDependencies including Nx tooling
4. THE Migration System SHALL configure Nx implicit dependencies for proper build ordering
5. THE Migration System SHALL maintain separate lambda deployment packages while sharing development dependencies

### Requirement 6

**User Story:** As a developer, I want consolidated documentation and tooling using Nx task orchestration, so that I can efficiently work across all applications in the monorepo.

#### Acceptance Criteria

1. THE Migration System SHALL create a root-level README with Nx monorepo structure and getting started instructions
2. THE Migration System SHALL preserve individual application documentation in their respective directories
3. THE Migration System SHALL create Nx executors for unified testing, linting, and deployment across all applications
4. THE Migration System SHALL establish consistent ESLint configuration integrated with Nx linting
5. THE Migration System SHALL consolidate .kiro/ configurations while preserving application-specific settings

### Requirement 7

**User Story:** As a developer, I want a clear Nx-based monorepo directory structure, so that I can easily navigate and understand the organization of applications and shared code following established conventions.

#### Acceptance Criteria

1. THE Migration System SHALL create an 'apps/' directory containing poeticalbot and listmania applications with Nx project.json configurations
2. THE Migration System SHALL create a 'libs/' directory containing the shared common-corpus library following Nx library conventions
3. THE Migration System SHALL maintain existing terraform/ directories within each application for deployment infrastructure
4. THE Migration System SHALL create a root-level docs/ directory for consolidated documentation following genart-monorepo pattern
5. THE Migration System SHALL establish Nx workspace configuration files (nx.json, pnpm-workspace.yaml) at the root level