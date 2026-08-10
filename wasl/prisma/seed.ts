import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { TEMPLATES } from "../src/lib/templates/catalog";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@wasl.app";
const DEMO_PASSWORD = "wasl1234";

async function main() {
  console.log("Seeding Wasl…");

  // ------------------------------------------------------------- demo account
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 11);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: {
      email: DEMO_EMAIL,
      name: "Demo User",
      passwordHash,
      avatarColor: "#6366f1",
      locale: "ar",
    },
  });

  let workspace = await prisma.workspace.findUnique({ where: { slug: "demo" } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "Demo workspace",
        slug: "demo",
        plan: "team",
        creditBalance: 75_000,
        creditsIncluded: 75_000,
        ledger: { create: { delta: 75_000, reason: "monthly_reset", balanceAfter: 75_000 } },
      },
    });
  }

  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: user.id, workspaceId: workspace.id, role: "owner" },
  });

  console.log(`  user      ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  workspace ${workspace.name}`);

  // ---------------------------------------------------------------- templates
  for (const template of TEMPLATES) {
    await prisma.template.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        nameAr: template.nameAr,
        description: template.description,
        descriptionAr: template.descriptionAr,
        category: template.category,
        emoji: template.emoji,
        featured: template.featured,
        installs: template.installs,
        graph: JSON.stringify(template.graph),
      },
      create: {
        slug: template.slug,
        name: template.name,
        nameAr: template.nameAr,
        description: template.description,
        descriptionAr: template.descriptionAr,
        category: template.category,
        emoji: template.emoji,
        featured: template.featured,
        installs: template.installs,
        graph: JSON.stringify(template.graph),
      },
    });
  }
  console.log(`  templates ${TEMPLATES.length}`);

  // ------------------------------------------- a few starter flows in the demo
  const starterSlugs = ["page-summary-arabic", "support-ticket-triage", "lead-enrichment"];
  for (const slug of starterSlugs) {
    const template = TEMPLATES.find((entry) => entry.slug === slug);
    if (!template) continue;

    const existing = await prisma.flow.findFirst({
      where: { workspaceId: workspace.id, name: template.name },
    });
    if (existing) continue;

    await prisma.flow.create({
      data: {
        workspaceId: workspace.id,
        authorId: user.id,
        name: template.name,
        description: template.description,
        emoji: template.emoji,
        graph: JSON.stringify(template.graph),
        triggerType: template.triggerType,
        status: template.triggerType === "webhook" ? "published" : "draft",
        webhookToken: template.triggerType === "webhook" ? `whk_${randomToken()}` : null,
        versions: {
          create: { version: 1, graph: JSON.stringify(template.graph), label: "Installed from template" },
        },
      },
    });
  }
  console.log(`  flows     ${starterSlugs.length} starter flows`);

  console.log("Done.");
}

function randomToken(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let index = 0; index < 24; index += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
