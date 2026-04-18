# Flora AI — StartHack 2026

**2nd place / 26 teams · St. Gallen, March 2026 · $5,000 AWS credits team prize**

Live demo: [flora.samuelbaumgartner.ch](https://flora.samuelbaumgartner.ch)

An agent-driven indoor-farming / nutrition simulation. The system runs a multi-zone farm simulation (sensors, growth, nutritional coverage), lets a natural-language agent reason over the current state, and executes autonomous decision cycles against a stable API contract.

## What it does

- Simulates a multi-zone farm with per-zone sensors and per-crop nutritional output.
- Exposes a stable REST + SSE API for state, sensors, nutrition, tick control, event log.
- An LLM agent answers operator questions about the farm and can run autonomous decision cycles that advance the simulation.
- Frontend: Next.js 16 / React 19 with Framer Motion, Three.js for the 3D zone view, and an SSE live feed.
- ESP8266 firmware for the physical demo sensor rig.

## Architecture

```
Frontend (Next.js / App Router)
    │  proxies /sim/*  and  /agent/*
    ▼
Backend (Python / FastAPI)
    ├── /sim/state, /sim/sensors, /sim/nutrition, /sim/tick, /sim/stream (SSE)
    ├── /agent/query, /agent/tick, /agent/decisions
    └── /auto-tick/start|stop|status, /events/log

Hardware: ESP8266_Code/  — sensor firmware for the physical demo rig.
```

Two agent workstreams (backend / frontend) ran in parallel during the hackathon under the boundaries documented in [`AGENTS.md`](AGENTS.md).

## Stack

Next.js 16 · React 19 · TypeScript · FastAPI · Python · Three.js · Framer Motion · shadcn/ui · Tailwind · AWS (Amplify / S3) · ESP8266 (C++).

## Run it

```bash
pnpm install
pnpm dev                 # frontend
# backend: see backend/README.md  (FastAPI on :8000)
```

## Context

Built in 36 hours at StartHack 2026. Placed 2nd out of 26 teams.

## Author (of this fork)

[Samuel Baumgartner](https://www.samuelbaumgartner.ch) — BSc Electrical Engineering, ETH Zürich.
