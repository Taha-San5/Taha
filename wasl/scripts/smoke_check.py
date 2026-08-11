#!/usr/bin/env python3
"""
Assertion helpers for scripts/smoke.sh.

Each mode reads a JSON response on stdin, prints a short human summary, and
exits non-zero with an explanation when an expectation is not met.
"""

import json
import sys


def die(message):
    print("       ! " + message)
    sys.exit(1)


def info(message):
    print("       " + message)


def main():
    if len(sys.argv) < 2:
        die("usage: smoke_check.py <mode>")
    mode = sys.argv[1]

    raw = sys.stdin.read()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        die("response was not JSON: " + raw[:300])

    handlers = {
        "flow-count": flow_count,
        "flow-id": flow_id,
        "webhook-flow": webhook_flow,
        "run-status": run_status,
        "run-trace": run_trace,
        "generator": generator,
        "generator-payload": generator_payload,
        "api-run": api_run,
        "webhook-trace": webhook_trace,
        "fanout": fanout,
        "field": field,
    }
    handler = handlers.get(mode)
    if not handler:
        die("unknown mode " + mode)
    handler(data)


# --------------------------------------------------------------------- flows

def flow_count(data):
    flows = data.get("flows", [])
    for flow in flows:
        info("{:>2} nodes  {:<9} {}".format(flow["nodeCount"], flow["triggerType"], flow["name"]))
    if len(flows) < 2:
        die("expected at least 2 flows, got {}".format(len(flows)))
    print(len(flows))


def flow_id(data):
    flows = data.get("flows", [])
    if not flows:
        die("no flows returned")
    match = next((f for f in flows if "Summarise any page" in f["name"]), flows[0])
    print(match["id"])


def webhook_flow(data):
    flows = data.get("flows", [])
    match = next((f for f in flows if f["triggerType"] == "webhook" and f.get("webhookToken")), None)
    if not match:
        die("no webhook flow with a token")
    print(match["id"] + " " + match["webhookToken"])


def field(data):
    path = sys.argv[2].split(".")
    cursor = data
    for part in path:
        if isinstance(cursor, dict):
            cursor = cursor.get(part)
        else:
            cursor = None
        if cursor is None:
            print("")
            return
    print(cursor)


# ----------------------------------------------------------------------- runs

def run_status(data):
    print(data["run"]["status"])


def run_trace(data):
    run = data["run"]
    nodes = run["nodeRuns"]
    info("credits={} duration={}ms nodes={}".format(run["creditsUsed"], run["durationMs"], len(nodes)))
    for node in nodes:
        info("- {:<10} {:<16} {}ms".format(node["status"], node["type"], node["durationMs"]))
    info("outputs: " + json.dumps(run["outputs"], ensure_ascii=False)[:280])

    if not run["outputs"]:
        die("outputs are empty")
    scrape = next((n for n in nodes if n["type"] == "data.scrape"), None)
    if not scrape or scrape["status"] != "succeeded":
        die("data.scrape did not succeed")
    if not scrape["output"].get("text"):
        die("data.scrape returned no text")
    summarise = next((n for n in nodes if n["type"] == "ai.summarize"), None)
    if not summarise or summarise["status"] != "succeeded":
        die("ai.summarize did not succeed")
    summary = json.dumps(run["outputs"], ensure_ascii=False)
    if "Reply with" in summary or "bullet points, one per line" in summary:
        die("the model echoed its own instructions instead of summarising the source")


def webhook_trace(data):
    run = data["run"]
    for node in run["nodeRuns"]:
        info("- {:<10} {}".format(node["status"], node["type"]))
    skipped = [n for n in run["nodeRuns"] if n["status"] == "skipped"]
    info("{} node(s) skipped by branching".format(len(skipped)))

    classifier = next((n for n in run["nodeRuns"] if n["type"] == "ai.classify"), None)
    if not classifier or classifier["status"] != "succeeded":
        die("ai.classify did not succeed")
    info("classified as: " + json.dumps(classifier["output"], ensure_ascii=False))
    if not skipped:
        die("expected at least one branch to be skipped")


def fanout(data):
    run = data["run"]
    ask = next((n for n in run["nodeRuns"] if n["type"] == "ai.ask"), None)
    if not ask:
        die("ai.ask node missing from the trace")
    if not isinstance(ask["output"], list):
        die("ai.ask should return a list when fanning out, got " + type(ask["output"]).__name__)
    if len(ask["output"]) != 4:
        die("expected 4 per-item results, got {}".format(len(ask["output"])))
    joined = run["outputs"].get("joined", "")
    if not joined.startswith("1."):
        die("join should produce a numbered list, got: " + joined[:80])
    info("ai.ask ran {} times, results collapsed into a numbered list".format(len(ask["output"])))
    info("joined: " + joined[:70].replace("\n", " | "))


# ------------------------------------------------------------------ generator

def generator(data):
    generated = data.get("generated")
    if not generated:
        die("no generated flow in the response: " + json.dumps(data)[:200])

    nodes = generated["graph"]["nodes"]
    info("{}  ({} nodes, {} edges, heuristic={})".format(
        generated["name"], len(nodes), len(generated["graph"]["edges"]), generated["heuristic"]))
    for node in nodes:
        info("- " + node["type"])

    types = [node["type"] for node in nodes]
    if len(nodes) < 4:
        die("too few nodes: {}".format(len(nodes)))
    if not types[0].startswith("trigger."):
        die("first node is not a trigger: " + types[0])
    for expected in ("trigger.schedule", "data.scrape", "action.slack"):
        if expected not in types:
            die("expected a {} node, got {}".format(expected, types))
    if not generated["graph"]["edges"]:
        die("no edges were generated")


def generator_payload(data):
    generated = data["generated"]
    print(json.dumps({
        "name": generated["name"],
        "description": generated["description"],
        "emoji": generated["emoji"],
        "graph": generated["graph"],
        "triggerType": "schedule",
    }))


def api_run(data):
    info("status={} credits={}".format(data.get("status"), data.get("creditsUsed")))
    info("outputs: " + json.dumps(data.get("outputs"), ensure_ascii=False)[:240])
    if data.get("status") != "succeeded":
        die("run did not succeed: " + str(data.get("error")))
    if not data.get("outputs"):
        die("no outputs returned")


if __name__ == "__main__":
    main()
