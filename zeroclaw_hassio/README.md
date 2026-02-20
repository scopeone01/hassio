# ZeroClaw Home Assistant Add-on

Autonomous AI agent for Home Assistant — control your smart home with natural language.

## Features

- **Natural Language Control** — "Turn on the kitchen lights", "Set the thermostat to 22°C", "What sensors are triggered?"
- **All LLM Providers** — OpenAI, Anthropic, Ollama (local), OpenRouter, Google Gemini, and more
- **Device Control** — Lights, switches, climate, covers, media players, fans, scenes, scripts, automations
- **Event Listener** — Reacts to Home Assistant events (motions, state changes, automations)
- **MQTT Integration** — Real-time state caching via Mosquitto add-on
- **Web UI Panel** — Chat interface embedded in the HA sidebar via Ingress
- **Memory** — Remembers preferences and past conversations (SQLite-backed)
- **All ZeroClaw Channels** — Also connect via Telegram, Discord, Slack, and 10+ more platforms

## Installation

### Option 1: Add Repository to Home Assistant

1. Go to **Settings** → **Add-ons** → **Add-on Store**
2. Click **⋮** (top right) → **Repositories**
3. Add: `https://github.com/zeroclaw-labs/zeroclaw-ha-addon`
4. Find "ZeroClaw AI Agent" in the store and click **Install**

### Option 2: Local Development

1. Clone this repository into `/addons/zeroclaw/` on your HA host
2. Go to **Settings** → **Add-ons** → **Add-on Store**
3. Click **⋮** → **Check for updates**
4. Install "ZeroClaw AI Agent" from **Local add-ons**

## Configuration

After installation, click the add-on → **Configuration** tab:

| Option | Description | Default |
|--------|-------------|---------|
| `provider` | LLM provider (`ollama`, `openai`, `openrouter`, `anthropic`, `gemini`) | `ollama` |
| `model` | Model name (e.g. `llama3`, `gpt-4o`, `claude-sonnet-4-20250514`) | auto |
| `api_key` | API key for cloud providers | — |
| `api_url` | API URL override (e.g. `http://homeassistant:11434` for Ollama) | — |
| `temperature` | Model temperature (0.0–2.0) | `0.7` |
| `system_prompt` | Custom system prompt for the agent | smart home default |
| `allowed_domains` | Entity domains the agent can control | lights, switches, climate, etc. |
| `event_listener` | React to HA events (state_changed) | `true` |
| `mqtt_enabled` | Enable MQTT state caching | `false` |
| `mqtt_broker` | MQTT broker hostname | `core-mosquitto` |
| `log_level` | Logging level | `info` |

### Using with Ollama (Local LLM)

For a fully local setup with no cloud dependency:

1. Install the **Ollama** add-on from the HA store
2. Set `provider: ollama` and `api_url: http://homeassistant:11434`
3. Pull a model: `ollama pull llama3` (via Ollama terminal)
4. Set `model: llama3`

### Using with OpenAI / OpenRouter

1. Set `provider: openai` (or `openrouter`)
2. Enter your `api_key`
3. Set `model: gpt-4o` (or your preferred model)

## Usage

After starting the add-on, a **ZeroClaw** panel appears in your HA sidebar.

### Chat Examples

- "Turn on the living room lights"
- "What's the temperature in the bedroom?"
- "Set the thermostat to 22 degrees"
- "Turn off all lights except the hallway"
- "What was the last motion detected?"
- "Show me the history of the front door sensor"
- "When was the garage door last opened?"

### Automation Integration

The agent can also react to HA events automatically. When `event_listener` is enabled,
state changes (e.g. motion detected, door opened) are sent to the agent for processing.

You can also trigger the agent from HA automations using the webhook endpoint:

```yaml
# In your automations.yaml
- alias: "Ask ZeroClaw about motion"
  trigger:
    - platform: state
      entity_id: binary_sensor.hallway_motion
      to: "on"
  action:
    - service: rest_command.zeroclaw_webhook
      data:
        message: "Motion detected in the hallway. What should I do?"
```

## Architecture

```
┌─────────────────────────────────────┐
│ Home Assistant Supervisor           │
│   ┌───────────────────────────────┐ │
│   │ ZeroClaw Add-on Container     │ │
│   │                               │ │
│   │  zeroclaw daemon              │ │
│   │   ├── Gateway :3000           │ │
│   │   │    ├── /ha/ui (WebUI)     │ │
│   │   │    ├── /ha/chat           │ │
│   │   │    ├── /ha/entities       │ │
│   │   │    ├── /webhook           │ │
│   │   │    └── /health            │ │
│   │   │                           │ │
│   │   ├── HA Tools                │ │
│   │   │    ├── ha_get_state       │ │
│   │   │    ├── ha_get_states      │ │
│   │   │    ├── ha_call_service    │ │
│   │   │    ├── ha_fire_event      │ │
│   │   │    ├── ha_get_services    │ │
│   │   │    └── ha_get_history     │ │
│   │   │                           │ │
│   │   ├── HA Event Channel        │ │
│   │   │    └── WebSocket listener │ │
│   │   │                           │ │
│   │   └── MQTT Cache (optional)   │ │
│   │        └── Mosquitto broker   │ │
│   └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Security

- The agent only controls entity domains listed in `allowed_domains`
- Authentication uses the HA Supervisor token (injected automatically)
- The WebUI is only accessible through HA Ingress (authenticated by HA)
- No external ports are exposed by default
- All API keys are stored encrypted

## Support

- [ZeroClaw Documentation](https://github.com/zeroclaw-labs/zeroclaw/tree/main/docs)
- [Issue Tracker](https://github.com/zeroclaw-labs/zeroclaw/issues)
- [Discord Community](https://discord.gg/zeroclaw)
