# Start Hack

Clean starter repository for team development using:

- Next.js (App Router + TypeScript)
- shadcn/ui
- Framer Motion
- pnpm
- Husky git hooks

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Scripts

- `pnpm dev` - run development server
- `pnpm lint` - run ESLint checks
- `pnpm build` - production build
- `pnpm check` - lint + build

## Push Protection (Build Gate)

This repo has Husky hooks configured:

- `pre-commit` runs `pnpm lint`
- `pre-push` runs `pnpm build`

If either fails, git blocks the push. This keeps the shared branch deployable.

For remote protection, CI in `.github/workflows/ci.yml` also runs lint + build on PRs and pushes to `main`/`master`.

## Team Onboarding

1. Clone the repo
2. Run `pnpm install`
3. Start coding in `app/page.tsx` or add features in `components/`

To add more shadcn components:

```bash
pnpm dlx shadcn@latest add <component-name>
```

## NASA Weather Context (Agent Demo)

The backend agent now pulls Mars weather context from NASA's InSight weather API.
This is used as informational context for agent reasoning only (it does not directly trigger simulator actions).

- Endpoint: `GET /agent/nasa-weather`
- Optional query: `refresh=true` to bypass cache and fetch fresh data
- API key: set `NASA_API_KEY` in `backend/.env` (falls back to `DEMO_KEY` if not set)

Quick demo call:

```bash
curl "http://localhost:8000/agent/nasa-weather"
curl "http://localhost:8000/agent/nasa-weather?refresh=true"
```
