#!/usr/bin/env node

/**
 * ImageMCP Server CLI - Manage & generate images, models, API keys, and logs
 *
 * Zero dependencies - uses only Node.js built-in modules & native fetch (Node 18+)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const crypto = require('crypto');

// Config path resolution
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.imagemcp');
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, 'config.json');
const LEGACY_CONFIG_DIR = path.join(os.homedir(), '.config', 'imagemcp');
const LEGACY_CONFIG_FILE = path.join(LEGACY_CONFIG_DIR, 'config.json');
const LOCAL_CONFIG_DIR = '.imagemcp';
const LOCAL_CONFIG_FILE = path.join(LOCAL_CONFIG_DIR, 'config.json');

const DEFAULT_API_URL = 'https://api.imagemcpserver.com';

// Terminal formatting colors
const isColorSupported = Boolean(process.stderr.isTTY);
const colors = {
  reset: isColorSupported ? '\x1b[0m' : '',
  bold: isColorSupported ? '\x1b[1m' : '',
  dim: isColorSupported ? '\x1b[2m' : '',
  green: isColorSupported ? '\x1b[32m' : '',
  yellow: isColorSupported ? '\x1b[33m' : '',
  blue: isColorSupported ? '\x1b[34m' : '',
  cyan: isColorSupported ? '\x1b[36m' : '',
  red: isColorSupported ? '\x1b[31m' : '',
};

function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

function error(message, details = {}) {
  output({ error: message, ...details });
  process.exit(1);
}

// AES-256-GCM Master Key Derivation for token decryption
function getMasterKey() {
  const secretInfo = `${os.hostname()}-${os.userInfo().username}-imagemcp-secure-salt-v1`;
  return crypto.createHash('sha256').update(secretInfo).digest();
}

function decryptToken(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (payload.raw) return payload.raw;

  try {
    const key = getMasterKey();
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (_) {
    return payload.encrypted || '';
  }
}

// Read configuration from env or config files
function loadConfig() {
  let config = {
    apiKey: '',
    apiUrl: DEFAULT_API_URL,
  };

  const parseConfigFile = (filePath) => {
    if (!fs.existsSync(filePath)) return null;
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const rawToken = data.token || data.apiKey || '';
      const token = typeof rawToken === 'string' ? rawToken : decryptToken(rawToken);
      return { apiKey: token, apiUrl: data.apiUrl || DEFAULT_API_URL };
    } catch (_) {
      return null;
    }
  };

  const localCfg = parseConfigFile(LOCAL_CONFIG_FILE);
  const globalCfg = parseConfigFile(GLOBAL_CONFIG_FILE) || parseConfigFile(LEGACY_CONFIG_FILE);

  if (localCfg && localCfg.apiKey) {
    config.apiKey = localCfg.apiKey;
    if (localCfg.apiUrl) config.apiUrl = localCfg.apiUrl;
  } else if (globalCfg && globalCfg.apiKey) {
    config.apiKey = globalCfg.apiKey;
    if (globalCfg.apiUrl) config.apiUrl = globalCfg.apiUrl;
  }

  if (process.env.IMAGEMCP_API_KEY || process.env.IMAGEMCP_KEY || process.env.IMAGEMCP_TOKEN) {
    config.apiKey = process.env.IMAGEMCP_API_KEY || process.env.IMAGEMCP_KEY || process.env.IMAGEMCP_TOKEN;
  }
  if (process.env.IMAGEMCP_API_URL) {
    config.apiUrl = process.env.IMAGEMCP_API_URL;
  }

  config.apiUrl = config.apiUrl.replace(/\/+$/, '');
  return config;
}


function saveConfig(newConfig, isLocal = false) {
  const configFile = isLocal ? LOCAL_CONFIG_FILE : GLOBAL_CONFIG_FILE;
  const configDir = isLocal ? LOCAL_CONFIG_DIR : GLOBAL_CONFIG_DIR;

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }

  const existing = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : {};
  const updated = { ...existing, ...newConfig };
  fs.writeFileSync(configFile, JSON.stringify(updated, null, 2), { encoding: 'utf8', mode: 0o600 });
  return configFile;
}

// HTTP request helper to ImageMCP Server API
async function apiRequest(endpoint, method = 'GET', body = null, requireAuth = false) {
  const config = loadConfig();

  if (requireAuth && !config.apiKey) {
    error("ImageMCPServer isn't connected yet. Run npx imagemcp login to connect your account.", {
      hint: "Run 'npx imagemcp login' in your terminal to authenticate via browser.",
    });
  }

  const url = `${config.apiUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      error(data.message || `API request failed with status ${response.status}`, {
        status: response.status,
        endpoint,
      });
    }

    return data;
  } catch (err) {
    if (err.message && err.message.includes('API request failed')) {
      throw err;
    }
    error(`Failed to connect to ImageMCP Server backend at ${config.apiUrl}: ${err.message}`, {
      apiUrl: config.apiUrl,
      endpoint,
    });
  }
}

// Parse command line flags: --key value or --booleanFlag
function parseFlags(args) {
  const flags = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[key] = args[i + 1];
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

// Interactive setup CLI
async function handleSetup() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.error(`${colors.bold}${colors.cyan}--- ImageMCP Server Skill Setup ---${colors.reset}\n`);

  const currentConfig = loadConfig();
  const apiKeyInput = await prompt(
    `Enter ImageMCP API Key ${currentConfig.apiKey ? `[current: ${currentConfig.apiKey.slice(0, 10)}...]` : ''}: `
  );
  const apiUrlInput = await prompt(
    `Enter ImageMCP API URL [default: ${currentConfig.apiUrl}]: `
  );

  rl.close();

  const apiKey = apiKeyInput.trim() || currentConfig.apiKey;
  const apiUrl = apiUrlInput.trim() || currentConfig.apiUrl;

  if (!apiKey) {
    error('API Key cannot be empty.');
  }

  const savedFile = saveConfig({ apiKey, apiUrl });
  output({
    success: true,
    message: 'Configuration saved successfully',
    savedTo: savedFile,
    apiUrl,
  });
}

// Commands Implementation

async function getUserInfo() {
  const data = await apiRequest('/auth/user-data', 'GET', null, true);
  if (data.user) {
    output({
      id: data.user._id,
      name: data.user.name,
      email: data.user.email,
      plan: data.user.plan || 'free',
      credits: data.user.credits ?? 0,
      avatar: data.user.avatar || '',
    });
  } else {
    output(data);
  }
}

async function listModels() {
  const data = await apiRequest('/models', 'GET');
  output(data);
}


async function generateImage(rawArgs) {
  const { flags } = parseFlags(rawArgs);

  let prompt = flags.prompt || '';
  if (flags.file) {
    if (!fs.existsSync(flags.file)) {
      error(`Prompt file not found: ${flags.file}`);
    }
    prompt = fs.readFileSync(flags.file, 'utf8').trim();
  }

  if (!prompt) {
    error('Prompt is required. Use --prompt "<text>" or --file <path>');
  }

  const model = flags.model || flags['model-id'] || undefined;
  const style = flags.style || 'photorealistic';
  const aspectRatio = flags['aspect-ratio'] || flags.aspect || flags.ratio || '1:1';
  let imageBase64 = null;

  if (flags.image) {
    const imgPath = flags.image;
    if (fs.existsSync(imgPath)) {
      const buffer = fs.readFileSync(imgPath);
      const ext = path.extname(imgPath).replace('.', '').toLowerCase() || 'png';
      imageBase64 = `data:image/${ext};base64,${buffer.toString('base64')}`;
    } else if (imgPath.startsWith('http') || imgPath.startsWith('data:')) {
      imageBase64 = imgPath;
    } else {
      error(`Image file not found: ${imgPath}`);
    }
  }

  const payload = {
    prompt,
    model,
    style,
    aspectRatio,
    imageBase64,
  };

  const resData = await apiRequest('/playground/generate', 'POST', payload, true);

  // If output path flag is provided, download and save the generated image
  if (flags.out && resData.success && resData.result?.imageUrl) {
    const outPath = flags.out;
    try {
      const imgUrl = resData.result.imageUrl;
      let buffer = null;

      if (imgUrl.startsWith('data:')) {
        const base64Data = imgUrl.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        const fetchRes = await fetch(imgUrl);
        const arrayBuf = await fetchRes.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      }

      fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
      fs.writeFileSync(outPath, buffer);
      resData.result.savedTo = path.resolve(outPath);
    } catch (saveErr) {
      resData.result.saveError = `Failed to download image to ${outPath}: ${saveErr.message}`;
    }
  }

  output(resData);
}

async function editImage(rawArgs) {
  const { flags } = parseFlags(rawArgs);

  if (!flags.image) {
    error('Input image is required for image editing. Use --image <filepath_or_url>');
  }

  let prompt = flags.prompt || '';
  if (flags.file) {
    if (!fs.existsSync(flags.file)) {
      error(`Prompt file not found: ${flags.file}`);
    }
    prompt = fs.readFileSync(flags.file, 'utf8').trim();
  }

  if (!prompt) {
    error('Prompt is required for editing instructions. Use --prompt "<text>" or --file <path>');
  }

  const model = flags.model || flags['model-id'] || undefined;
  const style = flags.style || 'photorealistic';
  const aspectRatio = flags['aspect-ratio'] || flags.aspect || flags.ratio || '1:1';
  let imageBase64 = null;

  const imgPath = flags.image;
  if (fs.existsSync(imgPath)) {
    const buffer = fs.readFileSync(imgPath);
    const ext = path.extname(imgPath).replace('.', '').toLowerCase() || 'png';
    imageBase64 = `data:image/${ext};base64,${buffer.toString('base64')}`;
  } else if (imgPath.startsWith('http') || imgPath.startsWith('data:')) {
    imageBase64 = imgPath;
  } else {
    error(`Image file not found: ${imgPath}`);
  }

  const payload = {
    prompt,
    action: flags.action || 'edit',
    model,
    style,
    aspectRatio,
    imageBase64,
    image: flags.image,
  };

  const resData = await apiRequest('/playground/edit', 'POST', payload, true);

  if (flags.out && resData.success && resData.result?.imageUrl) {
    const outPath = flags.out;
    try {
      const imgUrl = resData.result.imageUrl;
      let buffer = null;

      if (imgUrl.startsWith('data:')) {
        const base64Data = imgUrl.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        const fetchRes = await fetch(imgUrl);
        const arrayBuf = await fetchRes.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      }

      fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
      fs.writeFileSync(outPath, buffer);
      resData.result.savedTo = path.resolve(outPath);
    } catch (saveErr) {
      resData.result.saveError = `Failed to download image to ${outPath}: ${saveErr.message}`;
    }
  }

  output(resData);
}

async function removeBgImage(rawArgs) {
  const { flags } = parseFlags(rawArgs);
  if (!flags.image) {
    error('Input image is required for background removal. Use --image <filepath_or_url>');
  }

  const model = flags.model || flags['model-id'] || undefined;
  const style = flags.style || 'photorealistic';
  const aspectRatio = flags['aspect-ratio'] || flags.aspect || flags.ratio || '1:1';
  let imageBase64 = null;

  const imgPath = flags.image;
  if (fs.existsSync(imgPath)) {
    const buffer = fs.readFileSync(imgPath);
    const ext = path.extname(imgPath).replace('.', '').toLowerCase() || 'png';
    imageBase64 = `data:image/${ext};base64,${buffer.toString('base64')}`;
  } else if (imgPath.startsWith('http') || imgPath.startsWith('data:')) {
    imageBase64 = imgPath;
  } else {
    error(`Image file not found: ${imgPath}`);
  }

  const payload = {
    prompt: flags.prompt,
    action: 'remove_bg',
    model,
    style,
    aspectRatio,
    imageBase64,
    image: flags.image,
  };

  const resData = await apiRequest('/playground/remove-background', 'POST', payload, true);

  if (flags.out && resData.success && resData.result?.imageUrl) {
    const outPath = flags.out;
    try {
      const imgUrl = resData.result.imageUrl;
      let buffer = null;

      if (imgUrl.startsWith('data:')) {
        const base64Data = imgUrl.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        const fetchRes = await fetch(imgUrl);
        const arrayBuf = await fetchRes.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      }

      fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
      fs.writeFileSync(outPath, buffer);
      resData.result.savedTo = path.resolve(outPath);
    } catch (saveErr) {
      resData.result.saveError = `Failed to download image to ${outPath}: ${saveErr.message}`;
    }
  }

  output(resData);
}

async function upscaleImage(rawArgs) {
  const { flags } = parseFlags(rawArgs);
  if (!flags.image) {
    error('Input image is required for 4K upscaling. Use --image <filepath_or_url>');
  }

  const model = flags.model || flags['model-id'] || undefined;
  const style = flags.style || 'photorealistic';
  const aspectRatio = flags['aspect-ratio'] || flags.aspect || flags.ratio || '1:1';
  let imageBase64 = null;

  const imgPath = flags.image;
  if (fs.existsSync(imgPath)) {
    const buffer = fs.readFileSync(imgPath);
    const ext = path.extname(imgPath).replace('.', '').toLowerCase() || 'png';
    imageBase64 = `data:image/${ext};base64,${buffer.toString('base64')}`;
  } else if (imgPath.startsWith('http') || imgPath.startsWith('data:')) {
    imageBase64 = imgPath;
  } else {
    error(`Image file not found: ${imgPath}`);
  }

  const payload = {
    prompt: flags.prompt || `Upscale image to ${flags.scale || '4x'} resolution with sharp 4K detail`,
    action: 'upscale',
    scale: flags.scale || '4x',
    model,
    style,
    aspectRatio,
    imageBase64,
    image: flags.image,
  };

  const resData = await apiRequest('/playground/upscale', 'POST', payload, true);

  if (flags.out && resData.success && resData.result?.imageUrl) {
    const outPath = flags.out;
    try {
      const imgUrl = resData.result.imageUrl;
      let buffer = null;

      if (imgUrl.startsWith('data:')) {
        const base64Data = imgUrl.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        const fetchRes = await fetch(imgUrl);
        const arrayBuf = await fetchRes.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      }

      fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
      fs.writeFileSync(outPath, buffer);
      resData.result.savedTo = path.resolve(outPath);
    } catch (saveErr) {
      resData.result.saveError = `Failed to download image to ${outPath}: ${saveErr.message}`;
    }
  }

  output(resData);
}

async function textToSvg(rawArgs) {
  const { flags } = parseFlags(rawArgs);

  let prompt = flags.prompt || '';
  if (flags.file) {
    if (!fs.existsSync(flags.file)) {
      error(`Prompt file not found: ${flags.file}`);
    }
    prompt = fs.readFileSync(flags.file, 'utf8').trim();
  }

  if (!prompt) {
    error('Prompt is required. Use --prompt "<text>" or --file <path>');
  }

  const payload = {
    prompt,
    style: flags.style || 'icon',
    model: flags.model || flags['model-id'] || 'fal-ai/recraft/v4.1/text-to-vector',
  };

  const resData = await apiRequest('/playground/text-to-svg', 'POST', payload, true);

  if (flags.out && resData.success && (resData.result?.svgCode || resData.result?.imageUrl)) {
    const outPath = flags.out;
    try {
      let content = resData.result.svgCode;
      if (!content && resData.result.imageUrl) {
        const fetchRes = await fetch(resData.result.imageUrl);
        content = await fetchRes.text();
      }

      fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
      fs.writeFileSync(outPath, content, 'utf8');
      resData.result.savedTo = path.resolve(outPath);
    } catch (saveErr) {
      resData.result.saveError = `Failed to save SVG to ${outPath}: ${saveErr.message}`;
    }
  }

  output(resData);
}

async function compressImage(rawArgs) {
  const { flags } = parseFlags(rawArgs);
  if (!flags.image) {
    error('Input image is required for compression. Use --image <filepath_or_url>');
  }

  let imageBase64 = null;
  const imgPath = flags.image;
  if (fs.existsSync(imgPath)) {
    const buffer = fs.readFileSync(imgPath);
    const ext = path.extname(imgPath).replace('.', '').toLowerCase() || 'png';
    imageBase64 = `data:image/${ext};base64,${buffer.toString('base64')}`;
  } else if (imgPath.startsWith('http') || imgPath.startsWith('data:')) {
    imageBase64 = imgPath;
  } else {
    error(`Image file not found: ${imgPath}`);
  }

  const payload = {
    image: flags.image,
    imageBase64,
    quality: parseInt(flags.quality || '70', 10),
    targetFormat: flags['target-format'] || flags.format || 'webp',
  };

  const resData = await apiRequest('/playground/compress', 'POST', payload, true);

  if (flags.out && resData.success && resData.result?.imageUrl) {
    const outPath = flags.out;
    try {
      const imgUrl = resData.result.imageUrl;
      let buffer = null;

      if (imgUrl.startsWith('data:')) {
        const base64Data = imgUrl.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        const fetchRes = await fetch(imgUrl);
        const arrayBuf = await fetchRes.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      }

      fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
      fs.writeFileSync(outPath, buffer);
      resData.result.savedTo = path.resolve(outPath);
    } catch (saveErr) {
      resData.result.saveError = `Failed to download compressed image to ${outPath}: ${saveErr.message}`;
    }
  }

  output(resData);
}

async function convertFormat(rawArgs) {
  const { flags } = parseFlags(rawArgs);
  if (!flags.image) {
    error('Input image is required for format conversion. Use --image <filepath_or_url>');
  }

  const targetFormat = flags['target-format'] || flags.format || flags.to || 'png';

  let imageBase64 = null;
  const imgPath = flags.image;
  if (fs.existsSync(imgPath)) {
    const buffer = fs.readFileSync(imgPath);
    const ext = path.extname(imgPath).replace('.', '').toLowerCase() || 'png';
    imageBase64 = `data:image/${ext};base64,${buffer.toString('base64')}`;
  } else if (imgPath.startsWith('http') || imgPath.startsWith('data:')) {
    imageBase64 = imgPath;
  } else {
    error(`Image file not found: ${imgPath}`);
  }

  const payload = {
    image: flags.image,
    imageBase64,
    targetFormat,
  };

  const resData = await apiRequest('/playground/convert-format', 'POST', payload, true);

  if (flags.out && resData.success && resData.result?.imageUrl) {
    const outPath = flags.out;
    try {
      const imgUrl = resData.result.imageUrl;
      let buffer = null;

      if (imgUrl.startsWith('data:')) {
        const base64Data = imgUrl.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        const fetchRes = await fetch(imgUrl);
        const arrayBuf = await fetchRes.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      }

      fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
      fs.writeFileSync(outPath, buffer);
      resData.result.savedTo = path.resolve(outPath);
    } catch (saveErr) {
      resData.result.saveError = `Failed to download converted image to ${outPath}: ${saveErr.message}`;
    }
  }

  output(resData);
}


function showConfig() {
  const config = loadConfig();
  output({
    apiKeyConfigured: Boolean(config.apiKey),
    apiKeyMasked: config.apiKey ? `${config.apiKey.slice(0, 10)}...` : null,
    apiUrl: config.apiUrl,
  });
}

function setConfigKey(key) {
  if (!key) error('API key value is required.');
  const savedFile = saveConfig({ apiKey: key });
  output({ success: true, message: 'API key saved', savedTo: savedFile });
}

function setConfigUrl(url) {
  if (!url) error('API URL value is required.');
  const savedFile = saveConfig({ apiUrl: url });
  output({ success: true, message: 'API URL saved', savedTo: savedFile });
}

function printHelp() {
  console.error(`
${colors.bold}${colors.cyan}===============================================================
  🎨 ImageMCP Server CLI — Multi-Model AI Image & Vector Suite
===============================================================${colors.reset}

${colors.bold}USAGE:${colors.reset}
  ./scripts/imagemcp.js <command> [flags]

${colors.bold}CATEGORIZED COMMAND REFERENCE:${colors.reset}

  ${colors.bold}${colors.yellow}1. 👤 USER & ACCOUNT:${colors.reset}
    ${colors.green}user:info${colors.reset} (alias: ${colors.green}me:get${colors.reset})
      Fetch profile details, plan type, and remaining credit balance.
      ${colors.dim}Example: ./scripts/imagemcp.js user:info${colors.reset}

    ${colors.green}models:list${colors.reset} (alias: ${colors.green}models:get${colors.reset})
      List all supported OpenRouter & Fal.ai image models.
      ${colors.dim}Example: ./scripts/imagemcp.js models:list${colors.reset}

  ${colors.bold}${colors.yellow}2. 📐 VECTOR GRAPHICS:${colors.reset}
    ${colors.green}text_to_svg${colors.reset} (aliases: ${colors.green}svg${colors.reset}, ${colors.green}text-to-svg${colors.reset})
      Synthesize clean vector SVG graphics using ${colors.cyan}fal-ai/recraft/v4.1/text-to-vector${colors.reset}.
      Flags:
        --prompt "<text>"      Text description of icon/logo/vector (Required)
        --style <style>        Style preset: icon, logo, mascot, illustration, pattern
        --out <filepath>       Save generated SVG file output (.svg)
      ${colors.dim}Example: ./scripts/imagemcp.js text_to_svg --prompt "Minimalist rocket icon" --out ./rocket.svg${colors.reset}

  ${colors.bold}${colors.yellow}3. ✨ IMAGE GENERATION:${colors.reset}
    ${colors.green}generate${colors.reset} (alias: ${colors.green}image:generate${colors.reset})
      Synthesize images from text prompts or input images.
      Flags:
        --prompt "<text>"      Detailed prompt description (Required)
        --file <path>          Read prompt text from file
        --model <model_id>     Target model ID (default: google/gemini-2.5-flash-image)
        --aspect-ratio <ratio> Aspect ratio: 1:1, 16:9, 9:16, 4:3, 3:4, 21:9
        --style <name>         Visual style preset (photorealistic, anime, vector, 3d)
        --image <path_or_url>  Base image for image-to-image synthesis
        --out <filepath>       Save generated image output file
      ${colors.dim}Example: ./scripts/imagemcp.js generate --prompt "Cyberpunk city" --aspect-ratio 16:9 --out ./city.png${colors.reset}

  ${colors.bold}${colors.yellow}4. ✂️ PROCESSING & EDITING:${colors.reset}
    ${colors.green}remove_bg${colors.reset} (alias: ${colors.green}remove-bg${colors.reset})
      Remove image backgrounds completely with transparent PNG cutouts using ${colors.cyan}fal-ai/feynobg${colors.reset}.
      Flags:
        --image <path_or_url>  Target image path or URL (Required)
        --out <filepath>       Save background-removed transparent PNG
      ${colors.dim}Example: ./scripts/imagemcp.js remove_bg --image ./product.jpg --out ./product_clean.png${colors.reset}

    ${colors.green}upscale${colors.reset} (alias: ${colors.green}image:upscale${colors.reset})
      Upscale image resolution to 4K quality using ${colors.cyan}fal-ai/recraft/upscale/crisp${colors.reset}.
      Flags:
        --image <path_or_url>  Target image path or URL (Required)
        --scale <factor>       Scale factor: 2x, 4x, 8x (default: 4x)
        --out <filepath>       Save upscaled image output file
      ${colors.dim}Example: ./scripts/imagemcp.js upscale --image ./photo.jpg --scale 4x --out ./photo_4k.png${colors.reset}

    ${colors.green}edit${colors.reset} (alias: ${colors.green}image:edit${colors.reset})
      Edit, inpaint, or modify images with prompt instructions.
      Flags:
        --image <path_or_url>  Base image to modify (Required)
        --prompt "<text>"      Edit instructions (Required)
        --out <filepath>       Save edited image output file
      ${colors.dim}Example: ./scripts/imagemcp.js edit --image ./room.jpg --prompt "Add sleeping cat on rug" --out ./edited.png${colors.reset}

  ${colors.bold}${colors.yellow}5. 🗜️ OPTIMIZATION & CONVERSION:${colors.reset}
    ${colors.green}compress${colors.reset} (alias: ${colors.green}compress_image${colors.reset})
      Compress image file size with quality percentage control.
      Flags:
        --image <path_or_url>  Target image path or URL (Required)
        --quality <10-95>      Quality percentage (default: 70)
        --format <fmt>         Output format: webp, jpeg, png (default: webp)
        --out <filepath>       Save compressed output file
      ${colors.dim}Example: ./scripts/imagemcp.js compress --image ./large.png --quality 65 --out ./compressed.webp${colors.reset}

    ${colors.green}convert${colors.reset} (alias: ${colors.green}convert_format${colors.reset})
      Convert image format across PNG, JPG, WEBP, SVG, GIF, and BMP.
      Flags:
        --image <path_or_url>  Target image path or URL (Required)
        --format <fmt>         Target format: png, jpeg, webp, svg, gif, bmp (Required)
        --out <filepath>       Save converted image file
      ${colors.dim}Example: ./scripts/imagemcp.js convert --image ./photo.jpg --format webp --out ./photo.webp${colors.reset}

  ${colors.bold}${colors.yellow}6. ⚙️ CONFIGURATION:${colors.reset}
    ${colors.green}setup${colors.reset}                    Interactive configuration wizard
    ${colors.green}config:show${colors.reset}              Display current settings
    ${colors.green}config:set-key <key>${colors.reset}     Save API Key
    ${colors.green}config:set-url <url>${colors.reset}     Save Backend Server API URL

${colors.bold}QUICK HELP & TIPS:${colors.reset}
  Pass ${colors.cyan}--out <path>${colors.reset} to any image command to automatically download and save the output.
  For full documentation, visit ${colors.cyan}https://imagemcpserver.com${colors.reset}.
`);
}


// Main CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const commandArgs = args.slice(1);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case 'user:info':
      case 'me:get':
        await getUserInfo();
        break;

      case 'models:list':
      case 'models:get':
        await listModels();
        break;

      case 'generate':
      case 'image:generate':
        await generateImage(commandArgs);
        break;

      case 'text_to_svg':
      case 'text-to-svg':
      case 'svg':
        await textToSvg(commandArgs);
        break;

      case 'edit':
      case 'image:edit':
        await editImage(commandArgs);
        break;

      case 'remove_bg':
      case 'remove-bg':
      case 'image:remove-bg':
        await removeBgImage(commandArgs);
        break;

      case 'upscale':
      case 'image:upscale':
        await upscaleImage(commandArgs);
        break;

      case 'compress':
      case 'compress_image':
      case 'compress-image':
        await compressImage(commandArgs);
        break;

      case 'convert':
      case 'convert_format':
      case 'convert-format':
        await convertFormat(commandArgs);
        break;

      case 'setup':
        await handleSetup();
        break;

      case 'config:show':
        showConfig();
        break;

      case 'config:set-key':
        setConfigKey(commandArgs[0]);
        break;

      case 'config:set-url':
        setConfigUrl(commandArgs[0]);
        break;

      default:
        error(`Unknown command: ${command}. Run ./scripts/imagemcp.js --help to list available commands.`);
    }
  } catch (err) {
    error(err.message || 'An unexpected error occurred');
  }
}


main();
