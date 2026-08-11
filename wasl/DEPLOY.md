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

That URL works immediately — the app derives its own hostname from each
request, so the webhook and API snippets in the builder are correct with no
extra configuration and no rebuild.

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
   and optionally `APP_URL`.
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
  wasl:preview
```

Create the first account at `/signup`. There is no shared demo account.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:/data/wasl.db` for SQLite, or a `postgresql://` URL |
| `DATABASE_PROVIDER` | no | `sqlite` (default), `postgresql` or `mysql`. The entrypoint rewrites the Prisma schema to match. |
| `AUTH_SECRET` | yes | 32+ chars. The container refuses to boot without it. |
| `ENCRYPTION_KEY` | yes | 32+ chars. Encrypts stored credentials. **Changing it makes existing credentials unreadable.** |
| `OPENAI_API_KEY` | no | Omit and AI nodes use the simulated model, badged in the UI. |
| `OPENAI_BASE_URL` | no | Any OpenAI-compatible endpoint. |
| `APP_URL` | no | Forces the URL shown in webhook/API snippets. Leave unset and it is derived from the request, so custom domains work without a rebuild. |
| `GOOGLE_CLIENT_ID` | no | Enables the Google sign-in button. Hidden when unset. |
| `GOOGLE_CLIENT_SECRET` | no | Required alongside the client id. |
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

## Google sign-in

Optional. Without it, email and password still works.

1. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials),
   create an **OAuth client ID** of type *Web application*.
2. Under **Authorised redirect URIs** add exactly:
   `https://<your-domain>/api/auth/google/callback`
   Add one entry per domain you use, including `http://localhost:3000/...` for
   local development.
3. Configure the OAuth consent screen (an *External* app in *Testing* mode is
   enough while only you sign in).
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the service and redeploy.

The flow uses `state` plus PKCE (S256), both stored in short-lived httpOnly
cookies. A Google account whose email matches an existing password account is
linked to it rather than duplicated — safe because Google reports the address as
verified, and unverified addresses are refused.

## Before sharing the URL publicly

- **Signup is open to anyone who finds the URL.** There is no invite gate yet, so
  claim the first account immediately after deploying, and treat the URL as
  private until you add one.
- The seed creates no accounts. If you are upgrading a deployment that had the
  old `demo@wasl.app` account, the seed deletes it on the next boot.
- The **Run JavaScript** node uses `node:vm` with a timeout. That stops infinite
  loops but is not a security boundary — do not let untrusted people run it.
- Scheduled triggers still need an external cron to fire them.

## Verified

Built and run in a container before writing this:

```
docker build -t wasl:preview .                          image built
GET /api/health                                         200 {"status":"ok","templates":10}
GET / /pricing /templates /docs /login /signup          200
signup + install template + run                         succeeded, 4/4 nodes, 1 credit
  trigger.manual -> data.scrape -> ai.summarize -> output.result
```

Boot guard also confirmed: omitting `AUTH_SECRET` stops the container with
`AUTH_SECRET must be set (32+ characters)` rather than starting a broken app.
