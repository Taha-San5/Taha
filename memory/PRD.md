# MoltBot Installation PRD

## Overview
MoltBot was installed on the Emergent platform using the official install script from https://moltbot.emergent.to/install.sh

## Installation Date
February 22, 2026

## What's Been Implemented

### Session 1 — MoltBot Installation (Feb 22, 2026)
- MoltBot installed via official install script
- LLM key injected, frontend rebuilt, all services running

### Session 2 — Custom Provider Feature (Feb 22, 2026)
- Added "Custom (OpenAI-compatible)" option to the provider dropdown
- Frontend: new `baseUrl` (required) and `modelId` (optional) input fields appear when Custom is selected
- Backend: `OpenClawStartRequest` updated with `baseUrl` and `modelId` fields; new validation; `create_moltbot_config` handles `custom` provider case (openai-completions API with user-supplied base URL and model)
- `gateway_config.py` updated to export `CUSTOM_API_KEY` env var

## Service Status (Post-Install)
- **backend**: RUNNING
- **frontend**: RUNNING
- **mongodb**: RUNNING
- **nginx-code-proxy**: RUNNING

## Architecture
- React frontend (production build)
- FastAPI backend
- MongoDB database
- Nginx proxy

## References
- Tutorial: https://emergent.sh/tutorial/moltbot-on-emergent

## Next Steps / Backlog
- Review the tutorial for post-install configuration
- Start clawdbot-gateway if needed
- Verify MoltBot functionality end-to-end
