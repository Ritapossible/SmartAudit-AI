# SmartAudit AI

AI-powered Solidity smart contract auditor with 4 AI validators (Security, Gas, Access Control, Formal) and a 3-tier fallback system.

## Run & Operate

- Frontend (SmartAudit): started automatically via workflow `artifacts/smartaudit: web`
- Backend (API Server): started automatically via workflow `artifacts/api-server: API Server`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind CSS v4 + shadcn/ui (Radix UI) + wouter
- Backend API: Express 5 (TypeScript)
- State: Local only (no DB) — audit history in localStorage, current result in sessionStorage

## Where things live

- `artifacts/smartaudit/src/` — React frontend
  - `pages/` — Index, Results, HowItWorks, NotFound
  - `components/` — Header, CodeEditor, AuditOptions, AuditProgress, AuditHistory, ValidatorCard, IssuesList, Recommendations, RiskScoreBar, BackendStatus
  - `lib/types.ts` — shared TypeScript types
  - `lib/audit-service.ts` — audit orchestration, history, export
  - `lib/genlayer.ts` — backend API client (fetch)
  - `hooks/use-theme.tsx` — dark/light theme provider
- `artifacts/api-server/src/routes/audit.ts` — 4 validator engines + consensus
- `artifacts/api-server/src/routes/index.ts` — route registry

## Architecture decisions

- **Wouter** (not react-router-dom) — already in the workspace catalog; no extra install needed
- **Tailwind v4** CSS with `@theme inline` for dynamic CSS variable theming (dark/light)
- **3-tier fallback**: Backend `/api/audit` → on failure → mock result in frontend
- **No DB** — all analysis is pure in-memory regex/pattern based static analysis
- **Contract result handoff** via `sessionStorage` (not navigation state) to survive page reloads

## Product

Users paste Solidity smart contract code, choose audit options, and click "Run Audit". The app animates through 4 AI validator personas (SecurityBot, GasOptimizer, AccessGuard, FormalProver), then shows a consensus risk score (0–100), severity breakdown, vulnerability list with expand/collapse details, AI recommendations, and JSON export. Audit history is stored in localStorage.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Tailwind v4: `@import url(...)` (Google Fonts) MUST come **before** `@import "tailwindcss"` to avoid PostCSS "precede all other statements" error.
- Custom colors (`success`, `warning`, etc.) need `@theme inline { --color-*: hsl(var(--*)) }` to be available as Tailwind utility classes in v4.
- The api-server serves the backend routes; it must be running for BackendStatus to show "Backend Live" and for real analysis.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
