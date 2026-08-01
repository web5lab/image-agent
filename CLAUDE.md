# CLAUDE.md - ImageMCP Server Skill Instructions

This repository contains the ImageMCP Server agent skill (`skills/imagemcp`).

## Guidelines
- All tools interact with ImageMCP Server via `./skills/imagemcp/scripts/imagemcp.js`.
- Always execute commands using `./skills/imagemcp/scripts/imagemcp.js <command> [flags]`.
- Output is formatted as structured JSON.
- Never guess credentials; prompt user to set `IMAGEMCP_API_KEY` or run setup if auth fails.
