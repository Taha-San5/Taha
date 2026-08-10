# Wasl · وصل

A visual builder for AI workflows — the Gumloop idea, rebuilt Arabic-first with a
real execution engine, live per-node traces, and bring-your-own-key pricing.

Drag nodes onto a canvas, wire them together, and ship an automation that reads
the web, reasons with a model, branches on the result, and takes action.

```
Schedule ─▶ Read web page ─▶ Split into list ─┬─▶ Summarise ─┐
                                              └─▶ Categorise ─┴─▶ Send to Slack
```

## Quick start

```bash
./scripts/setup.sh   # generates .env, pushes the schema, seeds demo data
npm run dev
```

Sign in at <http://localhost:3000/login> with **demo@wasl.app / wasl1234**.

No API key is required. When none is configured, AI nodes fall back to a
deterministic *simulated* model, clearly badged in the UI, so every template and
demo still executes end to end.

## What is actually built

**Execution engine** (`src/lib/engine`, `src/lib/nodes`)

- 28 executable node types across triggers, AI, data, logic, actions and output.
- DAG execution with topological ordering and cycle rejection.
- **Automatic fan-out**: hand a node a list and it runs once per item, then
  collapses via *Combine list*. No subflow gymnastics — the same model Gumloop uses.
- **Branching**: conditions, routers and AI categorisation. Nodes on a path that
  was not taken are recorded as `skipped`, not failed. When a branching node fans
  out over a list, each output handle receives only the items that matched it.
- **Error routing**: the HTTP node exposes an `error` handle; wire it up and a
  failure continues down that path instead of ending the run.
- Per-node persistence of inputs, output, logs, duration and credit cost, so the
  UI can stream a live trace over SSE.
- Guard rails: 400 node executions, 100-item fan-out, 5-minute run ceiling,
  SSRF blocklist on user-supplied URLs, `node:vm` timeout on the JavaScript node.

**Builder** (`src/components/builder`)

- React Flow canvas with a searchable palette, drag-to-add, dynamic output
  handles, autosave, version history and tidy-up layout.
- Inspector with typed field editors (prompt, code, key/value, list, credential
  picker, model picker) plus clickable data references — it walks the graph
  backwards and offers only expressions the selected node can legally use.
- Run panel: trigger inputs, cost estimate, live trace, and the same validation
  the server enforces, computed client-side from the shared module.

**Platform**

- Email/password auth with `jose` JWT sessions in httpOnly cookies, gated at the
  edge by `middleware.ts` and re-checked against the database in every handler.
- Credentials encrypted at rest with AES-256-GCM. The plaintext is never
  returned to the browser — only a masked fingerprint.
- Credit ledger with per-run accounting. **Model calls on your own key cost zero
  credits**; logic, templating and delivery nodes are always free.
- Every flow is simultaneously a webhook (`POST /api/hooks/<token>`, optional
  shared secret), a scheduled job, and a REST endpoint
  (`POST /api/v1/flows/<id>/run` with `wait: true` for a synchronous result).
- Natural-language flow generator. With a model key it drafts the graph and
  validates it against the node registry; without one, a keyword planner builds a
  sensible graph so the feature still works offline.
- Full Arabic/English UI with correct RTL. The canvas itself stays left-to-right
  in both locales, because graphs read that way. Both dictionaries are
  shape-checked against each other at compile time.

## Architecture

```
src/
  app/
    (marketing)/        landing, pricing, templates, docs
    (auth)/             login, signup
    app/                dashboard, builder, runs, credentials, keys, credits
    api/                REST handlers (auth, flows, runs, credentials, keys,
                        templates, hooks, ai, v1 public API)
  components/
    builder/            canvas, palette, inspector, run panel, top bar
    app/                dashboard, run detail, managers
    marketing/          landing sections, docs, gallery
    ui/kit.tsx          shared primitives
  lib/
    nodes/registry.ts   node catalog — the single source of truth for the
                        palette, inspector, docs, validator and executor
    nodes/executors.ts  the runtime implementation of every node
    engine/executor.ts  DAG runner, fan-out, branching, credit accounting
    engine/validate.ts  ordering + validation shared by client and server
    engine/expressions  {{$input}} / {{$item}} / {{nodeId.path}} resolution
    llm.ts              OpenAI-compatible adapter + simulated fallback
    i18n/               ar + en dictionaries, shape-enforced
```

Adding a node type means one entry in `registry.ts` and one function in
`executors.ts`. The palette, inspector, docs page, validator and cost estimator
all derive from that entry.

## Expressions

Any data field accepts double-brace expressions:

| Token | Meaning |
| --- | --- |
| `{{$input}}` | value from the connected upstream node |
| `{{$input.body.title}}` | a path into that value |
| `{{$item}}` / `{{$index}}` | current item while fanning out over a list |
| `{{$trigger.url}}` | a field collected by the trigger |
| `{{read.text}}` | any earlier node's output, by node id |
| `{{$now}}` / `{{$today}}` / `{{$runId}}` | run metadata |

A field containing exactly one expression keeps the value's native type; mixed
with surrounding text it is stringified.

## Testing

```bash
npm run typecheck
npm run build
./scripts/smoke.sh     # boots the built app and exercises it end to end
```

`scripts/smoke.sh` covers public pages, auth (including rejection paths), the run
engine, SSE streaming, the flow generator, credential secrecy, API key minting
and revocation, the public REST API, webhook publish gating, list fan-out,
branch skipping, cycle detection and the SSRF guard.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | SQLite for dev; any Postgres URL in production |
| `AUTH_SECRET` | yes | 32+ chars, signs session JWTs |
| `ENCRYPTION_KEY` | yes | 32+ chars, encrypts stored credentials |
| `OPENAI_API_KEY` | no | omit to use the simulated model |
| `OPENAI_BASE_URL` | no | any OpenAI-compatible endpoint |
| `NEXT_PUBLIC_APP_URL` | no | used in generated webhook/API snippets |

To move to Postgres, change `provider` in `prisma/schema.prisma` and point
`DATABASE_URL` at your database. Every JSON payload is stored as `TEXT`, so the
schema ports as-is.

## Known limitations

- **Scheduled triggers are not yet dispatched.** The trigger type, config and
  validation exist and scheduled flows run fine when invoked, but nothing polls
  for due flows. Add a cron entry (or a Vercel Cron / GitHub Action) that calls
  the run endpoint for published flows on the interval they declare.
- **The JavaScript node is not a security sandbox.** `node:vm` enforces the
  timeout, which stops infinite loops, but a determined script can escape the
  context. Run untrusted code in `isolated-vm` or a separate process before
  exposing this to untrusted users.
- **Runs execute in-process** via `after()`. That is fine for a single instance;
  a real deployment should move execution to a queue so long runs survive
  deploys and can be cancelled.
- **Billing is modelled, not charged.** The credit ledger, plans and monthly
  reset fields are all present; no payment provider is wired up.
- Concurrency limits per plan are advertised on the pricing page but not enforced.
