<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Parallel work boundaries

Two agents may work concurrently. Respect these ownership rules to avoid conflicts.

## Backend agent (Python / FastAPI)
**Owns:** `backend/**` — all files under the backend directory.
**Do not touch** any frontend files (`src/`, `app/`, `public/`, `next.config.*`, `tailwind.*`, `package.json`, `tsconfig.*`).

## Frontend agent (Next.js / React)
**Owns:** `src/**`, `app/**`, `public/**`, and root config files (`next.config.*`, `tailwind.*`, `package.json`, `tsconfig.*`).
**Do not touch** any backend files (`backend/**`).

## Shared (coordinate before editing)
- `AGENTS.md`, `CLAUDE.md` — ask the user before modifying.
- `README.md` — append only, don't rewrite existing content.

## API contract
The backend exposes these stable endpoints. The frontend should consume them:
- `GET /sim/state` — full simulation state
- `GET /sim/sensors` — sensor readings per zone
- `GET /sim/nutrition` — nutritional coverage
- `POST /sim/tick` — advance simulation
- `GET /sim/stream` — SSE real-time updates
- `POST /agent/query` `{message: string}` — natural language agent query
- `POST /agent/tick` — autonomous agent decision cycle
- `GET /agent/decisions?limit=N` — decision history
- `POST /auto-tick/start?interval=N` — start auto-tick loop
- `POST /auto-tick/stop` — stop auto-tick
- `GET /auto-tick/status` — auto-tick state
- `GET /events/log` — event log

Backend runs on `http://localhost:8000`. Frontend should proxy or use this as the API base URL.
