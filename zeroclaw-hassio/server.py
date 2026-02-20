"""
ZeroClaw Home Assistant Add-on — Main Server

Lightweight Python bridge between Home Assistant and LLM providers.
Provides: Chat API, Entity tools, Event listener, WebUI panel.
"""

import asyncio
import json
import logging
import os
import sys
from pathlib import Path

import aiohttp
from aiohttp import web

# ── Configuration ────────────────────────────────────────────────────

OPTIONS_PATH = "/data/options.json"
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

logger = logging.getLogger("zeroclaw")


def load_options() -> dict:
    """Load add-on options from HA Supervisor."""
    if Path(OPTIONS_PATH).exists():
        with open(OPTIONS_PATH) as f:
            return json.load(f)
    # Fallback for local development
    return {
        "provider": os.environ.get("ZEROCLAW_PROVIDER", "ollama"),
        "model": os.environ.get("ZEROCLAW_MODEL", ""),
        "api_key": os.environ.get("ZEROCLAW_API_KEY", ""),
        "api_url": os.environ.get("ZEROCLAW_API_URL", "http://localhost:11434"),
        "temperature": float(os.environ.get("ZEROCLAW_TEMPERATURE", "0.7")),
        "system_prompt": os.environ.get("ZEROCLAW_SYSTEM_PROMPT", ""),
        "allowed_domains": ["light", "switch", "climate", "cover", "media_player",
                            "fan", "scene", "script", "automation",
                            "input_boolean", "input_number", "input_select"],
        "event_listener": True,
        "event_filter": ["state_changed"],
        "mqtt_enabled": False,
        "mqtt_broker": "core-mosquitto",
        "mqtt_port": 1883,
        "mqtt_username": "",
        "mqtt_password": "",
        "log_level": "info",
    }


# ── Home Assistant API Client ────────────────────────────────────────

class HomeAssistantClient:
    """REST client for the HA Supervisor/Core API."""

    def __init__(self, options: dict):
        self.supervisor_token = os.environ.get("SUPERVISOR_TOKEN", "")
        self.ha_token = options.get("api_key_ha", self.supervisor_token)
        # Inside add-on: http://supervisor/core/api
        # Standalone: user-provided URL
        if self.supervisor_token:
            self.base_url = "http://supervisor/core/api"
        else:
            self.base_url = options.get("api_url", "http://homeassistant:8123") + "/api"
        self.allowed_domains = set(options.get("allowed_domains", []))
        self.session: aiohttp.ClientSession | None = None

    async def start(self):
        headers = {}
        if self.supervisor_token:
            headers["Authorization"] = f"Bearer {self.supervisor_token}"
        elif self.ha_token:
            headers["Authorization"] = f"Bearer {self.ha_token}"
        self.session = aiohttp.ClientSession(headers=headers)

    async def stop(self):
        if self.session:
            await self.session.close()

    def is_domain_allowed(self, entity_id: str) -> bool:
        if not self.allowed_domains:
            return True
        domain = entity_id.split(".")[0] if "." in entity_id else ""
        return domain in self.allowed_domains

    async def get_states(self) -> list[dict]:
        async with self.session.get(f"{self.base_url}/states") as resp:
            if resp.status == 200:
                states = await resp.json()
                if self.allowed_domains:
                    states = [s for s in states if self.is_domain_allowed(s.get("entity_id", ""))]
                return states
            logger.error("Failed to get states: %s", resp.status)
            return []

    async def get_state(self, entity_id: str) -> dict | None:
        if not self.is_domain_allowed(entity_id):
            return {"error": f"Domain not allowed: {entity_id}"}
        async with self.session.get(f"{self.base_url}/states/{entity_id}") as resp:
            if resp.status == 200:
                return await resp.json()
            return None

    async def call_service(self, domain: str, service: str, data: dict = None) -> dict:
        if self.allowed_domains and domain not in self.allowed_domains:
            return {"error": f"Domain not allowed: {domain}"}
        payload = data or {}
        async with self.session.post(
            f"{self.base_url}/services/{domain}/{service}", json=payload
        ) as resp:
            if resp.status == 200:
                return await resp.json()
            text = await resp.text()
            return {"error": f"Service call failed ({resp.status}): {text}"}

    async def fire_event(self, event_type: str, data: dict = None) -> dict:
        payload = data or {}
        async with self.session.post(
            f"{self.base_url}/events/{event_type}", json=payload
        ) as resp:
            if resp.status == 200:
                return await resp.json()
            return {"error": f"Fire event failed: {resp.status}"}

    async def get_services(self) -> list[dict]:
        async with self.session.get(f"{self.base_url}/services") as resp:
            if resp.status == 200:
                return await resp.json()
            return []

    async def get_history(self, entity_id: str, hours: int = 24) -> list:
        import datetime
        start = (datetime.datetime.now(datetime.timezone.utc) -
                 datetime.timedelta(hours=hours)).isoformat()
        url = f"{self.base_url}/history/period/{start}?filter_entity_id={entity_id}"
        async with self.session.get(url) as resp:
            if resp.status == 200:
                return await resp.json()
            return []

    async def health_check(self) -> bool:
        try:
            async with self.session.get(f"{self.base_url}/") as resp:
                return resp.status == 200
        except Exception:
            return False


