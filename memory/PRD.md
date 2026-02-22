# MoltBot Installation PRD

## Overview
MoltBot was installed on the Emergent platform using the official install script from https://moltbot.emergent.to/install.sh

## Installation Date
February 22, 2026

## Steps Completed
1. Retrieved Emergent LLM key via `emergent_integrations_manager`
2. Ran MoltBot install script in background with `NEW_LLM_KEY` set
3. LLM key replaced in `/app/backend/.env`
4. Frontend rebuilt successfully (production build)
5. All services started via supervisor

## Service Status (Post-Install)
- **backend**: RUNNING (pid 481)
- **frontend**: RUNNING (pid 482)
- **mongodb**: RUNNING (pid 501)
- **nginx-code-proxy**: RUNNING (pid 517)
- **clawdbot-gateway**: STOPPED (not started — optional component)

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
