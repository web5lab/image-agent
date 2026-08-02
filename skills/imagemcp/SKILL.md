---
name: imagemcp
description: >
  Get user info/credits, list available image models, generate images, synthesize SVG vectors, remove backgrounds, upscale images, compress images, edit images, and convert format via ImageMCP Server. ALWAYS check user info/credits first.
last-updated: 2026-08-02
allowed-tools: Bash(./scripts/imagemcp.js:*)
---

# ImageMCP Server Skill

Fetch user info/credits, list models, generate images, synthesize vector SVGs, remove backgrounds, upscale images, compress image payload sizes, edit images, and convert formats using [ImageMCP Server](https://api.imagemcpserver.com). Run everything through `./scripts/imagemcp.js` (Node.js 18+, zero dependencies). All commands output structured JSON.

> **Authentication Flow & Setup**:
> 1. `npx skills add web5lab/imagemcpserver` (Installs skill without prompting for tokens).
> 2. On first use, if unauthenticated, the CLI outputs: `"ImageMCPServer isn't connected yet. Run npx imagemcp login to connect your account."`
> 3. User runs `npx imagemcp login` to authenticate in the browser, select or generate an API key, and save an encrypted token to `~/.imagemcp/config.json`.
> 4. Skill automatically resolves and uses the stored token.

---

## Project Context & Architecture

**ImageMCP Server** is a unified multi-model AI image generation, vector synthesis, processing, and editing platform designed specifically for AI agents, developers, and workflows.

### Core Capabilities
1. **User Profile & Credit Inspection (`user:info`)**: Always check user profile details, plan, and credit balance first before initiating generation or edit tasks.
2. **Model Listing (`models:list`)**: Access and inspect available OpenRouter and Fal.ai image models (including Google Gemini 2.5 Flash Image, Fal Recraft Vector, Fal Feynobg, Fal Crisp Upscaler, Flux 1.1 Pro, Recraft v3, Ideogram v2, SDXL Turbo, and more).
3. **Text-to-Image Generation (`generate`)**: Synthesize high-resolution visual assets from natural language prompts with aspect ratio control (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`) and visual style presets.
4. **Text to Vector SVG (`text_to_svg`)**: Generate clean, resolution-independent SVG vector graphics code using `fal-ai/recraft/v4.1/text-to-vector`.
5. **Background Removal (`remove_bg`)**: Isolate subjects with transparent alpha PNG cutouts using `fal-ai/feynobg`.
6. **Image Upscaling (`upscale`)**: Super-resolution 4K detail enhancement using `fal-ai/recraft/upscale/crisp`.
7. **Image Compression (`compress`)**: Compress image byte payload size with quality control sliders (10%-95%) and format optimization.
8. **Image Editing & Refinement (`edit`)**: Modify, update, or transform existing images by supplying an input image file or URL (`--image`) alongside edit instructions.
9. **Format Conversion (`convert`)**: Convert image files across `PNG`, `JPG`, `WEBP`, `SVG`, `GIF`, and `BMP` formats.

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
| "List available image models" | `./scripts/imagemcp.js models:list` |
| "Generate image from prompt" | `./scripts/imagemcp.js generate --prompt "..." --model "google/gemini-2.5-flash-image" --aspect-ratio "16:9"` |
| "Generate vector SVG graphic" | `./scripts/imagemcp.js text_to_svg --prompt "Minimalist rocket icon" --out ./icon.svg` |
| "Generate image with input image (Image-to-Image)" | `./scripts/imagemcp.js generate --prompt "..." --image ./input.png --out output.png` |
| "Edit existing image / Inpaint" | `./scripts/imagemcp.js edit --image ./input.png --prompt "..." --out edited.png` |
| "Remove background from image" | `./scripts/imagemcp.js remove_bg --image ./input.png --out clean.png` |
| "Upscale image to 4K" | `./scripts/imagemcp.js upscale --image ./input.png --scale 4x --out 4k.png` |
| "Compress image file size" | `./scripts/imagemcp.js compress --image ./input.png --quality 70 --format webp --out compressed.webp` |
| "Convert image format" | `./scripts/imagemcp.js convert --image ./input.png --format webp --out converted.webp` |


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

### 1. User Info & Model List

#### `user:info` (alias: `me:get`)
Retrieve profile details for the authenticated ImageMCP user including subscription plan and credit balance.

```bash
./scripts/imagemcp.js user:info
```

#### `models:list` (alias: `models:get`)
List all supported image generation models from OpenRouter with priority scores, providers, cost, and supported aspect ratios.

```bash
./scripts/imagemcp.js models:list
```

---

### 2. Image Generation

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

### 3. Image Editing & Refinement Endpoint

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

### 4. Configuration Commands

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
