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

// Config path resolution
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.config', 'imagemcp');
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, 'config.json');
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

// Read configuration from env or config files
function loadConfig() {
  let config = {
    apiKey: '',
    apiUrl: DEFAULT_API_URL,
  };

  if (fs.existsSync(LOCAL_CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(LOCAL_CONFIG_FILE, 'utf8'));
      if (data.apiKey) config.apiKey = data.apiKey;
      if (data.apiUrl) config.apiUrl = data.apiUrl;
    } catch (_) {}
  } else if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(GLOBAL_CONFIG_FILE, 'utf8'));
      if (data.apiKey) config.apiKey = data.apiKey;
      if (data.apiUrl) config.apiUrl = data.apiUrl;
    } catch (_) {}
  }

  if (process.env.IMAGEMCP_API_KEY || process.env.IMAGEMCP_KEY) {
    config.apiKey = process.env.IMAGEMCP_API_KEY || process.env.IMAGEMCP_KEY;
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
    fs.mkdirSync(configDir, { recursive: true });
  }

  const existing = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : {};
  const updated = { ...existing, ...newConfig };
  fs.writeFileSync(configFile, JSON.stringify(updated, null, 2), 'utf8');
  return configFile;
}

// HTTP request helper to ImageMCP Server API
async function apiRequest(endpoint, method = 'GET', body = null, requireAuth = false) {
  const config = loadConfig();

  if (requireAuth && !config.apiKey) {
    error('Missing ImageMCP API key. Set IMAGEMCP_API_KEY or run ./scripts/imagemcp.js setup', {
      hint: 'Run ./scripts/imagemcp.js setup to configure your API key.',
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

async function getApiKeys() {
  const data = await apiRequest('/api-keys', 'GET', null, true);
  output(data.keys || data);
}

async function createApiKey(rawArgs) {
  const { flags } = parseFlags(rawArgs);
  const name = flags.name || flags.label || 'CLI Agent Key';
  const data = await apiRequest('/api-keys', 'POST', { name }, true);
  output(data);
}

async function revokeApiKey(rawArgs) {
  const { positional } = parseFlags(rawArgs);
  const id = positional[0];
  if (!id) {
    error('API Key ID is required. Usage: ./scripts/imagemcp.js keys:revoke <key_id>');
  }
  const data = await apiRequest(`/api-keys/${id}`, 'DELETE', null, true);
  output(data);
}

async function listModels() {
  const data = await apiRequest('/models', 'GET');
  output(data);
}

async function toggleModel(rawArgs) {
  const { positional } = parseFlags(rawArgs);
  const id = positional[0];
  if (!id) {
    error('Model ID is required. Usage: ./scripts/imagemcp.js models:toggle <model_id>');
  }
  const data = await apiRequest(`/models/${encodeURIComponent(id)}/toggle`, 'PATCH', null, true);
  output(data);
}

async function updatePriority(rawArgs) {
  const { positional } = parseFlags(rawArgs);
  const id = positional[0];
  const priorityStr = positional[1];

  if (!id || priorityStr === undefined) {
    error('Model ID and priority score are required. Usage: ./scripts/imagemcp.js models:priority <model_id> <score>');
  }

  const priority = Number(priorityStr);
  const data = await apiRequest(`/models/${encodeURIComponent(id)}/priority`, 'POST', { priority }, true);
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

  const model = flags.model || flags['model-id'] || 'google/gemini-2.5-flash-image';
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

  const model = flags.model || flags['model-id'] || 'google/gemini-2.5-flash-image';
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
    model,
    style,
    aspectRatio,
    imageBase64,
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


async function listLogs() {
  const data = await apiRequest('/logs', 'GET', null, true);
  output(data.logs || data);
}

async function clearLogs() {
  const data = await apiRequest('/logs', 'DELETE', null, true);
  output(data);
}

async function listGallery() {
  const data = await apiRequest('/gallery', 'GET');
  output(data.items || data);
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
${colors.bold}${colors.cyan}ImageMCP Server CLI${colors.reset} - Generate & manage images via ImageMCP API

${colors.bold}USAGE:${colors.reset}
  ./scripts/imagemcp.js <command> [arguments] [flags]

${colors.bold}AVAILABLE COMMANDS:${colors.reset}
  ${colors.green}user:info${colors.reset} (alias: ${colors.green}me:get${colors.reset})
    Fetch details of authenticated user (plan, credits, account details).

  ${colors.green}keys:list${colors.reset}
    List all active API keys.

  ${colors.green}keys:create${colors.reset} --name "<label>"
    Create a new secret API key.

  ${colors.green}keys:revoke <key_id>${colors.reset}
    Revoke and delete an API key.

  ${colors.green}models:list${colors.reset}
    List available OpenRouter image generation models (38+ models).

  ${colors.green}models:toggle <model_id>${colors.reset}
    Enable or disable a model for your account.

  ${colors.green}models:priority <model_id> <score>${colors.reset}
    Set user priority score for a model.

  ${colors.green}generate${colors.reset} (alias: ${colors.green}image:generate${colors.reset})
    Generate an image from prompt using OpenRouter.
    Flags:
      --prompt "<text>"      Text prompt for image synthesis
      --file <path>          Read prompt from local file
      --model <model_id>     Target model ID (default: google/gemini-2.5-flash-image)
      --aspect-ratio <ratio> Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4, 21:9)
      --style <name>         Visual style preset (photorealistic, anime, vector, 3d)
      --image <path_or_url>  Input image for image-to-image synthesis
      --out <filepath>       Save generated image to local file path

  ${colors.green}edit${colors.reset} (alias: ${colors.green}image:edit${colors.reset})
    Edit, refine, or transform an existing image.
    Flags:
      --image <path_or_url>  (Required) Target image to edit or modify
      --prompt "<text>"      Edit instructions or description of changes
      --file <path>          Read prompt from local file
      --model <model_id>     Target model ID (default: google/gemini-2.5-flash-image)
      --aspect-ratio <ratio> Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4, 21:9)
      --style <name>         Visual style preset (photorealistic, anime, vector, 3d)
      --out <filepath>       Save edited image output to local file path

  ${colors.green}logs:list${colors.reset}
    List request telemetry logs & latency history.

  ${colors.green}logs:clear${colors.reset}
    Clear all telemetry logs.

  ${colors.green}gallery:list${colors.reset}
    List showcase gallery items.

  ${colors.green}setup${colors.reset}
    Run interactive configuration setup wizard.

  ${colors.green}config:show${colors.reset}
    Display current configuration settings.

  ${colors.green}config:set-key <key>${colors.reset}
    Set API key in configuration file.

  ${colors.green}config:set-url <url>${colors.reset}
    Set API URL in configuration file.
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

      case 'keys:list':
      case 'keys:get':
        await getApiKeys();
        break;

      case 'keys:create':
        await createApiKey(commandArgs);
        break;

      case 'keys:revoke':
        await revokeApiKey(commandArgs);
        break;

      case 'models:list':
      case 'models:get':
        await listModels();
        break;

      case 'models:toggle':
        await toggleModel(commandArgs);
        break;

      case 'models:priority':
        await updatePriority(commandArgs);
        break;

      case 'generate':
      case 'image:generate':
        await generateImage(commandArgs);
        break;

      case 'edit':
      case 'image:edit':
        await editImage(commandArgs);
        break;

      case 'logs:list':
      case 'logs:get':
        await listLogs();
        break;

      case 'logs:clear':
        await clearLogs();
        break;

      case 'gallery:list':
        await listGallery();
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
