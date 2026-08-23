import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

// See prisma.config.ts — the CLI does not read .env.local on its own.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

import { education } from "../src/content/education";
import { experience } from "../src/content/experience";
import { profile, socialLinks } from "../src/content/profile";
import { projects } from "../src/content/projects";
import { resumeVersions } from "../src/content/resume";
import { skills } from "../src/content/skills";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Seeds the database from the typed content modules in src/content.
 *
 * This is the payoff for having written the content as typed modules in
 * Phase 3 rather than hardcoding it into components: the same files that fed
 * the site for the last three phases become the seed, with no transformation
 * and no transcription errors.
 *
 * Every write is an `upsert` keyed on the natural unique column, so the script
 * is safe to run repeatedly. Re-running it restores the content files as the
 * source of truth — which is exactly what you want before the CMS exists, and
 * exactly what you must be careful about afterwards: once Bidipta is editing
 * through /admin, re-seeding will overwrite those edits with whatever is in
 * src/content. See the warning in docs/roadmap.md.
 *
 * Relative imports are used rather than the `@/` alias because this runs under
 * tsx outside the Next build, where the alias is not guaranteed to resolve.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    // Migrations and seeding use the DIRECT connection: they hold a session
    // open, which a transaction pooler does not support.
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  }),
});

async function main() {
  // The photo is deliberately left out of the UPDATE. Re-seeding is expected
  // to overwrite text with whatever src/content says — that is the documented
  // point of it — but src/content has no photo to say anything about, so
  // including it would silently reset an uploaded portrait to null and orphan
  // the file. Uploaded media is not the seed's to reset.
  // `undefined` is Prisma's "leave this column alone" in an update, which is
  // exactly the intent — as opposed to null, which would clear it.
  await prisma.profile.upsert({
    where: { id: "singleton" },
    update: { ...profile, photoUrl: undefined },
    create: { id: "singleton", ...profile },
  });
  console.log("✓ profile (photo left untouched — uploads are not seeded)");

  for (const project of projects) {
    await prisma.project.upsert({
      where: { slug: project.slug },
      update: project,
      create: project,
    });
  }
  console.log(`✓ ${projects.length} projects`);

  for (const entry of experience) {
    await prisma.experience.upsert({
      where: { slug: entry.slug },
      update: entry,
      create: entry,
    });
  }
  console.log(`✓ ${experience.length} experience entries`);

  for (const entry of education) {
    await prisma.education.upsert({
      where: { slug: entry.slug },
      update: entry,
      create: entry,
    });
  }
  console.log(`✓ ${education.length} education entries`);

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: skill,
      create: skill,
    });
  }
  console.log(`✓ ${skills.length} skills`);

  for (const link of socialLinks) {
    await prisma.socialLink.upsert({
      where: { platform: link.platform },
      update: link,
      create: link,
    });
  }
  console.log(`✓ ${socialLinks.length} social links`);

  // ResumeVersion has no natural unique key — a person can have many
  // revisions with the same label. Matched on fileUrl, which is unique in
  // practice because each upload lands at its own path.
  for (const resume of resumeVersions) {
    const existing = await prisma.resumeVersion.findFirst({
      where: { fileUrl: resume.fileUrl },
    });

    if (existing) {
      await prisma.resumeVersion.update({ where: { id: existing.id }, data: resume });
    } else {
      await prisma.resumeVersion.create({ data: resume });
    }
  }
  console.log(`✓ ${resumeVersions.length} resume versions`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("\nSeed complete.");
  })
  .catch(async (error: unknown) => {
    console.error("\nSeed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
