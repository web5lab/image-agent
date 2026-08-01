---
name: imagemcp
description: >
  Generate and edit images, evaluate image output quality, perform automatic re-generation retries, manage AI models, manage API keys, configure model priorities, and view request telemetry logs via ImageMCP Server. ALWAYS use this skill when asked to generate images, edit existing images, refine visuals, list models, update image model priorities, manage keys, or fetch generation logs using ImageMCP Server in any IDE or terminal.
last-updated: 2026-08-01
allowed-tools: Bash(./scripts/imagemcp.js:*)
---

# ImageMCP Server Skill

Generate and edit images, manage AI image models, configure model priorities, manage API keys, and monitor request telemetry using [ImageMCP Server](https://api.imagemcpserver.com). Run everything through `./scripts/imagemcp.js` (Node.js 18+, zero dependencies). All commands output structured JSON.

> **Script paths** below are relative to this skill's directory. Resolve them based on where the skill is installed.
>
> **Authentication failures**: If the CLI returns **"Missing ImageMCP API key"** or **"API request failed"**, tell the user to set `IMAGEMCP_API_KEY` or run `./scripts/imagemcp.js setup`. See [`references/setup.md`](references/setup.md).

---

## Project Context & Architecture

**ImageMCP Server** is a unified multi-model AI image generation and editing platform designed specifically for AI agents, developers, and workflows.

### Core Capabilities
1. **Multi-Model AI Gateway**: Access 38+ top-tier image models from OpenRouter (including Google Gemini 2.5 Flash Image, Flux 1.1 Pro, Recraft v3, Ideogram v2, SDXL Turbo, and more).
2. **Text-to-Image Generation (`generate`)**: Synthesize high-resolution visual assets from natural language prompts, with aspect ratio control (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`) and visual style presets (`photorealistic`, `anime`, `vector`, `3d`).
3. **Image Editing & Refinement (`edit`)**: Modify, update, or transform existing images by supplying an input image file or URL (`--image`) alongside edit instructions.
4. **Model Management & Priority Routing (`models:list`, `models:priority`, `models:toggle`)**: Enable/disable specific models and set custom priority scores to control fallback ordering and model preferences.
5. **API Key Lifecycle (`keys:list`, `keys:create`, `keys:revoke`)**: Generate and manage secret bearer API keys (`sk-img-gen-...`) with permission scopes.
6. **Telemetry & Credit Tracking (`logs:list`, `logs:clear`, `user:info`)**: Track real-time request latency, cost per request, execution status codes, and subscription credit usage.

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
| "Generate image & save to file" | `./scripts/imagemcp.js generate --prompt "..." --out image.png` |
| "Edit existing image / Image-to-Image" | `./scripts/imagemcp.js edit --image ./input.png --prompt "..." --out edited.png` |
| "Show telemetry logs & latency" | `./scripts/imagemcp.js logs:list` |
| "Clear telemetry logs" | `./scripts/imagemcp.js logs:clear` |
| "Show gallery showcase" | `./scripts/imagemcp.js gallery:list` |

---

## Image Quality Evaluation & Automatic Retry Protocol

AI agents using this skill MUST evaluate the quality of generated or edited images before concluding a task.

### 1. Evaluation Criteria
When inspecting generated or edited image results:
- **Prompt Fidelity**: Did the model render all key elements requested in the prompt?
- **Visual Clarity & Quality**: Are there severe visual artifacts, unintended blurriness, anatomical distortion, or missing subjects?
- **Typography & Text Rendering**: If text/labels were requested, is the rendered text readable and accurately spelled?
- **Style Consistency**: Does the output match the specified visual style preset (`photorealistic`, `vector`, `anime`, etc.)?

### 2. Automatic Re-Generation / Retry Strategy
If the generated image is **unsatisfactory**, **low quality**, or **fails to match the prompt**, the AI agent should **automatically try generating again** (up to 2-3 retries) using the following progression:

1. **Refine Prompt Detail**:
   - Expand the prompt with explicit visual details, lighting, camera angle, subject description, and negative anti-artifact guidance.
   - Example: Instead of `"a red car"`, use `"a highly detailed sleek red sports car parked on a rainy city street at night with neon reflection, photorealistic 8k, sharp focus"`.

2. **Switch Target Model**:
   - If the default model (`google/gemini-2.5-flash-image`) produces unsatisfactory output, select a model tailored to the visual task:
     - **Photorealism & Realism**: `black-forest-labs/flux-1.1-pro` or `stabilityai/sdxl-turbo`
     - **Vector Art & Graphics**: `recraft-v3`
     - **Text & Typography in Images**: `ideogram-v2`
     - **Fast Iteration**: `google/gemini-2.5-flash-image`

3. **Adjust Parameters**:
   - Modify `--aspect-ratio` (`16:9`, `1:1`, `9:16`) to fit composition bounds better.
   - Specify `--style` explicitly (`photorealistic`, `anime`, `vector`, `3d`).

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
Generate high quality images from text prompts using OpenRouter models.

```bash
# Generate image with specific model and aspect ratio
./scripts/imagemcp.js generate --prompt "Cyberpunk neon city at night" --model "google/gemini-2.5-flash-image" --aspect-ratio "16:9"

# Generate image and save to local path
./scripts/imagemcp.js generate --prompt "Futuristic sports car" --out ./car.png

# Read prompt from file and generate
./scripts/imagemcp.js generate --file ./prompt.txt --out ./output.png
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

### 4. Image Editing & Refinement Endpoint

#### `edit` (alias: `image:edit`)
Edit, modify, or transform an existing generated image or input image by supplying an image path/URL and prompt instructions.

```bash
# Edit image background or style
./scripts/imagemcp.js edit --image ./photo.jpg --prompt "Change background to a snowy mountain resort" --out ./snowy_photo.png

# Transform image into watercolor sketch
./scripts/imagemcp.js edit --image ./car.png --prompt "Transform into watercolor sketch style" --style "vector" --out ./sketch.png

# Object addition or modification on generated image
./scripts/imagemcp.js edit --image ./room.png --prompt "Add a sleeping golden retriever on the rug" --out ./room_with_dog.png
```

**Supported Flags:**
- `--image <filepath_or_url>`: **(Required)** Input image file path or URL to edit.
- `--prompt "<text>"`: Description of edits, modifications, or target visual transformation.
- `--file <filepath>`: Read prompt text from a file.
- `--model <model_id>`: Target model ID (default: `google/gemini-2.5-flash-image`).
- `--aspect-ratio <ratio>`: Target output aspect ratio (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`).
- `--style <style_name>`: Visual style preset (`photorealistic`, `anime`, `vector`, `3d`, etc.).
- `--out <filepath>`: Save edited image output to a local file path.

---

### 5. Telemetry Logs & Gallery

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

### 6. Configuration Commands

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
3. **JSON Output**: All commands output valid JSON to stdout for easy parsing in scripts or AI agent pipelines.
4. **Auto-Retry Loop**: When image quality is unsatisfactory, perform up to 2-3 retries automatically by refining the prompt or switching models before asking for user intervention.
