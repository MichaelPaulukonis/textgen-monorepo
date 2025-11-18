---
description: Project-specific configuration and paths for the TextGen Monorepo
alwaysApply: true
---

# Project Configuration

## Project Root Path

The correct project root path for this TextGen Monorepo is:
```
/Users/michaelpaulukonis/projects/textgen-monorepo
```

## Usage Guidelines

- **Always use this exact path** when calling Taskmaster MCP tools that require `projectRoot` parameter
- **Never invent or guess usernames** - use the actual path above
- This path should be used for all MCP tool calls including:
  - `mcp_taskmaster_ai_get_tasks`
  - `mcp_taskmaster_ai_update_subtask`
  - `mcp_taskmaster_ai_set_task_status`
  - All other Taskmaster MCP operations

## Project Structure Context

This is an Nx monorepo containing multiple node/typescript creative coding text generation apps:
- Located at the path above
- Contains apps in `apps/` directory
- Shared libraries in `libs/` directory