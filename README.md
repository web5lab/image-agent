# ImageMCP Server AI Agent Skill

Agent Skill repository for **ImageMCP Server** — empowering AI coding assistants, IDE agents (Cursor, Claude Desktop, Antigravity, Windsurf), and terminal CLIs to check user info/credits, list models, generate images, and edit existing images.

---

## Skill Directory Structure

```
agent-skill-imagemcp/
├── AGENTS.md
├── CLAUDE.md
├── LICENSE
├── README.md
├── package.json
└── skills/
    └── imagemcp/
        ├── SKILL.md
        ├── references/
        │   └── setup.md
        └── scripts/
            └── imagemcp.js
```

---

## Quick Start

### 1. Set API Key

```bash
export IMAGEMCP_API_KEY="sk-img-gen-your_secret_api_key_here"
export IMAGEMCP_API_URL="https://api.imagemcpserver.com"  # Production API URL
```

Or run interactive setup:

```bash
./skills/imagemcp/scripts/imagemcp.js setup
```

### 2. Available Commands

```bash
# Check user profile info (plan, credits, account details)
./skills/imagemcp/scripts/imagemcp.js user:info

# List all available image generation models
./skills/imagemcp/scripts/imagemcp.js models:list

# Generate image from prompt
./skills/imagemcp/scripts/imagemcp.js generate --prompt "Cyberpunk metropolis at night, neon lights" --model "google/gemini-2.5-flash-image" --aspect-ratio "16:9"

# Generate image and save to local file
./skills/imagemcp/scripts/imagemcp.js generate --prompt "Golden hour landscape" --out output.png

# Edit or refine existing image
./skills/imagemcp/scripts/imagemcp.js edit --image ./input.png --prompt "Change background to starry night sky" --out edited.png
```

---

## Available Tools

This skill exclusively implements tools available in the ImageMCP Server backend:
1. `user:info` (`get_user_info`)
2. `models:list` (`list_models`)
3. `generate` (`generate_image`)
4. `edit` (`edit_image`)

All commands output structured JSON for direct consumption by LLM agents.
