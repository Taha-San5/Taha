#!/usr/bin/env bash
# End-to-end smoke test. Boots the built app, then exercises auth, the flow
# engine (including branching, fan-out and the SSRF guard), the AI flow
# generator, credentials, the public REST API and the webhook entry point.
#
#   npm run build && ./scripts/smoke.sh
set -uo pipefail

cd "$(dirname "$0")/.."

BASE=${BASE:-http://localhost:3000}
CHECK="python3 scripts/smoke_check.py"
JAR=$(mktemp)
LOG=$(mktemp)
FAILURES=0

pass() { printf '  \033[32mPASS\033[0m %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; FAILURES=$((FAILURES + 1)); }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }
info() { printf '       %s\n' "$1"; }

# Poll a run until it settles. Echoes the final response body.
await_run() {
  local run_id=$1 body status
  for _ in $(seq 1 45); do
    sleep 1
    body=$(curl -s -b "$JAR" "$BASE/api/runs/$run_id")
    status=$(echo "$body" | $CHECK run-status 2>/dev/null)
    case "$status" in succeeded|failed|cancelled) break ;; esac
  done
  echo "$body"
}

npm start > "$LOG" 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null; wait $SERVER_PID 2>/dev/null' EXIT

for _ in $(seq 1 60); do
  curl -sf -o /dev/null "$BASE/" 2>/dev/null && break
  sleep 1
done
if ! curl -sf -o /dev/null "$BASE/"; then
  echo "Server never became ready:"; cat "$LOG"; exit 1
fi

# --------------------------------------------------------------- public pages
step "Public pages"
for path in / /pricing /templates /docs /login /signup; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$path")
  [ "$code" = "200" ] && pass "GET $path -> 200" || fail "GET $path -> $code"
done

code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/app")
[ "$code" = "307" ] && pass "GET /app redirects when anonymous" || fail "GET /app -> $code"

code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/flows")
[ "$code" = "401" ] && pass "GET /api/flows -> 401 when anonymous" || fail "GET /api/flows -> $code"

# ---------------------------------------------------------------------- auth
step "Authentication"
login=$(curl -s -c "$JAR" -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@wasl.app","password":"wasl1234"}')
echo "$login" | grep -q '"ok":true' && pass "login as demo@wasl.app" || fail "login: $login"

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' -d '{"email":"demo@wasl.app","password":"wrong"}')
[ "$code" = "401" ] && pass "wrong password rejected" || fail "wrong password -> $code"

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/signup" \
  -H 'Content-Type: application/json' -d '{"name":"X","email":"demo@wasl.app","password":"longenough1"}')
[ "$code" = "409" ] && pass "duplicate signup rejected" || fail "duplicate signup -> $code"

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/signup" \
  -H 'Content-Type: application/json' -d '{"name":"X","email":"new@wasl.app","password":"short"}')
[ "$code" = "422" ] && pass "short password rejected" || fail "short password -> $code"

# --------------------------------------------------------------------- flows
step "Flows"
flows=$(curl -s -b "$JAR" "$BASE/api/flows")
count=$(echo "$flows" | $CHECK flow-count)
if [ -n "$count" ]; then pass "listed $count flows"; else fail "flow listing failed"; fi

FLOW_ID=$(echo "$flows" | $CHECK flow-id)
[ -n "$FLOW_ID" ] && info "target flow: $FLOW_ID" || fail "could not resolve a target flow"

# ---------------------------------------------------------------- manual run
step "Run engine (scrape -> summarise -> output)"
run=$(curl -s -b "$JAR" -X POST "$BASE/api/flows/$FLOW_ID/run" \
  -H 'Content-Type: application/json' \
  -d '{"inputs":{"url":"https://example.com"}}')
RUN_ID=$(echo "$run" | $CHECK field run.id)

if [ -z "$RUN_ID" ]; then
  fail "run not created: $run"
else
  pass "run queued: $RUN_ID"
  detail=$(await_run "$RUN_ID")
  status=$(echo "$detail" | $CHECK run-status)
  if [ "$status" = "succeeded" ]; then
    pass "run succeeded"
    if echo "$detail" | $CHECK run-trace; then
      pass "trace is coherent (scrape produced text, summary is about the source)"
    else
      fail "trace assertions failed"
    fi
  else
    fail "run ended as $status"
    echo "$detail" | head -c 900
  fi
fi

# -------------------------------------------------------------- SSE streaming
step "SSE stream"
sse=$(curl -s -b "$JAR" --max-time 6 "$BASE/api/runs/$RUN_ID/stream" | head -c 400)
echo "$sse" | grep -q 'event: ' && pass "stream emits SSE events" || fail "no SSE events"

# ------------------------------------------------------------- flow generator
step "AI flow generator (keyword planner path)"
gen=$(curl -s -b "$JAR" -X POST "$BASE/api/ai/generate-flow" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Every morning read the top stories from a news page, summarise each in Arabic, and post the digest to Slack."}')
if echo "$gen" | $CHECK generator; then
  pass "generated a coherent graph from the prompt"
else
  fail "generator output invalid"
fi

code=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST "$BASE/api/ai/generate-flow" \
  -H 'Content-Type: application/json' -d '{"prompt":"hi"}')
[ "$code" = "422" ] && pass "too-short prompt rejected" || fail "short prompt -> $code"

step "Create a flow from the generated graph"
payload=$(echo "$gen" | $CHECK generator-payload)
created=$(curl -s -b "$JAR" -X POST "$BASE/api/flows" -H 'Content-Type: application/json' -d "$payload")
NEW_ID=$(echo "$created" | $CHECK field flow.id)
[ -n "$NEW_ID" ] && pass "created flow $NEW_ID" || fail "create failed: $created"

dupe=$(curl -s -b "$JAR" -X POST "$BASE/api/flows/$NEW_ID/duplicate")
DUP_ID=$(echo "$dupe" | $CHECK field flow.id)
[ -n "$DUP_ID" ] && pass "duplicated flow $DUP_ID" || fail "duplicate failed: $dupe"

code=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X DELETE "$BASE/api/flows/$DUP_ID")
[ "$code" = "200" ] && pass "deleted the duplicate" || fail "delete -> $code"

# ---------------------------------------------------------------- credentials
step "Credentials"
cred=$(curl -s -b "$JAR" -X POST "$BASE/api/credentials" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke test key","provider":"openai","secret":"sk-smoke-test-0123456789"}')
echo "$cred" | grep -q '"hint"' && pass "credential stored with a masked hint" || fail "credential: $cred"
echo "$cred" | grep -q 'sk-smoke-test-0123456789' && fail "raw secret leaked in the response" || pass "raw secret never returned"
CRED_ID=$(echo "$cred" | $CHECK field credential.id)

code=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST "$BASE/api/credentials" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke test key","provider":"openai","secret":"sk-another-0123456789"}')
[ "$code" = "409" ] && pass "duplicate credential label rejected" || fail "duplicate credential -> $code"

listed=$(curl -s -b "$JAR" "$BASE/api/credentials")
echo "$listed" | grep -q 'sk-smoke-test-0123456789' && fail "secret leaked in the list endpoint" || pass "list endpoint returns only hints"

[ -n "$CRED_ID" ] && curl -s -b "$JAR" -X DELETE "$BASE/api/credentials/$CRED_ID" > /dev/null && pass "credential deleted"

# ----------------------------------------------------------- keys + public API
step "API keys + public REST API"
key=$(curl -s -b "$JAR" -X POST "$BASE/api/keys" -H 'Content-Type: application/json' -d '{"name":"smoke"}')
TOKEN=$(echo "$key" | $CHECK field token)
[ -n "$TOKEN" ] && pass "minted API key ${TOKEN:0:11}…" || fail "key: $key"

api=$(curl -s -X POST "$BASE/api/v1/flows/$FLOW_ID/run" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"inputs":{"url":"https://example.com"},"wait":true}')
if echo "$api" | $CHECK api-run; then
  pass "REST API ran the flow synchronously and returned outputs"
else
  fail "REST API run failed"
fi

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/v1/flows/$FLOW_ID/run" \
  -H 'Authorization: Bearer wsl_not_a_real_key' -H 'Content-Type: application/json' -d '{}')
[ "$code" = "401" ] && pass "bad API key rejected" || fail "bad API key -> $code"

KEY_ID=$(echo "$key" | $CHECK field key.id)
curl -s -b "$JAR" -X DELETE "$BASE/api/keys/$KEY_ID" > /dev/null
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/v1/flows/$FLOW_ID/run" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
[ "$code" = "401" ] && pass "revoked API key stops working" || fail "revoked key -> $code"

# ------------------------------------------------------- webhooks + branching
step "Webhook trigger + branching"
hook_pair=$(curl -s -b "$JAR" "$BASE/api/flows" | $CHECK webhook-flow)
if [ -z "$hook_pair" ]; then
  fail "no webhook flow in the workspace"
else
  HOOK_FLOW=${hook_pair%% *}
  HOOK_TOKEN=${hook_pair##* }
  info "webhook flow $HOOK_FLOW"

  curl -s -b "$JAR" -X PATCH "$BASE/api/flows/$HOOK_FLOW" \
    -H 'Content-Type: application/json' -d '{"status":"draft"}' > /dev/null
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/hooks/$HOOK_TOKEN" \
    -H 'Content-Type: application/json' -d '{}')
  [ "$code" = "409" ] && pass "unpublished flow refuses webhook calls" || fail "unpublished webhook -> $code"

  curl -s -b "$JAR" -X PATCH "$BASE/api/flows/$HOOK_FLOW" \
    -H 'Content-Type: application/json' -d '{"status":"published"}' > /dev/null

  hook=$(curl -s -X POST "$BASE/api/hooks/$HOOK_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"subject":"Production is down","body":"Everything returns 500 and we are losing money right now","email":"ops@example.com"}')
  HOOK_RUN=$(echo "$hook" | $CHECK field runId)
  [ -n "$HOOK_RUN" ] && pass "webhook accepted and queued $HOOK_RUN" || fail "webhook: $hook"

  if [ -n "$HOOK_RUN" ]; then
    hookdetail=$(await_run "$HOOK_RUN")
    hookstatus=$(echo "$hookdetail" | $CHECK run-status)
    if [ "$hookstatus" = "succeeded" ]; then
      pass "webhook run succeeded"
      if echo "$hookdetail" | $CHECK webhook-trace; then
        pass "classifier branched; unused paths were skipped, not executed"
      else
        fail "branching assertions failed"
      fi
    else
      fail "webhook run ended as $hookstatus"
      echo "$hookdetail" | head -c 700
    fi
  fi

  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/hooks/whk_does_not_exist" \
    -H 'Content-Type: application/json' -d '{}')
  [ "$code" = "404" ] && pass "unknown webhook token -> 404" || fail "unknown webhook -> $code"
fi

# ---------------------------------------------------------- fan-out over lists
step "Fan-out over a list"
fanout=$(curl -s -b "$JAR" -X POST "$BASE/api/flows/$FLOW_ID/run" \
  -H 'Content-Type: application/json' \
  -d '{"inputs":{},"graph":{"nodes":[
        {"id":"t","type":"trigger.manual","position":{"x":0,"y":0},"data":{"config":{"inputs":["rows"]}}},
        {"id":"code","type":"data.code","position":{"x":300,"y":0},"data":{"config":{"code":"return [1,2,3,4];","timeoutMs":2000}}},
        {"id":"each","type":"logic.foreach","position":{"x":600,"y":0},"data":{"config":{"limit":10}}},
        {"id":"ask","type":"ai.ask","position":{"x":900,"y":0},"data":{"config":{"prompt":"Item {{$item}}","model":"gpt-4o-mini","temperature":0}}},
        {"id":"join","type":"data.join","position":{"x":1200,"y":0},"data":{"config":{"separator":"numbered"}}},
        {"id":"out","type":"output.result","position":{"x":1500,"y":0},"data":{"config":{"name":"joined","value":"{{$input}}"}}}
      ],"edges":[
        {"id":"e1","source":"t","target":"code","sourceHandle":"out","targetHandle":"in"},
        {"id":"e2","source":"code","target":"each","sourceHandle":"out","targetHandle":"in"},
        {"id":"e3","source":"each","target":"ask","sourceHandle":"out","targetHandle":"in"},
        {"id":"e4","source":"ask","target":"join","sourceHandle":"out","targetHandle":"in"},
        {"id":"e5","source":"join","target":"out","sourceHandle":"out","targetHandle":"in"}
      ]}}')
FAN_RUN=$(echo "$fanout" | $CHECK field run.id)
if [ -z "$FAN_RUN" ]; then
  fail "fan-out run not created: $fanout"
else
  fandetail=$(await_run "$FAN_RUN")
  fanstatus=$(echo "$fandetail" | $CHECK run-status)
  if [ "$fanstatus" = "succeeded" ] && echo "$fandetail" | $CHECK fanout; then
    pass "list fanned out per item, then collapsed via join"
  else
    fail "fan-out run: status=$fanstatus"
    echo "$fandetail" | head -c 700
  fi
fi

# ---------------------------------------------------------- authenticated pages
step "Authenticated pages"
for path in /app /app/runs /app/credentials /app/keys /app/credits "/app/flows/$FLOW_ID" "/app/runs/$RUN_ID"; do
  code=$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' "$BASE$path")
  [ "$code" = "200" ] && pass "GET $path -> 200" || fail "GET $path -> $code"
done

code=$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' "$BASE/app/flows/does-not-exist")
[ "$code" = "404" ] && pass "unknown flow -> 404" || fail "unknown flow -> $code"

# ---------------------------------------------------------------- validation
step "Validation guards"
bad=$(curl -s -b "$JAR" -X POST "$BASE/api/flows/$FLOW_ID/run" \
  -H 'Content-Type: application/json' -d '{"inputs":{},"graph":{"nodes":[],"edges":[]}}')
echo "$bad" | grep -q 'error' && pass "empty graph rejected before running" || fail "empty graph accepted"

cyc=$(curl -s -b "$JAR" -X POST "$BASE/api/flows/$FLOW_ID/run" \
  -H 'Content-Type: application/json' \
  -d '{"inputs":{},"graph":{"nodes":[
        {"id":"a","type":"trigger.manual","position":{"x":0,"y":0},"data":{"config":{"inputs":["x"]}}},
        {"id":"b","type":"data.template","position":{"x":300,"y":0},"data":{"config":{"template":"{{$input}}"}}},
        {"id":"c","type":"data.template","position":{"x":600,"y":0},"data":{"config":{"template":"{{$input}}"}}}
      ],"edges":[
        {"id":"e1","source":"a","target":"b","sourceHandle":"out","targetHandle":"in"},
        {"id":"e2","source":"b","target":"c","sourceHandle":"out","targetHandle":"in"},
        {"id":"e3","source":"c","target":"b","sourceHandle":"out","targetHandle":"in"}
      ]}}')
echo "$cyc" | grep -qi 'loop' && pass "cyclic graph rejected with a clear message" || fail "cycle not detected: $cyc"

step "SSRF guard"
ssrf=$(curl -s -b "$JAR" -X POST "$BASE/api/flows/$FLOW_ID/run" \
  -H 'Content-Type: application/json' \
  -d '{"inputs":{"url":"http://169.254.169.254/latest/meta-data/"}}')
SSRF_RUN=$(echo "$ssrf" | $CHECK field run.id)
if [ -n "$SSRF_RUN" ]; then
  ssrfdetail=$(await_run "$SSRF_RUN")
  if echo "$ssrfdetail" | grep -qi 'blocked'; then
    pass "instance metadata endpoint blocked"
  else
    fail "SSRF guard did not fire"
    echo "$ssrfdetail" | head -c 400
  fi
fi

step "Result"
if [ "$FAILURES" -eq 0 ]; then
  printf '\033[32mAll checks passed.\033[0m\n'
else
  printf '\033[31m%s check(s) failed.\033[0m\n' "$FAILURES"
  echo "--- server log tail ---"
  tail -40 "$LOG"
fi

exit "$FAILURES"
