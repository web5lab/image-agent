# ImageMCP Server AI Agent Skill

Agent Skill repository for **ImageMCP Server** — empowering AI coding assistants, IDE agents (Cursor, Claude Desktop, Antigravity, Windsurf), and terminal CLIs to generate images, list models, manage API keys, toggle models, update model priorities, and view telemetry logs.

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
export IMAGEMCP_API_URL="http://localhost:5023"  # Or your deployed server URL
```

Or run interactive setup:

```bash
./skills/imagemcp/scripts/imagemcp.js setup
```

### 2. Available Commands

```bash
# Check user profile info (plan, credits, account details)
./skills/imagemcp/scripts/imagemcp.js user:info

# List active API keys
./skills/imagemcp/scripts/imagemcp.js keys:list

# Create new API key
./skills/imagemcp/scripts/imagemcp.js keys:create --name "My CLI Key"

# Revoke API key by ID
./skills/imagemcp/scripts/imagemcp.js keys:revoke <key_id>

# List all available image generation models (38+ OpenRouter models)
./skills/imagemcp/scripts/imagemcp.js models:list

# Enable or disable a model for your account
./skills/imagemcp/scripts/imagemcp.js models:toggle <model_id>

# Set model priority score
./skills/imagemcp/scripts/imagemcp.js models:priority <model_id> <score>

# Generate image from prompt
./skills/imagemcp/scripts/imagemcp.js generate --prompt "Cyberpunk metropolis at night, neon lights" --model "google/gemini-2.5-flash-image" --aspect-ratio "16:9"

# Generate image and save to local file
./skills/imagemcp/scripts/imagemcp.js generate --prompt "Golden hour landscape" --out output.png

# Image-to-image synthesis
./skills/imagemcp/scripts/imagemcp.js generate --prompt "Make it anime style" --image ./input.png --out anime.png

# List telemetry request logs
./skills/imagemcp/scripts/imagemcp.js logs:list

# Clear request logs
./skills/imagemcp/scripts/imagemcp.js logs:clear

# View gallery showcase items
./skills/imagemcp/scripts/imagemcp.js gallery:list
```

---

## Available Tools

This skill exclusively implements tools available in the ImageMCP Server backend:
1. `user:info` (`get_user_info`)
2. `keys:list` (`get_api_keys`)
3. `keys:create` (`create_api_key`)
4. `keys:revoke` (`revoke_api_key`)
5. `models:list` (`get_available_models`)
6. `models:toggle` (`toggle_model_status`)
7. `models:priority` (`update_model_priority`)
8. `generate` (`generate_playground_image`)
9. `logs:list` (`get_telemetry_logs`)
10. `logs:clear` (`clear_telemetry_logs`)
11. `gallery:list` (`get_gallery_items`)

All commands output structured JSON for direct consumption by LLM agents.
