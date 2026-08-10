# Deploying Wasl

The container image is built and verified — see "Verified" at the bottom. Pick a
host below. Every path needs two generated secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # ENCRYPTION_KEY
```

## Which host?

Wasl executes flows **in-process** after responding, and runs can last minutes.
That makes a long-lived container the natural fit, and serverless the awkward one.

| Host | Fit | Why |
| --- | --- | --- |
| **Railway** | best | Docker + a persistent volume, no timeouts. SQLite is enough for a review deploy. |
| **Render** | best | Same shape as Railway. |
| **Fly.io** | good | Same, plus you pick the region. |
| **Vercel** | workable | Native Next.js, but needs external Postgres and runs are capped by the function timeout. |

---

## Railway (fastest to a live URL)

```bash
npm i -g @railway/cli
railway login
railway init                    # inside the repo
railway volume add --mount-path /data
railway variables set \
  DATABASE_URL="file:/data/wasl.db" \
  DATABASE_PROVIDER=sqlite \
  AUTH_SECRET="<generated>" \
  ENCRYPTION_KEY="<generated>"
railway up                      # builds the Dockerfile
railway domain                  # prints the public URL
```

Then set `NEXT_PUBLIC_APP_URL` to that URL and redeploy, so the webhook and API
snippets shown in the builder use the real hostname.

## Render

Create a **Web Service** → Docker → point at the repo. Add a disk mounted at
`/data`, then the same four variables. Render reads the `Dockerfile` as-is.

## Fly.io

```bash
fly launch --no-deploy            # accept the detected Dockerfile
fly volumes create wasl_data --size 1
fly secrets set AUTH_SECRET="<generated>" ENCRYPTION_KEY="<generated>"
fly deploy
```

Add to `fly.toml`:

```toml
[env]
  DATABASE_URL = "file:/data/wasl.db"
  DATABASE_PROVIDER = "sqlite"

[[mounts]]
  source = "wasl_data"
  destination = "/data"
```

## Vercel + Neon Postgres

Vercel's filesystem is read-only and ephemeral, so SQLite cannot work there.

1. Create a Neon (or Supabase) Postgres database and copy its connection string.
2. Switch the Prisma provider and commit the change:
   ```bash
   node scripts/set-db-provider.mjs postgresql
   ```
3. In Vercel, set `DATABASE_URL`, `AUTH_SECRET`, `ENCRYPTION_KEY`,
   `NEXT_PUBLIC_APP_URL`.
4. Deploy, then apply the schema and seed once from your machine:
   ```bash
   DATABASE_URL="<neon url>" npx prisma db push
   DATABASE_URL="<neon url>" npx tsx prisma/seed.ts
   ```

**Caveat that matters:** flows are executed by `after()`, which dies when the
serverless function ends. The run routes ask for `maxDuration` (60s for the
trigger endpoints, 300s for `wait: true` and the SSE stream), but your plan caps
that. A run that exceeds the cap is left stuck in `running`. On a container host
this does not happen — the engine's own 5-minute ceiling applies instead.

---

## Run it locally with Docker

```bash
docker build -t wasl:preview .

docker run -d --name wasl-preview -p 3000:3000 \
  -v wasl-data:/data \
  -e DATABASE_URL="file:/data/wasl.db" \
  -e AUTH_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" \
  -e ENCRYPTION_KEY="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  wasl:preview
```

Sign in with **demo@wasl.app / wasl1234**.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:/data/wasl.db` for SQLite, or a `postgresql://` URL |
| `DATABASE_PROVIDER` | no | `sqlite` (default), `postgresql` or `mysql`. The entrypoint rewrites the Prisma schema to match. |
| `AUTH_SECRET` | yes | 32+ chars. The container refuses to boot without it. |
| `ENCRYPTION_KEY` | yes | 32+ chars. Encrypts stored credentials. **Changing it makes existing credentials unreadable.** |
| `OPENAI_API_KEY` | no | Omit and AI nodes use the simulated model, badged in the UI. |
| `OPENAI_BASE_URL` | no | Any OpenAI-compatible endpoint. |
| `NEXT_PUBLIC_APP_URL` | no | Used in the webhook/API snippets shown in the builder. Set it to your real URL. |
| `SKIP_SEED` | no | `1` to skip seeding on boot. |
| `PORT` | no | Defaults to 3000. |

## What the entrypoint does on boot

1. Fails fast if `DATABASE_URL`, `AUTH_SECRET` or `ENCRYPTION_KEY` are missing.
2. Rewrites the Prisma provider to match `DATABASE_PROVIDER`, then regenerates the client.
3. Applies the schema with `prisma db push`.
4. Seeds the demo account and the 10-template gallery (upserts, so redeploys are safe).
5. Starts Next.

`GET /api/health` returns `200` with a per-check breakdown, or `503` when the
database is unreachable or the secrets are too short — so a bad deploy fails
visibly instead of on first use.

## Before sharing the URL publicly

- **Change the demo password**, or set `SKIP_SEED=1` and create your own account.
  `demo@wasl.app / wasl1234` is in this repo, so anyone can read it.
- Signup is open to anyone who finds the URL. There is no invite gate yet.
- The **Run JavaScript** node uses `node:vm` with a timeout. That stops infinite
  loops but is not a security boundary — do not let untrusted people run it.
- Scheduled triggers still need an external cron to fire them.

## Verified

Built and run in a container before writing this:

```
docker build -t wasl:preview .                          image built
GET /api/health                                         200 {"status":"ok","templates":10}
GET / /pricing /templates /docs /login /signup          200
login demo@wasl.app                                     {"ok":true}
POST /api/flows/<id>/run {"url":"https://example.com"}   succeeded, 4/4 nodes, 128ms, 1 credit
  trigger.manual -> data.scrape -> ai.summarize -> output.result
```

Boot guard also confirmed: omitting `AUTH_SECRET` stops the container with
`AUTH_SECRET must be set (32+ characters)` rather than starting a broken app.
