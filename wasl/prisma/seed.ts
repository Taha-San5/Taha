import { PrismaClient } from "@prisma/client";

import { TEMPLATES } from "../src/lib/templates/catalog";

const prisma = new PrismaClient();

/**
 * Seeds the template gallery. Runs on every boot and is idempotent.
 *
 * It deliberately creates **no user accounts**. A shared demo account with a
 * published password is a standing invitation to anyone who finds the URL, so
 * the first real account is created through /signup instead.
 */
async function main() {
  console.log("Seeding Wasl…");

  await removeLegacyDemoAccount();

  for (const template of TEMPLATES) {
    const fields = {
      name: template.name,
      nameAr: template.nameAr,
      description: template.description,
      descriptionAr: template.descriptionAr,
      category: template.category,
      emoji: template.emoji,
      featured: template.featured,
      installs: template.installs,
      graph: JSON.stringify(template.graph),
    };

    await prisma.template.upsert({
      where: { slug: template.slug },
      update: fields,
      create: { slug: template.slug, ...fields },
    });
  }

  // Drop seeded templates that are no longer in the catalog (renamed slugs),
  // while leaving anything a user authored untouched.
  const stale = await prisma.template.deleteMany({
    where: {
      authorId: null,
      slug: { notIn: TEMPLATES.map((template) => template.slug) },
    },
  });
  if (stale.count > 0) console.log(`  removed   ${stale.count} stale template(s)`);

  console.log(`  templates ${TEMPLATES.length}`);
  console.log("Done. Create the first account at /signup.");
}

/**
 * One-time cleanup for installs seeded by an earlier version, which shipped a
 * `demo@wasl.app` account whose password was committed to the repository.
 * Deleting the user cascades its memberships; the workspace is removed
 * separately so its flows, runs and credentials go with it.
 *
 * Safe to keep running forever: after the first pass it is a no-op.
 */
async function removeLegacyDemoAccount() {
  const demoUser = await prisma.user.findUnique({
    where: { email: "demo@wasl.app" },
    select: { id: true },
  });
  const demoWorkspace = await prisma.workspace.findUnique({
    where: { slug: "demo" },
    select: { id: true, name: true },
  });

  if (!demoUser && !demoWorkspace) return;

  if (demoWorkspace) {
    await prisma.workspace.delete({ where: { id: demoWorkspace.id } });
    console.log("  removed   legacy demo workspace (and its flows/runs)");
  }
  if (demoUser) {
    await prisma.user.delete({ where: { id: demoUser.id } });
    console.log("  removed   legacy demo account demo@wasl.app");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
