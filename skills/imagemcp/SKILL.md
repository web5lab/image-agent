---
name: imagemcp
description: >
  Generate images, manage AI models, manage API keys, configure model priorities, and view request telemetry logs via ImageMCP Server. ALWAYS use this skill when asked to generate images, list models, update image model priorities, manage keys, or fetch generation logs using ImageMCP Server in any IDE or terminal.
last-updated: 2026-08-01
allowed-tools: Bash(./scripts/imagemcp.js:*)
---

# ImageMCP Server Skill

Generate images, manage AI image models, configure model priorities, manage API keys, and monitor request telemetry using [ImageMCP Server](https://api.imagemcpserver.com). Run everything through `./scripts/imagemcp.js` (Node.js 18+, zero dependencies). All commands output structured JSON.

> **Script paths** below are relative to this skill's directory. Resolve them based on where the skill is installed.
>
> **Authentication failures**: If the CLI returns **"Missing ImageMCP API key"** or **"API request failed"**, tell the user to set `IMAGEMCP_API_KEY` or run `./scripts/imagemcp.js setup`. See [`references/setup.md`](references/setup.md).

---

## Quick Reference Guides

| Guide | Use when you need to... |
|-------|-------------------------|
| [`references/setup.md`](references/setup.md) | Configure the API key, API URL, fix authentication errors, or set up environment variables |

---

## Available Commands & Actions

Only tools provided by ImageMCP Server are available. All commands return JSON for clean parsing.

| User Intent | Command |
|-------------|---------|
| "Check user plan / credits / info" | `./scripts/imagemcp.js user:info` |
| "List active API keys" | `./scripts/imagemcp.js keys:list` |
| "Generate new API key" | `./scripts/imagemcp.js keys:create --name "Key Name"` |
| "Revoke an API key" | `./scripts/imagemcp.js keys:revoke <key_id>` |
| "List available image models" | `./scripts/imagemcp.js models:list` |
| "Toggle model status (enable/disable)" | `./scripts/imagemcp.js models:toggle <model_id>` |
| "Update model priority score" | `./scripts/imagemcp.js models:priority <model_id> <score>` |
| "Generate image from prompt" | `./scripts/imagemcp.js generate --prompt "..." --model "google/gemini-2.5-flash-image" --aspect-ratio "16:9"` |
| "Generate image & download to file" | `./scripts/imagemcp.js generate --prompt "..." --out image.png` |
| "Image to image synthesis" | `./scripts/imagemcp.js generate --prompt "..." --image ./input.png --out output.png` |
| "Show telemetry logs & latency" | `./scripts/imagemcp.js logs:list` |
| "Clear telemetry logs" | `./scripts/imagemcp.js logs:clear` |
| "Show gallery showcase" | `./scripts/imagemcp.js gallery:list` |

---

## Detailed Command Documentation

### 1. User & API Key Info

#### `user:info` (alias: `me:get`)
Retrieve profile details for the authenticated ImageMCP user including subscription plan and credit balance.

```bash
./scripts/imagemcp.js user:info
```

#### `keys:list`
List all API keys generated for the user.

```bash
./scripts/imagemcp.js keys:list
```

#### `keys:create`
Create a new API key.

```bash
./scripts/imagemcp.js keys:create --name "Production Key"
```

#### `keys:revoke <key_id>`
Revoke and delete an API key.

```bash
./scripts/imagemcp.js keys:revoke 64b8f...
```

---

### 2. Image Models Management

#### `models:list`
List all 38+ supported image generation models from OpenRouter with priority scores, providers, cost, and supported aspect ratios.

```bash
./scripts/imagemcp.js models:list
```

#### `models:toggle <model_id>`
Enable or disable a model for your account.

```bash
./scripts/imagemcp.js models:toggle "black-forest-labs/flux-1.1-pro"
```

#### `models:priority <model_id> <score>`
Set user-defined priority score for model ordering.

```bash
./scripts/imagemcp.js models:priority "google/gemini-2.5-flash-image" 100
```

---

### 3. Image Generation

#### `generate` (alias: `image:generate`)
Generate high quality images using OpenRouter models.

```bash
# Generate image with specific model and aspect ratio
./scripts/imagemcp.js generate --prompt "Cyberpunk cyberpunk neon city" --model "google/gemini-2.5-flash-image" --aspect-ratio "16:9"

# Generate image and save to local path
./scripts/imagemcp.js generate --prompt "Futuristic sports car" --out ./car.png

# Read prompt from file and generate
./scripts/imagemcp.js generate --file ./prompt.txt --out ./output.png

# Image to Image generation
./scripts/imagemcp.js generate --prompt "Transform into watercolor sketch" --image ./photo.jpg --out ./sketch.png
```

**Supported Flags:**
- `--prompt "<text>"`: Text prompt for image generation.
- `--file <filepath>`: Read prompt text from a file.
- `--model <model_id>`: Target model ID (default: `google/gemini-2.5-flash-image`).
- `--aspect-ratio <ratio>`: Aspect ratio (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`).
- `--style <style_name>`: Desired visual style (`photorealistic`, `anime`, `vector`, `3d`, etc.).
- `--image <filepath_or_url>`: Input image for image-to-image synthesis.
- `--out <filepath>`: Download and save the generated output image to a local file.

---

### 4. Telemetry Logs & Gallery

#### `logs:list`
Retrieve telemetry execution logs including prompt, cost, latency, and status.

```bash
./scripts/imagemcp.js logs:list
```

#### `logs:clear`
Clear all telemetry logs.

```bash
./scripts/imagemcp.js logs:clear
```

#### `gallery:list`
Retrieve showcase gallery items.

```bash
./scripts/imagemcp.js gallery:list
```

---

### 5. Configuration Commands

| Command | Description |
|---------|-------------|
| `./scripts/imagemcp.js setup` | Interactive prompt to save API key and URL |
| `./scripts/imagemcp.js config:show` | Display current API key status and URL |
| `./scripts/imagemcp.js config:set-key <key>` | Set API Key in configuration file |
| `./scripts/imagemcp.js config:set-url <url>` | Set API URL in configuration file |

---

## Error Handling & Best Practices

1. **API Key Setup**: Ensure `IMAGEMCP_API_KEY` is exported or configured via `./scripts/imagemcp.js setup`.
2. **API Backend**: Defaults to `https://api.imagemcpserver.com`.
3. **JSON Output**: All commands output valid JSON to stdout for easy processing in scripts or AI tools.
