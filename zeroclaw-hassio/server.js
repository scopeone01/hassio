/**
 * ZeroClaw Home Assistant Add-on — Main Server (Node.js)
 *
 * Pure Node.js bridge between Home Assistant and LLM providers.
 * Provides: Chat API, Entity tools, WebUI panel.
 * Zero npm dependencies — uses only Node.js 20 built-ins.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Configuration ──────────────────────────────────────────────────

const OPTIONS_PATH = '/data/options.json';
const PORT = 3000;
const VERSION = '0.7.0';

function loadOptions() {
  try {
    if (fs.existsSync(OPTIONS_PATH)) {
      return JSON.parse(fs.readFileSync(OPTIONS_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[zeroclaw] Failed to load options:', e.message);
  }
  return {
    provider: process.env.ZEROCLAW_PROVIDER || 'ollama',
    model: process.env.ZEROCLAW_MODEL || '',
    api_key: process.env.ZEROCLAW_API_KEY || '',
    api_url: process.env.ZEROCLAW_API_URL || 'http://localhost:11434',
    temperature: parseFloat(process.env.ZEROCLAW_TEMPERATURE || '0.7'),
    system_prompt: process.env.ZEROCLAW_SYSTEM_PROMPT || '',
    allowed_domains: ['light','switch','climate','cover','media_player','fan','scene','script','automation','input_boolean','input_number','input_select'],
    fallback_provider: 'none',
    fallback_model: '',
    fallback_api_key: '',
    fallback_api_url: '',
    event_listener: true,
    event_filter: ['state_changed'],
    mqtt_enabled: false,
    mqtt_broker: 'core-mosquitto',
    mqtt_port: 1883,
    mqtt_username: '',
    mqtt_password: '',
    log_level: 'info',
  };
}

function log(level, ...args) {
  const ts = new Date().toISOString();
  console.log(`${ts} [${level.toUpperCase()}] zeroclaw:`, ...args);
}

// ── Home Assistant API Client ──────────────────────────────────────

class HomeAssistantClient {
  constructor(options) {
    this.supervisorToken = process.env.SUPERVISOR_TOKEN || '';
    this.haToken = options.api_key_ha || this.supervisorToken;
    if (this.supervisorToken) {
      this.baseUrl = 'http://supervisor/core/api';
    } else {
      this.baseUrl = (options.api_url || 'http://homeassistant:8123') + '/api';
    }
    this.allowedDomains = new Set(options.allowed_domains || []);
  }

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    const token = this.supervisorToken || this.haToken;
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  isDomainAllowed(entityId) {
    if (this.allowedDomains.size === 0) return true;
    const domain = entityId.includes('.') ? entityId.split('.')[0] : '';
    return this.allowedDomains.has(domain);
  }

  async getStates() {
    try {
      const resp = await fetch(`${this.baseUrl}/states`, { headers: this._headers() });
      if (resp.ok) {
        let states = await resp.json();
        if (this.allowedDomains.size > 0) {
          states = states.filter(s => this.isDomainAllowed(s.entity_id || ''));
        }
        return states;
      }
      log('error', 'Failed to get states:', resp.status);
    } catch (e) { log('error', 'getStates error:', e.message); }
    return [];
  }

  async getState(entityId) {
    if (!this.isDomainAllowed(entityId)) return { error: `Domain not allowed: ${entityId}` };
    try {
      const resp = await fetch(`${this.baseUrl}/states/${entityId}`, { headers: this._headers() });
      if (resp.ok) return await resp.json();
    } catch (e) { log('error', 'getState error:', e.message); }
    return null;
  }

  async callService(domain, service, data) {
    if (this.allowedDomains.size > 0 && !this.allowedDomains.has(domain)) {
      return { error: `Domain not allowed: ${domain}` };
    }
    const payload = data || {};
    try {
      const resp = await fetch(`${this.baseUrl}/services/${domain}/${service}`, {
        method: 'POST', headers: this._headers(), body: JSON.stringify(payload),
      });
      if (resp.ok) return await resp.json();
      const text = await resp.text();
      return { error: `Service call failed (${resp.status}): ${text}` };
    } catch (e) { return { error: e.message }; }
  }

  async fireEvent(eventType, data) {
    try {
      const resp = await fetch(`${this.baseUrl}/events/${eventType}`, {
        method: 'POST', headers: this._headers(), body: JSON.stringify(data || {}),
      });
      if (resp.ok) return await resp.json();
      return { error: `Fire event failed: ${resp.status}` };
    } catch (e) { return { error: e.message }; }
  }

  async getServices() {
    try {
      const resp = await fetch(`${this.baseUrl}/services`, { headers: this._headers() });
      if (resp.ok) return await resp.json();
    } catch (e) { log('error', 'getServices error:', e.message); }
    return [];
  }

  async getHistory(entityId, hours = 24) {
    const start = new Date(Date.now() - hours * 3600000).toISOString();
    const url = `${this.baseUrl}/history/period/${start}?filter_entity_id=${entityId}`;
    try {
      const resp = await fetch(url, { headers: this._headers() });
      if (resp.ok) return await resp.json();
    } catch (e) { log('error', 'getHistory error:', e.message); }
    return [];
  }

  async healthCheck() {
    try {
      const resp = await fetch(`${this.baseUrl}/`, { headers: this._headers() });
      return resp.ok;
    } catch { return false; }
  }
}

// ── LLM Provider Client ───────────────────────────────────────────

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'ha_get_states',
      description: 'Get all Home Assistant entity states. Optionally filter by domain.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: "Filter by domain (e.g. 'light', 'switch'). Empty = all." }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ha_get_state',
      description: 'Get state and attributes of a specific Home Assistant entity.',
      parameters: {
        type: 'object',
        properties: {
          entity_id: { type: 'string', description: "The entity ID, e.g. 'light.kitchen'" }
        },
        required: ['entity_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ha_call_service',
      description: 'Call a Home Assistant service to control a device.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: "Service domain (e.g. 'light', 'switch', 'climate')" },
          service: { type: 'string', description: "Service name (e.g. 'turn_on', 'turn_off')" },
          entity_id: { type: 'string', description: 'Target entity ID' },
          data: { type: 'object', description: 'Additional service data (e.g. brightness, temperature)' }
        },
        required: ['domain', 'service', 'entity_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ha_fire_event',
      description: 'Fire a custom Home Assistant event.',
      parameters: {
        type: 'object',
        properties: {
          event_type: { type: 'string', description: 'Event type name' },
          data: { type: 'object', description: 'Event data payload' }
        },
        required: ['event_type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ha_get_history',
      description: 'Get the state history of a Home Assistant entity.',
      parameters: {
        type: 'object',
        properties: {
          entity_id: { type: 'string', description: 'Entity ID to get history for' },
          hours: { type: 'integer', description: 'Hours of history (default: 24)' }
        },
        required: ['entity_id']
      }
    }
  },
];

class LLMClient {
  constructor(options) {
    this.provider = options.provider || 'ollama';
    this.model = options.model || '';
    this.apiKey = options.api_key || '';
    this.apiUrl = options.api_url || '';
    this.temperature = options.temperature || 0.7;
    this.systemPrompt = options.system_prompt || (
      'You are ZeroClaw, a helpful smart home AI assistant running inside Home Assistant. ' +
      'Use the ha_* tools to control devices, check states, and answer questions about the home. ' +
      'Be concise and helpful. When controlling devices, confirm the action taken.'
    );
    this.fallbackProvider = options.fallback_provider || 'none';
    this.fallbackModel = options.fallback_model || '';
    this.fallbackApiKey = options.fallback_api_key || '';
    this.fallbackApiUrl = options.fallback_api_url || '';
    this.conversation = [];
  }

  _getEndpoint(provider, apiUrl) {
    const p = provider || this.provider;
    const url = apiUrl || this.apiUrl;
    const endpoints = {
      ollama:     () => (url || 'http://homeassistant:11434') + '/api/chat',
      openai:     () => url || 'https://api.openai.com/v1/chat/completions',
      codex:      () => url || 'https://api.openai.com/v1/chat/completions',
      openrouter: () => url || 'https://openrouter.ai/api/v1/chat/completions',
      anthropic:  () => url || 'https://api.anthropic.com/v1/messages',
      gemini:     () => {
        const m = this.model || 'gemini-2.0-flash';
        return url || `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
      },
      minimax: () => url || 'https://api.minimaxi.chat/v1/chat/completions',
      zai:     () => url || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    };
    return (endpoints[p] || endpoints.openai)();
  }

  _getDefaultModel(provider) {
    const p = provider || this.provider;
    if (provider && this.fallbackModel) return this.fallbackModel;
    if (!provider && this.model) return this.model;
    const defaults = {
      ollama: 'llama3', openai: 'gpt-4o', codex: 'codex-mini-latest',
      openrouter: 'anthropic/claude-sonnet-4-20250514', anthropic: 'claude-sonnet-4-20250514',
      gemini: 'gemini-2.0-flash', minimax: 'MiniMax-M1', zai: 'glm-4-plus',
    };
    return defaults[p] || 'gpt-4o';
  }

  async chat(message, haClient) {
    this.conversation.push({ role: 'user', content: message });
    if (this.conversation.length > 40) {
      this.conversation = this.conversation.slice(-30);
    }

    // Try primary provider
    try {
      const result = await this._dispatchChat(this.provider, this.apiKey, this.apiUrl, this.model, haClient);
      if (result && !result.startsWith('Error')) return result;
      throw new Error(result || 'Empty response from primary provider');
    } catch (primaryErr) {
      log('warn', `Primary provider (${this.provider}) failed:`, primaryErr.message);

      // Try fallback
      if (this.fallbackProvider && this.fallbackProvider !== 'none') {
        log('info', `Switching to fallback provider: ${this.fallbackProvider}`);
        try {
          const result = await this._dispatchChat(
            this.fallbackProvider, this.fallbackApiKey,
            this.fallbackApiUrl, this.fallbackModel, haClient
          );
          if (result) return `[Fallback: ${this.fallbackProvider}] ${result}`;
        } catch (fbErr) {
          log('error', `Fallback provider (${this.fallbackProvider}) also failed:`, fbErr.message);
        }
      }
      return `Error: ${this.provider} failed (${primaryErr.message}). No working fallback available.`;
    }
  }

  async _dispatchChat(provider, apiKey, apiUrl, model, haClient) {
    if (provider === 'ollama') {
      return this._chatOllama(haClient, apiUrl, model);
    } else if (provider === 'anthropic') {
      return this._chatAnthropic(haClient, apiKey, model);
    } else {
      return this._chatOpenAICompatible(haClient, provider, apiKey, apiUrl, model);
    }
  }

  async _chatOpenAICompatible(haClient, provider, apiKey, apiUrl, modelOverride) {
    const p = provider || this.provider;
    const key = apiKey || this.apiKey;
    const endpoint = this._getEndpoint(p, apiUrl);
    const model = modelOverride || this._getDefaultModel(provider || null);

    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;

    const messages = [{ role: 'system', content: this.systemPrompt }, ...this.conversation];

    for (let i = 0; i < 5; i++) {
      const payload = { model, messages, temperature: this.temperature, tools: TOOL_DEFINITIONS };

      let result;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 120000);
        const resp = await fetch(endpoint, {
          method: 'POST', headers, body: JSON.stringify(payload), signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!resp.ok) {
          const errText = await resp.text();
          log('error', `LLM API error ${resp.status}:`, errText.slice(0, 200));
          return `Error communicating with ${p}: ${resp.status}`;
        }
        result = await resp.json();
      } catch (e) {
        log('error', 'LLM request failed:', e.message);
        return `Error: Could not reach ${p}. Check connection and API key.`;
      }

      const choice = (result.choices || [{}])[0];
      const msg = choice.message || {};

      if (msg.tool_calls) {
        messages.push(msg);
        for (const tc of msg.tool_calls) {
          const fnName = tc.function.name;
          let fnArgs = {};
          try { fnArgs = JSON.parse(tc.function.arguments || '{}'); } catch {}
          const toolResult = await this._executeTool(fnName, fnArgs, haClient);
          messages.push({
            role: 'tool', tool_call_id: tc.id,
            content: JSON.stringify(toolResult),
          });
        }
        continue;
      }

      const content = msg.content || '';
      this.conversation.push({ role: 'assistant', content });
      return content;
    }
    return "I've reached the maximum tool calls for this request. Please try again.";
  }

  async _chatOllama(haClient, apiUrl, modelOverride) {
    const base = apiUrl || this.apiUrl || 'http://homeassistant:11434';
    const endpoint = `${base}/api/chat`;
    const model = modelOverride || this._getDefaultModel();

    const messages = [{ role: 'system', content: this.systemPrompt }, ...this.conversation];

    for (let i = 0; i < 5; i++) {
      const payload = { model, messages, stream: false, tools: TOOL_DEFINITIONS };

      let result;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 180000);
        const resp = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload), signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!resp.ok) {
          const errText = await resp.text();
          log('error', `Ollama error ${resp.status}:`, errText.slice(0, 200));
          return `Error communicating with Ollama: ${resp.status}`;
        }
        result = await resp.json();
      } catch (e) {
        log('error', 'Ollama request failed:', e.message);
        return `Error: Could not reach Ollama at ${base}. Is the Ollama add-on running?`;
      }

      const msg = result.message || {};
      const toolCalls = msg.tool_calls;

      if (toolCalls) {
        messages.push(msg);
        for (const tc of toolCalls) {
          const fn = tc.function || {};
          let fnArgs = fn.arguments || {};
          if (typeof fnArgs === 'string') {
            try { fnArgs = JSON.parse(fnArgs); } catch {}
          }
          const toolResult = await this._executeTool(fn.name || '', fnArgs, haClient);
          messages.push({ role: 'tool', content: JSON.stringify(toolResult) });
        }
        continue;
      }

      const content = msg.content || '';
      this.conversation.push({ role: 'assistant', content });
      return content;
    }
    return 'Maximum tool calls reached. Please try again.';
  }

  async _chatAnthropic(haClient, apiKey, modelOverride) {
    const endpoint = 'https://api.anthropic.com/v1/messages';
    const model = modelOverride || this._getDefaultModel();
    const key = apiKey || this.apiKey;

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    };

    const tools = TOOL_DEFINITIONS.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));

    const messages = [...this.conversation];

    for (let i = 0; i < 5; i++) {
      const payload = {
        model, max_tokens: 4096, system: this.systemPrompt,
        messages, tools, temperature: this.temperature,
      };

      let result;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 120000);
        const resp = await fetch(endpoint, {
          method: 'POST', headers, body: JSON.stringify(payload), signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!resp.ok) {
          const errText = await resp.text();
          log('error', `Anthropic error ${resp.status}:`, errText.slice(0, 200));
          return `Error communicating with Anthropic: ${resp.status}`;
        }
        result = await resp.json();
      } catch (e) {
        log('error', 'Anthropic request failed:', e.message);
        return 'Error: Could not reach Anthropic API.';
      }

      const contentBlocks = result.content || [];
      const stopReason = result.stop_reason || '';

      if (stopReason === 'tool_use') {
        messages.push({ role: 'assistant', content: contentBlocks });
        const toolResults = [];
        for (const block of contentBlocks) {
          if (block.type === 'tool_use') {
            const toolResult = await this._executeTool(block.name, block.input || {}, haClient);
            toolResults.push({
              type: 'tool_result', tool_use_id: block.id,
              content: JSON.stringify(toolResult),
            });
          }
        }
        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      let text = '';
      for (const block of contentBlocks) {
        if (block.type === 'text') text += block.text || '';
      }
      this.conversation.push({ role: 'assistant', content: text });
      return text;
    }
    return 'Maximum tool calls reached.';
  }

  async _executeTool(name, args, haClient) {
    log('info', `Tool call: ${name}(${JSON.stringify(args).slice(0, 200)})`);

    try {
      if (name === 'ha_get_states') {
        let states = await haClient.getStates();
        const domain = args.domain || '';
        if (domain) states = states.filter(s => (s.entity_id || '').startsWith(`${domain}.`));
        const compact = states.map(s => ({
          entity_id: s.entity_id, state: s.state,
          name: (s.attributes || {}).friendly_name || '',
        }));
        return { entities: compact, count: compact.length };
      }

      if (name === 'ha_get_state') {
        const state = await haClient.getState(args.entity_id || '');
        return state || { error: `Entity not found: ${args.entity_id}` };
      }

      if (name === 'ha_call_service') {
        const data = args.data || {};
        if (args.entity_id) data.entity_id = args.entity_id;
        const result = await haClient.callService(args.domain || '', args.service || '', data);
        return { success: true, domain: args.domain, service: args.service, result: String(result).slice(0, 200) };
      }

      if (name === 'ha_fire_event') {
        return await haClient.fireEvent(args.event_type || '', args.data || {});
      }

      if (name === 'ha_get_history') {
        const history = await haClient.getHistory(args.entity_id || '', args.hours || 24);
        const entries = [];
        for (const group of history) {
          const items = Array.isArray(group) ? group : [group];
          for (const entry of items) {
            entries.push({ state: entry.state, last_changed: entry.last_changed });
          }
        }
        return { entity_id: args.entity_id, history: entries.slice(-50), total: entries.length };
      }

      return { error: `Unknown tool: ${name}` };
    } catch (e) {
      log('error', 'Tool execution error:', e.message);
      return { error: e.message };
    }
  }

  clearConversation() {
    this.conversation = [];
  }
}

// ── WebUI HTML ─────────────────────────────────────────────────────

const WEBUI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZeroClaw — Smart Home AI</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#1a1a2e;color:#e0e0e0;height:100vh;display:flex;flex-direction:column}
.header{background:#16213e;padding:12px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #0f3460}
.header h1{font-size:18px;color:#e94560;font-weight:700}
.header .status{font-size:12px;padding:3px 10px;border-radius:12px;background:#0f3460;color:#94a3b8}
.header .status.online{background:#064e3b;color:#6ee7b7}
.main{display:flex;flex:1;overflow:hidden}
.sidebar{width:280px;background:#16213e;border-right:1px solid #0f3460;display:flex;flex-direction:column;overflow:hidden}
.sidebar h2{padding:12px 16px 8px;font-size:14px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px}
.sidebar .search{margin:0 12px 8px;padding:8px 12px;border-radius:8px;border:1px solid #0f3460;background:#1a1a2e;color:#e0e0e0;font-size:13px}
.entity-list{flex:1;overflow-y:auto;padding:0 8px}
.entity{padding:8px 12px;margin:2px 0;border-radius:6px;cursor:pointer;font-size:13px;display:flex;justify-content:space-between;align-items:center}
.entity:hover{background:#0f3460}
.entity .name{color:#e0e0e0}.entity .state{color:#94a3b8;font-size:12px}
.chat-area{flex:1;display:flex;flex-direction:column}
.messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
.msg{max-width:85%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5;word-wrap:break-word;white-space:pre-wrap}
.msg.user{align-self:flex-end;background:#e94560;color:white;border-bottom-right-radius:4px}
.msg.assistant{align-self:flex-start;background:#16213e;border:1px solid #0f3460;border-bottom-left-radius:4px}
.msg.system{align-self:center;background:transparent;color:#64748b;font-size:12px;font-style:italic}
.typing{align-self:flex-start;color:#64748b;font-size:13px;padding:8px 0;display:none}
.quick-actions{padding:8px 16px;display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid #0f3460}
.quick-btn{padding:5px 12px;border-radius:16px;border:1px solid #0f3460;background:#16213e;color:#94a3b8;font-size:12px;cursor:pointer;transition:all .2s}
.quick-btn:hover{background:#0f3460;color:#e0e0e0;border-color:#e94560}
.input-area{padding:12px 16px;background:#16213e;border-top:1px solid #0f3460;display:flex;gap:8px;align-items:flex-end}
.input-area textarea{flex:1;padding:10px 14px;border-radius:12px;border:1px solid #0f3460;background:#1a1a2e;color:#e0e0e0;font-size:14px;font-family:inherit;resize:none;max-height:120px;line-height:1.4}
.input-area textarea:focus{outline:none;border-color:#e94560}
.input-area button{padding:10px 20px;border-radius:12px;border:none;background:#e94560;color:white;font-weight:600;cursor:pointer;font-size:14px;white-space:nowrap}
.input-area button:hover{background:#c81e45}
.input-area button:disabled{background:#4a4a5a;cursor:not-allowed}
@media(max-width:768px){.sidebar{display:none}.main{flex-direction:column}}
</style>
</head>
<body>
<div class="header">
<h1>&#129302; ZeroClaw</h1>
<span class="status" id="status">Connecting...</span>
</div>
<div class="main">
<div class="sidebar">
<h2>Entities</h2>
<input class="search" id="entitySearch" type="text" placeholder="Search entities...">
<div class="entity-list" id="entityList"></div>
</div>
<div class="chat-area">
<div class="messages" id="messages">
<div class="msg system">Welcome to ZeroClaw! Ask me anything about your smart home.</div>
</div>
<div class="typing" id="typing">ZeroClaw is thinking...</div>
<div class="quick-actions">
<button class="quick-btn" onclick="sendQuick('What lights are on?')">&#128161; Lights?</button>
<button class="quick-btn" onclick="sendQuick('What is the temperature?')">&#127777; Temperature</button>
<button class="quick-btn" onclick="sendQuick('Turn off all lights')">&#128268; All off</button>
<button class="quick-btn" onclick="sendQuick('Show open doors and windows')">&#128682; Doors</button>
<button class="quick-btn" onclick="sendQuick('List all devices')">&#128203; Devices</button>
</div>
<div class="input-area">
<textarea id="input" rows="1" placeholder="Ask ZeroClaw..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage()}"></textarea>
<button id="sendBtn" onclick="sendMessage()">Send</button>
</div>
</div>
</div>
<script>
const BASE = window.location.pathname.replace(/\\/ha\\/ui\\/?$/, '');
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const typingEl = document.getElementById('typing');
const statusEl = document.getElementById('status');
const entityList = document.getElementById('entityList');
const entitySearch = document.getElementById('entitySearch');

async function checkStatus() {
  try {
    const r = await fetch(BASE + '/ha/status');
    const d = await r.json();
    statusEl.textContent = d.ha_connected ? 'Connected' : 'HA Disconnected';
    statusEl.className = 'status ' + (d.ha_connected ? 'online' : '');
  } catch { statusEl.textContent = 'Offline'; statusEl.className = 'status'; }
}

let allEntities = [];
async function loadEntities() {
  try {
    const r = await fetch(BASE + '/ha/entities');
    allEntities = await r.json();
    renderEntities(allEntities);
  } catch {}
}

function renderEntities(entities) {
  const search = entitySearch.value.toLowerCase();
  const filtered = entities.filter(e =>
    e.entity_id.toLowerCase().includes(search) ||
    (e.name || '').toLowerCase().includes(search)
  );
  entityList.innerHTML = filtered.slice(0, 100).map(e =>
    '<div class="entity" onclick="sendQuick(\\'What is the state of ' + e.entity_id + '?\\')">' +
    '<span class="name">' + (e.name || e.entity_id) + '</span>' +
    '<span class="state">' + e.state + '</span></div>'
  ).join('');
}

entitySearch.addEventListener('input', () => renderEntities(allEntities));

function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.textContent = content;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = '';
  inputEl.style.height = 'auto';
  addMessage('user', text);
  typingEl.style.display = 'block';
  document.getElementById('sendBtn').disabled = true;
  try {
    const r = await fetch(BASE + '/ha/chat', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message: text})
    });
    const d = await r.json();
    addMessage('assistant', d.response || d.error || 'No response');
  } catch (e) { addMessage('system', 'Error: ' + e.message); }
  typingEl.style.display = 'none';
  document.getElementById('sendBtn').disabled = false;
  loadEntities();
}

function sendQuick(text) { inputEl.value = text; sendMessage(); }

inputEl.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

checkStatus(); loadEntities();
setInterval(checkStatus, 30000);
setInterval(loadEntities, 60000);
</script>
</body>
</html>`;

// ── HTTP Server ────────────────────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendHTML(res, html) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}

function main() {
  const options = loadOptions();
  const logLevel = (options.log_level || 'info').toUpperCase();
  log('info', 'ZeroClaw HA Add-on starting...');
  log('info', '  Provider:', options.provider);
  log('info', '  Model:', options.model || 'auto');
  log('info', '  Fallback:', options.fallback_provider || 'none', `(${options.fallback_model || 'auto'})`);
  log('info', '  Event listener:', options.event_listener);
  log('info', '  MQTT:', options.mqtt_enabled);

  const haClient = new HomeAssistantClient(options);
  const llmClient = new LLMClient(options);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const method = req.method;

    try {
      // GET /health
      if (method === 'GET' && pathname === '/health') {
        return sendJSON(res, { status: 'ok', addon: 'zeroclaw', version: VERSION });
      }

      // GET /ha/status
      if (method === 'GET' && pathname === '/ha/status') {
        const connected = await haClient.healthCheck();
        return sendJSON(res, {
          ha_connected: connected,
          provider: options.provider || 'unknown',
          model: options.model || 'auto',
          fallback_provider: options.fallback_provider || 'none',
          fallback_model: options.fallback_model || '',
        });
      }

      // GET /ha/entities
      if (method === 'GET' && pathname === '/ha/entities') {
        const states = await haClient.getStates();
        const entities = states.map(s => ({
          entity_id: s.entity_id,
          state: s.state,
          name: (s.attributes || {}).friendly_name || '',
          domain: (s.entity_id || '').split('.')[0],
        }));
        return sendJSON(res, entities);
      }

      // POST /ha/chat
      if (method === 'POST' && pathname === '/ha/chat') {
        const body = await parseBody(req);
        const message = (body.message || '').trim();
        if (!message) return sendJSON(res, { error: 'Empty message' }, 400);
        const response = await llmClient.chat(message, haClient);
        return sendJSON(res, { response });
      }

      // GET /ha/ui
      if (method === 'GET' && (pathname === '/ha/ui' || pathname === '/ha/ui/')) {
        return sendHTML(res, WEBUI_HTML);
      }

      // POST /webhook
      if (method === 'POST' && pathname === '/webhook') {
        const body = await parseBody(req);
        const message = (body.message || '').trim();
        if (!message) return sendJSON(res, { error: 'Empty message' }, 400);
        const response = await llmClient.chat(message, haClient);
        return sendJSON(res, { response });
      }

      // POST /ha/clear
      if (method === 'POST' && pathname === '/ha/clear') {
        llmClient.clearConversation();
        return sendJSON(res, { status: 'conversation cleared' });
      }

      // 404
      sendJSON(res, { error: 'Not found' }, 404);

    } catch (e) {
      log('error', 'Request error:', e.message);
      sendJSON(res, { error: 'Internal server error' }, 500);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    log('info', `ZeroClaw server running on 0.0.0.0:${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => { log('info', 'SIGTERM received, shutting down...'); server.close(); process.exit(0); });
  process.on('SIGINT', () => { log('info', 'SIGINT received, shutting down...'); server.close(); process.exit(0); });
}

main();
