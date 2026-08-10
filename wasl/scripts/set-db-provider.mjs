#!/usr/bin/env node
/**
 * Rewrites the `provider` in prisma/schema.prisma.
 *
 * Prisma does not support env() for the datasource provider, so switching
 * between SQLite (local dev) and PostgreSQL (hosted) means editing the schema.
 * This keeps that a one-liner instead of a manual edit, and keeps a single
 * schema file as the source of truth so the two can never drift.
 *
 *   node scripts/set-db-provider.mjs postgresql
 *   DATABASE_PROVIDER=postgresql node scripts/set-db-provider.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SUPPORTED = ["sqlite", "postgresql", "mysql"];

const requested = (process.argv[2] ?? process.env.DATABASE_PROVIDER ?? "sqlite").trim();

if (!SUPPORTED.includes(requested)) {
  console.error(`Unsupported provider "${requested}". Use one of: ${SUPPORTED.join(", ")}`);
  process.exit(1);
}

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma", "schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

const datasource = /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")([a-z]+)(")/s;
const match = schema.match(datasource);

if (!match) {
  console.error("Could not find the datasource provider in prisma/schema.prisma");
  process.exit(1);
}

if (match[2] === requested) {
  console.log(`· provider already set to ${requested}`);
  process.exit(0);
}

writeFileSync(schemaPath, schema.replace(datasource, `$1${requested}$3`));
console.log(`· provider switched from ${match[2]} to ${requested}`);
