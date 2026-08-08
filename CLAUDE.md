# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Nx/pnpm monorepo for experimental generative-text projects. Two Tumblr-posting bots (`poeticalbot`, `listmania`) share a text corpus library (`common-corpus`). Node >=22, package manager is pnpm (not npm/yarn — `pnpm-lock.yaml` is authoritative).

```
apps/
  poeticalbot/   # Algorithmic poetry generator, deployed to AWS Lambda (Terraform)
  listmania/     # Generative list maker, deployed to AWS Lambda (Terraform)
libs/
  common-corpus/ # Shared corpus of public-domain texts + text utils; also ships as a Lambda layer
```

## Commands

Run everything through `nx`, not the underlying tool directly (per `.github`/nx guidance already loaded into context).

```bash
# Install
pnpm install

# Test (per-project; standard+mocha+chai+nyc, no jest)
nx test poeticalbot
nx test listmania
nx test common-corpus
nx run-many --target=test --all

# Single test file (mocha, files are named *.tests.js, not *.test.js)
cd apps/poeticalbot && npx mocha test/poetifier.tests.js
cd apps/poeticalbot && npx mocha --timeout 50000 test/util.tests.js

# poeticalbot also splits unit vs integration
nx run poeticalbot:test:unit          # excludes tests matching /integration/i
nx run poeticalbot:test:integration

# Lint (StandardJS, not ESLint)
nx lint poeticalbot
nx lint listmania
nx run-many --target=lint --all

# Run the bots locally (CLI, no posting by default patterns vary — check flags)
nx cli:sample poeticalbot     # queneau-buckets method, --no-post
nx cli:help poeticalbot
nx start listmania -- -m weird

# Build Lambda deployment zip (runs apps/<app>/build-lambda.sh)
nx build poeticalbot
nx build listmania

# Deploy (build -> terraform init/plan/apply in apps/<app>/terraform)
nx run poeticalbot:deploy:plan   # review only
nx run poeticalbot:deploy
nx run listmania:deploy
```

All three projects have `project.json` (`apps/poeticalbot`, `apps/listmania`, `libs/common-corpus`). `poeticalbot`/`listmania` define build/test/lint/deploy/deploy:plan/cli targets that shell out via `nx:run-commands`. `common-corpus`'s `project.json` only adds `build` (no-op placeholder), `test`, `build-layer`, `lint` (via `@nx/eslint:lint`, despite the rest of the repo using StandardJS) — its other `package.json` scripts (`cover`, `build:layer:prepare`, `build:layer:zip`) are still separately inferred as Nx targets.

## Architecture

### Dual-runtime apps (CLI + Lambda)

Both `poeticalbot` and `listmania` run as either a local CLI process or an AWS Lambda function from the *same* `src/`/`lambda/` codebase, not separate builds — `build-lambda.sh` copies source into a temp dir, writes a Lambda-specific `package.json` (drops workspace deps, pins versions), installs production deps, and zips it into `terraform/<app>-lambda.zip`, which Terraform then deploys.

`poeticalbot` in particular is mid-migration to a single `src/` source of truth (see `apps/poeticalbot/.kiro/specs/codebase-consolidation/design.md`). **`apps/poeticalbot/lambda/` currently contains a stale duplicate of `src/lib/`** — the build script packages from `src/`, so `lambda/` is legacy and edits there won't reach production. When fixing a bug, edit `src/`, and check whether `lambda/` needs the same fix mirrored (or is dead weight) rather than assuming it's live.

### common-corpus as a shared lib + Lambda layer

`libs/common-corpus` is consumed two ways:
- As a pnpm workspace dependency (`"common-corpus": "workspace:*"`) for local/CLI use in both apps.
- As a prebuilt AWS Lambda layer (`npm run build:layer` in that package) for the Lambda deployments, via `lambda-index.js` as the layer-optimized entry point and `src/lib/layer-require.js` in each app for environment-aware module loading (Lambda layer path vs local `node_modules`).

Corpus text lives under `libs/common-corpus/corpus/` (~75MB), organized by category/genre, selected at runtime via regex filtering (`--corporaFilter`).

### Generation pipeline (poeticalbot)

`Poetifier` (`src/lib/poetifier.js`) orchestrates: corpus selection -> one of several generation strategies -> text transformation -> title generation -> Tumblr NPF (Neue Post Format) formatting -> posting. Generation strategies are pluggable: JGnoetry (template/grammar-based), Queneau Buckets (combinatorial rearrangement, `bucketRunner.js`), Sentence Drone (repetitive-structure, `sentence.drone.js`). Transformations (misspelling, sorting, spacing, rhyming) apply as a configurable chain in `filter/`. Full design notes: `apps/poeticalbot/docs/architecture.md`.

### Deployment infrastructure

Each app owns its own `terraform/` directory (independent AWS Lambda + supporting resources per app, not a shared stack). Deployment is standardized through Nx (`build` -> `deploy`) — see `docs/DEPLOYMENT.md` and `docs/deployment-standardization-summary.md` for the rationale; legacy per-app `deploy.sh` scripts still exist but are deprecated in favor of `nx run <app>:deploy`.

### Task Master

`.taskmaster/` holds this repo's task-tracking system (tasks.json, PRDs); `AGENTS.md` documents the full `task-master` CLI/MCP workflow already available in context. Don't hand-edit `.taskmaster/tasks/tasks.json` — use `task-master` commands.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
