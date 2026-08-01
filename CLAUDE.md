# CLAUDE.md - ImageMCP Server Skill Instructions

This repository contains the ImageMCP Server agent skill (`skills/imagemcp`).

## Guidelines
- All tools interact with ImageMCP Server via `./skills/imagemcp/scripts/imagemcp.js`.
- Always execute commands using `./skills/imagemcp/scripts/imagemcp.js <command> [flags]`.
- Output is formatted as structured JSON.
- Supported operations: `generate`, `edit`, `models:list`, `models:toggle`, `models:priority`, `user:info`, `keys:list`, `keys:create`, `keys:revoke`, `logs:list`, `logs:clear`, `gallery:list`.
- **Quality Re-Generation**: Inspect output quality. If unsatisfied with visual results, perform up to 2-3 retries automatically with prompt adjustments or model switches.
- Never guess credentials; prompt user to set `IMAGEMCP_API_KEY` or run setup if auth fails.
