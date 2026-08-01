# ImageMCP Server Setup & Configuration Guide

This guide explains how to authenticate and configure the ImageMCP skill in any IDE, agent framework, or terminal environment.

---

## 1. Authentication & Environment Variables

The ImageMCP CLI (`./scripts/imagemcp.js`) requires an API key to communicate with your ImageMCP Server backend.

### Supported Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `IMAGEMCP_API_KEY` | **Required.** Your ImageMCP secret API key (`sk-img-gen-...`). | None |
| `IMAGEMCP_KEY` | Alternative key variable name. | None |
| `IMAGEMCP_API_URL` | Base URL of your ImageMCP backend server. | `https://api.imagemcpserver.com` |

### Setting Environment Variables in Shell

```bash
export IMAGEMCP_API_KEY="sk-img-gen-your_secret_api_key_here"
export IMAGEMCP_API_URL="https://api.imagemcpserver.com"
```

---

## 2. Interactive Setup & Local Config

If you do not want to set environment variables every session, run the built-in setup wizard to save configuration locally or globally:

```bash
./scripts/imagemcp.js setup
```

This saves your API key and URL to `~/.config/imagemcp/config.json`.

### Manual CLI Config Commands

```bash
# View configuration status
./scripts/imagemcp.js config:show

# Set API Key
./scripts/imagemcp.js config:set-key "sk-img-gen-your_secret_api_key_here"

# Set API Backend URL
./scripts/imagemcp.js config:set-url "https://api.imagemcpserver.com"
```

---

## 3. IDE Integration

### Claude Desktop / Cursor / Antigravity / Windsurf
Ensure the environment variable `IMAGEMCP_API_KEY` is present in your IDE's environment settings or terminal shell environment when executing the skill.