# ── LLM Provider Client ─────────────────────────────────────────────

class LLMClient:
    """Unified LLM API client supporting multiple providers."""

    TOOL_DEFINITIONS = [
        {
            "type": "function",
            "function": {
                "name": "ha_get_states",
                "description": "Get all Home Assistant entity states. Optionally filter by domain.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "domain": {"type": "string", "description": "Filter by domain (e.g. 'light', 'switch'). Empty = all."}
                    }
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "ha_get_state",
                "description": "Get state and attributes of a specific Home Assistant entity.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "entity_id": {"type": "string", "description": "The entity ID, e.g. 'light.kitchen'"}
                    },
                    "required": ["entity_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "ha_call_service",
                "description": "Call a Home Assistant service to control a device. E.g. turn_on a light, set_temperature on climate.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "domain": {"type": "string", "description": "Service domain (e.g. 'light', 'switch', 'climate')"},
                        "service": {"type": "string", "description": "Service name (e.g. 'turn_on', 'turn_off', 'set_temperature')"},
                        "entity_id": {"type": "string", "description": "Target entity ID"},
                        "data": {"type": "object", "description": "Additional service data (e.g. brightness, temperature)"}
                    },
                    "required": ["domain", "service", "entity_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "ha_fire_event",
                "description": "Fire a custom Home Assistant event.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "event_type": {"type": "string", "description": "Event type name"},
                        "data": {"type": "object", "description": "Event data payload"}
                    },
                    "required": ["event_type"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "ha_get_history",
                "description": "Get the state history of a Home Assistant entity.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "entity_id": {"type": "string", "description": "Entity ID to get history for"},
                        "hours": {"type": "integer", "description": "Hours of history (default: 24)"}
                    },
                    "required": ["entity_id"]
                }
            }
        },
    ]

    def __init__(self, options: dict):
        self.provider = options.get("provider", "ollama")
        self.model = options.get("model", "")
        self.api_key = options.get("api_key", "")
        self.api_url = options.get("api_url", "")
        self.temperature = options.get("temperature", 0.7)
        self.system_prompt = options.get("system_prompt", "") or (
            "You are ZeroClaw, a helpful smart home AI assistant running inside Home Assistant. "
            "Use the ha_* tools to control devices, check states, and answer questions about the home. "
            "Be concise and helpful. When controlling devices, confirm the action taken."
        )
        # Fallback provider config
        self.fallback_provider = options.get("fallback_provider", "none")
        self.fallback_model = options.get("fallback_model", "")
        self.fallback_api_key = options.get("fallback_api_key", "")
        self.fallback_api_url = options.get("fallback_api_url", "")
        self.session: aiohttp.ClientSession | None = None
        self.conversation: list[dict] = []

    async def start(self):
        self.session = aiohttp.ClientSession()

    async def stop(self):
        if self.session:
            await self.session.close()

    def _get_endpoint(self, provider: str = None, api_url: str = None) -> str:
        p = provider or self.provider
        url = api_url or self.api_url
        if p == "ollama":
            base = url or "http://homeassistant:11434"
            return f"{base}/api/chat"
        elif p == "openai":
            return url or "https://api.openai.com/v1/chat/completions"
        elif p == "codex":
            return url or "https://api.openai.com/v1/chat/completions"
        elif p == "openrouter":
            return url or "https://openrouter.ai/api/v1/chat/completions"
        elif p == "anthropic":
            return url or "https://api.anthropic.com/v1/messages"
        elif p == "gemini":
            model = self.model or "gemini-2.0-flash"
            return url or f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        elif p == "minimax":
            return url or "https://api.minimaxi.chat/v1/chat/completions"
        elif p == "zai":
            return url or "https://open.bigmodel.cn/api/paas/v4/chat/completions"
        else:
            return url or "https://api.openai.com/v1/chat/completions"

    def _get_default_model(self, provider: str = None) -> str:
        p = provider or self.provider
        if provider and self.fallback_model:
            return self.fallback_model
        if not provider and self.model:
            return self.model
        defaults = {
            "ollama": "llama3",
            "openai": "gpt-4o",
            "codex": "codex-mini-latest",
            "openrouter": "anthropic/claude-sonnet-4-20250514",
            "anthropic": "claude-sonnet-4-20250514",
            "gemini": "gemini-2.0-flash",
            "minimax": "MiniMax-M1",
            "zai": "glm-4-plus",
        }
        return defaults.get(p, "gpt-4o")

    async def chat(self, message: str, ha_client: "HomeAssistantClient") -> str:
        """Send message to LLM with tool-calling support and fallback."""
        self.conversation.append({"role": "user", "content": message})

        # Limit conversation history
        if len(self.conversation) > 40:
            self.conversation = self.conversation[-30:]

        # Try primary provider
        try:
            result = await self._dispatch_chat(self.provider, self.api_key, self.api_url, self.model, ha_client)
            if result and not result.startswith("Error"):
                return result
            raise RuntimeError(result or "Empty response from primary provider")
        except Exception as primary_err:
            logger.warning("Primary provider (%s) failed: %s", self.provider, primary_err)

            # Try fallback if configured
            if self.fallback_provider and self.fallback_provider != "none":
                logger.info("Switching to fallback provider: %s", self.fallback_provider)
                try:
                    result = await self._dispatch_chat(
                        self.fallback_provider, self.fallback_api_key,
                        self.fallback_api_url, self.fallback_model, ha_client
                    )
                    if result:
                        return f"[Fallback: {self.fallback_provider}] {result}"
                except Exception as fb_err:
                    logger.error("Fallback provider (%s) also failed: %s", self.fallback_provider, fb_err)

            return f"Error: {self.provider} failed ({primary_err}). No working fallback available."

    async def _dispatch_chat(self, provider: str, api_key: str, api_url: str,
                              model: str, ha_client: "HomeAssistantClient") -> str:
        """Route to the correct chat method for a given provider."""
        if provider == "ollama":
            return await self._chat_ollama(ha_client, api_url=api_url, model_override=model)
        elif provider == "anthropic":
            return await self._chat_anthropic(ha_client, api_key=api_key, model_override=model)
        elif provider in ("openai", "openrouter", "minimax", "zai", "codex", "gemini"):
            return await self._chat_openai_compatible(
                ha_client, provider=provider, api_key=api_key,
                api_url=api_url, model_override=model
            )
        else:
            return await self._chat_openai_compatible(
                ha_client, provider=provider, api_key=api_key,
                api_url=api_url, model_override=model
            )

    async def _chat_openai_compatible(self, ha_client: "HomeAssistantClient",
                                       provider: str = None, api_key: str = None,
                                       api_url: str = None, model_override: str = None) -> str:
        """OpenAI / OpenRouter / MiniMax / Z.AI / Codex / generic OpenAI-compatible API."""
        p = provider or self.provider
        key = api_key or self.api_key
        endpoint = self._get_endpoint(provider=p, api_url=api_url)
        model = model_override or self._get_default_model(provider=p if provider else None)

        headers = {"Content-Type": "application/json"}
        if key:
            headers["Authorization"] = f"Bearer {key}"

        messages = [{"role": "system", "content": self.system_prompt}] + self.conversation

        # Tool-calling loop
        for _ in range(5):  # Max 5 tool calls per turn
            payload = {
                "model": model,
                "messages": messages,
                "temperature": self.temperature,
                "tools": self.TOOL_DEFINITIONS,
            }

            try:
                async with self.session.post(endpoint, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=120)) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        logger.error("LLM API error %s: %s", resp.status, error_text[:200])
                        return f"Error communicating with {p}: {resp.status}"
                    result = await resp.json()
            except Exception as e:
                logger.error("LLM request failed: %s", e)
                return f"Error: Could not reach {p}. Check connection and API key."

            choice = result.get("choices", [{}])[0]
            msg = choice.get("message", {})

            # Check for tool calls
            tool_calls = msg.get("tool_calls")
            if tool_calls:
                messages.append(msg)
                for tc in tool_calls:
                    fn_name = tc["function"]["name"]
                    fn_args = json.loads(tc["function"].get("arguments", "{}"))
                    tool_result = await self._execute_tool(fn_name, fn_args, ha_client)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": json.dumps(tool_result, default=str)
                    })
                continue  # Let model process tool results

            # Final text response
            content = msg.get("content", "")
            self.conversation.append({"role": "assistant", "content": content})
            return content

        return "I've reached the maximum tool calls for this request. Please try again."

    async def _chat_ollama(self, ha_client: "HomeAssistantClient",
                            api_url: str = None, model_override: str = None) -> str:
        """Ollama API (slightly different format)."""
        base = api_url or self.api_url or "http://homeassistant:11434"
        endpoint = f"{base}/api/chat"
        model = model_override or self._get_default_model()

        messages = [{"role": "system", "content": self.system_prompt}] + self.conversation

        for _ in range(5):
            payload = {
                "model": model,
                "messages": messages,
                "stream": False,
                "tools": self.TOOL_DEFINITIONS,
            }

            try:
                async with self.session.post(endpoint, json=payload, timeout=aiohttp.ClientTimeout(total=180)) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        logger.error("Ollama error %s: %s", resp.status, error_text[:200])
                        return f"Error communicating with Ollama: {resp.status}"
                    result = await resp.json()
            except Exception as e:
                logger.error("Ollama request failed: %s", e)
                return f"Error: Could not reach Ollama at {base}. Is the Ollama add-on running?"

            msg = result.get("message", {})
            tool_calls = msg.get("tool_calls")

            if tool_calls:
                messages.append(msg)
                for tc in tool_calls:
                    fn = tc.get("function", {})
                    fn_name = fn.get("name", "")
                    fn_args = fn.get("arguments", {})
                    if isinstance(fn_args, str):
                        fn_args = json.loads(fn_args)
                    tool_result = await self._execute_tool(fn_name, fn_args, ha_client)
                    messages.append({
                        "role": "tool",
                        "content": json.dumps(tool_result, default=str)
                    })
                continue

            content = msg.get("content", "")
            self.conversation.append({"role": "assistant", "content": content})
            return content

        return "Maximum tool calls reached. Please try again."

    async def _chat_anthropic(self, ha_client: "HomeAssistantClient",
                               api_key: str = None, model_override: str = None) -> str:
        """Anthropic Claude API."""
        endpoint = "https://api.anthropic.com/v1/messages"
        model = model_override or self._get_default_model()
        key = api_key or self.api_key

        headers = {
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
        }

        # Convert tool definitions to Anthropic format
        tools = []
        for t in self.TOOL_DEFINITIONS:
            fn = t["function"]
            tools.append({
                "name": fn["name"],
                "description": fn["description"],
                "input_schema": fn["parameters"],
            })

        messages = list(self.conversation)

        for _ in range(5):
            payload = {
                "model": model,
                "max_tokens": 4096,
                "system": self.system_prompt,
                "messages": messages,
                "tools": tools,
                "temperature": self.temperature,
            }

            try:
                async with self.session.post(endpoint, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=120)) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        logger.error("Anthropic error %s: %s", resp.status, error_text[:200])
                        return f"Error communicating with Anthropic: {resp.status}"
                    result = await resp.json()
            except Exception as e:
                logger.error("Anthropic request failed: %s", e)
                return f"Error: Could not reach Anthropic API."

            content_blocks = result.get("content", [])
            stop_reason = result.get("stop_reason", "")

            if stop_reason == "tool_use":
                messages.append({"role": "assistant", "content": content_blocks})
                tool_results = []
                for block in content_blocks:
                    if block.get("type") == "tool_use":
                        tool_result = await self._execute_tool(
                            block["name"], block.get("input", {}), ha_client
                        )
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block["id"],
                            "content": json.dumps(tool_result, default=str),
                        })
                messages.append({"role": "user", "content": tool_results})
                continue

            # Extract text response
            text = ""
            for block in content_blocks:
                if block.get("type") == "text":
                    text += block.get("text", "")
            self.conversation.append({"role": "assistant", "content": text})
            return text

        return "Maximum tool calls reached."

    async def _execute_tool(self, name: str, args: dict, ha_client: "HomeAssistantClient") -> dict:
        """Execute a tool call against Home Assistant."""
        logger.info("Tool call: %s(%s)", name, json.dumps(args, default=str)[:200])

        try:
            if name == "ha_get_states":
                states = await ha_client.get_states()
                domain = args.get("domain", "")
                if domain:
                    states = [s for s in states if s.get("entity_id", "").startswith(f"{domain}.")]
                # Compact output
                compact = []
                for s in states:
                    attrs = s.get("attributes", {})
                    compact.append({
                        "entity_id": s.get("entity_id"),
                        "state": s.get("state"),
                        "name": attrs.get("friendly_name", ""),
                    })
                return {"entities": compact, "count": len(compact)}

            elif name == "ha_get_state":
                entity_id = args.get("entity_id", "")
                state = await ha_client.get_state(entity_id)
                return state or {"error": f"Entity not found: {entity_id}"}

            elif name == "ha_call_service":
                domain = args.get("domain", "")
                service = args.get("service", "")
                entity_id = args.get("entity_id", "")
                data = args.get("data", {})
                if entity_id:
                    data["entity_id"] = entity_id
                result = await ha_client.call_service(domain, service, data)
                return {"success": True, "domain": domain, "service": service, "result": str(result)[:200]}

            elif name == "ha_fire_event":
                event_type = args.get("event_type", "")
                data = args.get("data", {})
                result = await ha_client.fire_event(event_type, data)
                return result

            elif name == "ha_get_history":
                entity_id = args.get("entity_id", "")
                hours = args.get("hours", 24)
                history = await ha_client.get_history(entity_id, hours)
                # Flatten and compact
                entries = []
                for group in history:
                    for entry in (group if isinstance(group, list) else [group]):
                        entries.append({
                            "state": entry.get("state"),
                            "last_changed": entry.get("last_changed"),
                        })
                return {"entity_id": entity_id, "history": entries[-50:], "total": len(entries)}

            else:
                return {"error": f"Unknown tool: {name}"}

        except Exception as e:
            logger.error("Tool execution error: %s", e)
            return {"error": str(e)}

    def clear_conversation(self):
        self.conversation.clear()


