/**
 * Idempotent schema repair runner.
 *
 * Why this exists: when the project was first deployed, migrations were
 * applied manually via raw `pg` outside Prisma's tracking table. The
 * auto-baseline in migrate.ts later recorded every migration in
 * _prisma_migrations as "applied" without executing them. The result is a
 * database whose schema doesn't match the Prisma model — Prisma client
 * sends fields like `Proposal.companyName` that don't exist, producing 500s.
 *
 * This script ensures every column and table introduced by migrations
 * 20260328133152..20260421120000 actually exists, using `IF NOT EXISTS`.
 * Running it on a healthy DB is a no-op.
 */
import "dotenv/config";
import pg from "pg";

const STATEMENTS: { label: string; sql: string }[] = [
  // 20260328133152_add_header_footer_images
  {
    label: "Proposal.headerImageUrl",
    sql: `ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "headerImageUrl" TEXT`,
  },
  {
    label: "Proposal.footerImageUrl",
    sql: `ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "footerImageUrl" TEXT`,
  },
  {
    label: "Proposal.bodyImages",
    sql: `ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "bodyImages" JSONB`,
  },
  {
    label: "Organization.defaultHeaderImage",
    sql: `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "defaultHeaderImage" TEXT`,
  },
  {
    label: "Organization.defaultFooterImage",
    sql: `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "defaultFooterImage" TEXT`,
  },

  // 20260402114128_add_content_blocks
  {
    label: "Proposal.contentBlocks",
    sql: `ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "contentBlocks" JSONB`,
  },

  // 20260404201550_add_user_phone
  {
    label: "User.phone",
    sql: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT`,
  },

  // 20260407120000_add_proposal_company_name
  {
    label: "Proposal.companyName",
    sql: `ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "companyName" TEXT`,
  },

  // 20260421120000_add_password_reset_token
  {
    label: "PasswordResetToken table",
    sql: `
      CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
        "id"        TEXT NOT NULL,
        "userId"    TEXT NOT NULL,
        "tokenHash" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "usedAt"    TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
      )
    `,
  },
  {
    label: "PasswordResetToken.tokenHash unique",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash")`,
  },
  {
    label: "PasswordResetToken.userId index",
    sql: `CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId")`,
  },
  {
    label: "PasswordResetToken.expiresAt index",
    sql: `CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt")`,
  },
  {
    label: "PasswordResetToken.userId FK",
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'PasswordResetToken_userId_fkey'
            AND connamespace = 'public'::regnamespace
        ) THEN
          ALTER TABLE "PasswordResetToken"
            ADD CONSTRAINT "PasswordResetToken_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$
    `,
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const client = await pool.connect();

  // Collect every failure so the operator sees the full picture,
  // instead of bailing on the first error and hiding what else broke.
  const failures: { label: string; message: string }[] = [];
  let succeeded = 0;

  try {
    for (const stmt of STATEMENTS) {
      try {
        await client.query(stmt.sql);
        process.stdout.write(`✓ ${stmt.label}\n`);
        succeeded++;
      } catch (err) {
        const message = (err as Error).message;
        console.error(`✗ ${stmt.label}: ${message}`);
        failures.push({ label: stmt.label, message });
      }
    }

    if (failures.length === 0) {
      console.log(`Repair complete. Processed ${succeeded} statement(s).`);
    } else {
      console.error(
        `Repair finished with ${failures.length} failure(s) of ${STATEMENTS.length}:`
      );
      for (const f of failures) console.error(`  - ${f.label}: ${f.message}`);
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Repair failed:", err);
  process.exit(1);
});
