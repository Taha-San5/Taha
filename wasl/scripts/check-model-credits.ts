/**
 * Guards the model catalog: every hardcoded `credits` value must match the
 * documented formula in src/lib/models.ts. Run via `npm run check:models`.
 *
 * Without this, updating a provider's price silently leaves the credit column
 * wrong, which means we would bill customers against stale numbers.
 */

import { creditsForPricing, MODELS, PROVIDER_LABELS } from "../src/lib/models";

let failures = 0;

console.log("model".padEnd(24) + "provider".padEnd(12) + "list price".padEnd(16) + "credits");
console.log("-".repeat(64));

for (const model of MODELS) {
  const expected = creditsForPricing(model.inputPerM, model.outputPerM);
  const ok = expected === model.credits;
  if (!ok) failures += 1;

  const price = `$${model.inputPerM}/$${model.outputPerM}`;
  console.log(
    model.id.padEnd(24) +
      PROVIDER_LABELS[model.provider].padEnd(12) +
      price.padEnd(16) +
      String(model.credits) +
      (ok ? "" : `  <- should be ${expected}`),
  );
}

const ids = MODELS.map((model) => model.id);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length > 0) {
  console.error(`\nDuplicate model ids: ${duplicates.join(", ")}`);
  failures += duplicates.length;
}

console.log();
if (failures === 0) {
  console.log(`All ${MODELS.length} models match the credit formula.`);
} else {
  console.error(`${failures} problem(s) found.`);
  process.exit(1);
}
