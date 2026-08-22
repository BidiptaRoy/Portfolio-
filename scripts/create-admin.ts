import { createInterface } from "node:readline";

import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

import { newAdminSchema } from "../src/lib/validation/auth";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

/**
 * Creates or updates the single administrator.
 *
 * This is the ONLY way an AdminUser row comes into existence. There is no
 * registration endpoint, no invite flow, and no "first user becomes admin"
 * rule anywhere in the codebase — that absence is the strongest control this
 * application has, and it costs nothing. Do not add one.
 *
 *   npm run admin:create
 *
 * The password is read from a hidden prompt rather than an argument or an
 * environment variable, so it never lands in shell history, in a process
 * listing, or in a file.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  }),
});

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** Prompts without echoing what is typed. */
function askHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

  process.stdout.write(question);

  // Suppress echo. readline has no public API for this; overriding the
  // internal writer is the standard approach and has been stable for years.
  const mutable = rl as unknown as { _writeToOutput: (text: string) => void };
  mutable._writeToOutput = () => {};

  return new Promise((resolve) => {
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  console.log("\nCreate or update the site administrator.\n");

  const email = (await ask("Email: ")).toLowerCase();
  const name = await ask("Display name (optional): ");
  const password = await askHidden("Password: ");
  const confirm = await askHidden("Confirm password: ");

  if (password !== confirm) {
    console.error("\nPasswords do not match. Nothing was changed.");
    process.exit(1);
  }

  const parsed = newAdminSchema.safeParse({
    email,
    password,
    name: name === "" ? undefined : name,
  });

  if (!parsed.success) {
    console.error("\nInvalid input:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".") || "input"}: ${issue.message}`);
    }
    process.exit(1);
  }

  // argon2id with the library defaults (m=19456, t=2, p=1), which follow the
  // OWASP recommendation. Never store the password itself, and never use a
  // fast general-purpose hash such as SHA-256 here — the whole point is that
  // verification is deliberately slow.
  const passwordHash = await hash(parsed.data.password, { algorithm: 2 });

  const existing = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email },
  });

  await prisma.adminUser.upsert({
    where: { email: parsed.data.email },
    update: { passwordHash, name: parsed.data.name ?? null },
    create: {
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name ?? null,
    },
  });

  const total = await prisma.adminUser.count();

  console.log(`\n✓ Administrator ${existing ? "updated" : "created"}: ${parsed.data.email}`);
  console.log(`  Admin accounts in database: ${total}`);

  if (total > 1) {
    console.warn(
      "\n⚠ More than one admin account exists. This site is designed for exactly one.\n" +
        "  Review with `npm run db:studio` and remove any account you do not recognise.",
    );
  }

  console.log("\nSign in at /login\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("\nFailed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