# ── Web Server (Gateway) ────────────────────────────────────────────

WEBUI_HTML = """<!DOCTYPE html>
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
<h1>🤖 ZeroClaw</h1>
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
<button class="quick-btn" onclick="sendQuick('What lights are on?')">💡 Lights?</button>
<button class="quick-btn" onclick="sendQuick('What is the temperature?')">🌡️ Temperature</button>
<button class="quick-btn" onclick="sendQuick('Turn off all lights')">🔌 All off</button>
<button class="quick-btn" onclick="sendQuick('Show open doors and windows')">🚪 Doors</button>
<button class="quick-btn" onclick="sendQuick('List all devices')">📋 Devices</button>
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

async function loadEntities() {
    try {
        const r = await fetch(BASE + '/ha/entities');
        const entities = await r.json();
        renderEntities(entities);
    } catch {}
}

function renderEntities(entities) {
    const search = entitySearch.value.toLowerCase();
    const filtered = entities.filter(e =>
        e.entity_id.toLowerCase().includes(search) ||
        (e.name || '').toLowerCase().includes(search)
    );
    entityList.innerHTML = filtered.slice(0, 100).map(e =>
        `<div class="entity" onclick="sendQuick('What is the state of ${e.entity_id}?')">
            <span class="name">${e.name || e.entity_id}</span>
            <span class="state">${e.state}</span>
        </div>`
    ).join('');
}

let allEntities = [];
entitySearch.addEventListener('input', () => renderEntities(allEntities));
fetch(BASE + '/ha/entities').then(r => r.json()).then(e => { allEntities = e; renderEntities(e); }).catch(() => {});

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
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message: text})
        });
        const d = await r.json();
        addMessage('assistant', d.response || d.error || 'No response');
    } catch (e) {
        addMessage('system', 'Error: ' + e.message);
    }
    typingEl.style.display = 'none';
    document.getElementById('sendBtn').disabled = false;
    loadEntities();
}

function sendQuick(text) { inputEl.value = text; sendMessage(); }

inputEl.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

checkStatus();
loadEntities();
setInterval(checkStatus, 30000);
setInterval(loadEntities, 60000);
</script>
</body>
</html>"""


