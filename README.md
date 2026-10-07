# sh-enrichment

An internal CRM and compliance-tracking dashboard for managing shipping company clients and prospects, their vessels, and COFR (Certificate of Financial Responsibility) renewal deadlines.

## What it does

The app centers on **parent companies** (ship operators), each of which can have:

- **Vessels** — tracked by name, VIN, type, gross tonnage, flag, operator, and COFR effective/expiration/renewal dates.
- **Contacts** — enriched contact records (name, title, seniority, department, email + email status, LinkedIn, location) scraped/imported per company.
- **CRM status** — each company carries a `pipeline_status` (prospect → contacted → qualified → proposal_sent → won/lost/not_interested) and an optional `client_type` (`shoreline`, `hudson`, or both), plus freeform notes and next/last contact dates.

Companies are also grouped into geographic **scope lists** (Asian, Greek, NW European, Nordic) used to filter the dashboard down to a particular outreach campaign.

### Urgency tracking

Every vessel's COFR expiration date is reduced to an urgency tier so renewals don't get missed:

| Tier       | Window                     |
|------------|-----------------------------|
| `expired`  | past due                   |
| `urgent`   | ≤ 60 days out               |
| `upcoming` | ≤ 180 days out              |
| `clear`    | further out                |

The companies table surfaces each company's soonest-expiring vessel and a count of vessels in the urgent window, so the sales/outreach team can prioritise who to contact.

### Pages

- `/login` — Supabase email/password auth.
- `/companies` — main dashboard: every parent company with rolled-up vessel counts, urgency, contact counts, and scope/pipeline filtering (`CompaniesTable`, `ScopeDropdown`, `MultiSelectDropdown`).
- `/companies/[id]` — single company view: its vessels (`VesselsTable`), contacts (`ContactsSection`), and an editable CRM panel (`CrmPanel`) for updating pipeline status, client type, and notes inline.

All data fetching/paging reads directly from Supabase on the server (`force-dynamic`), paginated in batches of 1000 rows per table.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Supabase** (`@supabase/ssr`) for Postgres data, auth, and session cookies — a server client (`lib/supabase/server.ts`), a browser client (`lib/supabase/client.ts`), and `middleware.ts` which gates every non-`/login` route behind an authenticated session and redirects signed-in users away from `/login`
- **Tailwind CSS 4**
- Deployed to **Cloudflare Workers** via `@opennextjs/cloudflare` (`wrangler.jsonc`, `open-next.config.ts`)

### Supabase schema (inferred from queries)

The app reads from these tables/views — see `lib/types.ts` for the shapes used in the UI:

- `parent_companies` — core company records (name, location, pipeline/client status, notes, timestamps)
- vessels (per-company, joined via `company_vessel_stats` / `company_vessel_meta` views for rolled-up counts, tonnages, flags, and operating locations)
- contacts (per-company, joined via `company_contact_counts` for rolled-up counts and titles)
- `asian_scope_companies`, `greek_scope_companies`, `nw_europe_scope_companies`, `nordic_scope_companies` — id lists defining each geographic outreach scope

The Supabase anon/publishable key is safe to expose client-side (it's gated by RLS policies on the Supabase project, not by secrecy) and is set directly in `wrangler.jsonc`'s `vars` block for the deployed Worker.

## ⚠️ This is not the Next.js you know

This project runs **Next.js 16** on **Cloudflare Workers** via OpenNext, which comes with real breaking changes and deployment gotchas not in most training data or docs. Before changing routing, middleware, headers, or env var handling, read [`AGENTS.md`](./AGENTS.md) — in short:

- Use `middleware.ts`, **not** `proxy.ts` (the Next 16 rename is Node-runtime-only and incompatible with Cloudflare's Edge runtime).
- Don't use `next.config.ts`'s `headers()` — OpenNext/Cloudflare doesn't support it; set response headers in `middleware.ts` instead (see the security headers already there).
- `NEXT_PUBLIC_*` vars are baked in at build time — set them in both the Cloudflare dashboard (build-time) and `wrangler.jsonc`'s `vars` block (runtime). Local builds use an untracked `.env.production`.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login` until you sign in with a Supabase user on this project.

### Environment variables

Create `.env.local` (git-ignored) with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Deploying

```bash
npm run build
npx wrangler deploy
```

Build-time `NEXT_PUBLIC_*` vars must also be set in the Cloudflare dashboard (Workers & Pages → project → Settings → Environment Variables) — see [`AGENTS.md`](./AGENTS.md) for why.

### Other scripts

```bash
npm run lint   # eslint
npm run start  # serve a production build locally
```