async def create_app(options: dict) -> web.Application:
    """Create the aiohttp web application."""
    app = web.Application()

    # Initialize clients
    ha_client = HomeAssistantClient(options)
    llm_client = LLMClient(options)

    app["ha_client"] = ha_client
    app["llm_client"] = llm_client

    # ── Routes ───────────────────────────────────────────────────

    async def handle_health(request):
        return web.json_response({"status": "ok", "addon": "zeroclaw", "version": "0.3.0"})

    async def handle_ha_status(request):
        ha = request.app["ha_client"]
        connected = await ha.health_check()
        return web.json_response({
            "ha_connected": connected,
            "provider": options.get("provider", "unknown"),
            "model": options.get("model", "auto"),
            "fallback_provider": options.get("fallback_provider", "none"),
            "fallback_model": options.get("fallback_model", ""),
        })

    async def handle_ha_entities(request):
        ha = request.app["ha_client"]
        states = await ha.get_states()
        entities = []
        for s in states:
            attrs = s.get("attributes", {})
            entities.append({
                "entity_id": s.get("entity_id"),
                "state": s.get("state"),
                "name": attrs.get("friendly_name", ""),
                "domain": s.get("entity_id", "").split(".")[0],
            })
        return web.json_response(entities)

    async def handle_ha_chat(request):
        data = await request.json()
        message = data.get("message", "").strip()
        if not message:
            return web.json_response({"error": "Empty message"}, status=400)

        ha = request.app["ha_client"]
        llm = request.app["llm_client"]

        response = await llm.chat(message, ha)
        return web.json_response({"response": response})

    async def handle_ha_ui(request):
        return web.Response(text=WEBUI_HTML, content_type="text/html")

    async def handle_webhook(request):
        data = await request.json()
        message = data.get("message", "").strip()
        if not message:
            return web.json_response({"error": "Empty message"}, status=400)

        ha = request.app["ha_client"]
        llm = request.app["llm_client"]
        response = await llm.chat(message, ha)
        return web.json_response({"response": response})

    async def handle_clear(request):
        request.app["llm_client"].clear_conversation()
        return web.json_response({"status": "conversation cleared"})

    # Register routes
    app.router.add_get("/health", handle_health)
    app.router.add_get("/ha/status", handle_ha_status)
    app.router.add_get("/ha/entities", handle_ha_entities)
    app.router.add_post("/ha/chat", handle_ha_chat)
    app.router.add_get("/ha/ui", handle_ha_ui)
    app.router.add_get("/ha/ui/", handle_ha_ui)
    app.router.add_post("/webhook", handle_webhook)
    app.router.add_post("/ha/clear", handle_clear)

    # Startup / shutdown hooks
    async def on_startup(app):
        await ha_client.start()
        await llm_client.start()
        logger.info("ZeroClaw started — provider=%s, model=%s",
                     options.get("provider"), options.get("model") or "auto")

    async def on_shutdown(app):
        await llm_client.stop()
        await ha_client.stop()

    app.on_startup.append(on_startup)
    app.on_shutdown.append(on_shutdown)

    return app


def main():
    options = load_options()

    log_level = getattr(logging, options.get("log_level", "info").upper(), logging.INFO)
    logging.basicConfig(level=log_level, format=LOG_FORMAT)

    logger.info("ZeroClaw HA Add-on starting...")
    logger.info("  Provider: %s", options.get("provider"))
    logger.info("  Model: %s", options.get("model") or "auto")
    logger.info("  Fallback: %s (%s)", options.get("fallback_provider", "none"),
                options.get("fallback_model") or "auto")
    logger.info("  Event listener: %s", options.get("event_listener"))
    logger.info("  MQTT: %s", options.get("mqtt_enabled"))

    app = asyncio.get_event_loop().run_until_complete(create_app(options))
    web.run_app(app, host="0.0.0.0", port=3000, print=lambda msg: logger.info(msg))


if __name__ == "__main__":
    main()
