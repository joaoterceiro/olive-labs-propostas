import "dotenv/config";
import pg from "pg";
import { hashSync } from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function cuid() {
  return (
    "c" +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

async function upsertUser(
  email: string,
  name: string,
  resolvePassword: () => string,
  isSuperAdmin: boolean
) {
  // If the admin already exists, do NOT touch the password. This means the
  // SEED_ADMIN_*_PASSWORD env var is only required when seeding into a fresh
  // database (or after the row was wiped), keeping the security guarantee
  // without blocking redeploys of an already-running production stack.
  const existing = await pool.query<{ id: string; email: string }>(
    `SELECT id, email FROM "User" WHERE email = $1 LIMIT 1`,
    [email]
  );
  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE "User" SET "updatedAt" = NOW() WHERE email = $1`,
      [email]
    );
    return existing.rows[0];
  }

  const hash = hashSync(resolvePassword(), 12);
  const res = await pool.query<{ id: string; email: string }>(
    `INSERT INTO "User" (id, name, email, "passwordHash", "isSuperAdmin", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
     RETURNING id, email`,
    [cuid(), name, email, hash, isSuperAdmin]
  );
  return res.rows[0];
}

async function upsertOrg(
  slug: string,
  name: string,
  email: string,
  color: string
) {
  const res = await pool.query(
    `INSERT INTO "Organization" (id, name, slug, email, "primaryColor", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
     ON CONFLICT (slug) DO UPDATE SET "updatedAt" = NOW()
     RETURNING id, name, slug`,
    [cuid(), name, slug, email, color]
  );
  return res.rows[0];
}

async function upsertMembership(userId: string, orgId: string, role: string) {
  await pool.query(
    `INSERT INTO "Membership" (id, "userId", "organizationId", role, "createdAt")
     VALUES ($1, $2, $3, $4::"OrgRole", NOW())
     ON CONFLICT ("userId", "organizationId") DO NOTHING`,
    [cuid(), userId, orgId, role]
  );
}

async function upsertService(
  orgId: string,
  name: string,
  description: string,
  deliverables: string[],
  sortOrder: number
) {
  const existing = await pool.query(
    `SELECT id FROM "Service" WHERE "organizationId" = $1 AND name = $2`,
    [orgId, name]
  );
  if (existing.rows.length > 0) {
    console.log(`  · Service already exists: ${name}`);
    return;
  }
  await pool.query(
    `INSERT INTO "Service" (id, "organizationId", name, description, deliverables, "isDefault", "sortOrder", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())`,
    [cuid(), orgId, name, description, deliverables, sortOrder]
  );
  console.log(`  ✓ Service: ${name} (${deliverables.length} deliverables)`);
}

/**
 * Resolve a seeded super-admin password from env.
 * - In production: env var is REQUIRED. Refuse to seed otherwise to avoid
 *   shipping a known credential to the live database.
 * - In dev: fall back to a random one and print it ONCE so the developer
 *   can copy it from the seed log and log in.
 */
function resolveSeedPassword(envName: string, label: string): string {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `[seed] Refusing to create ${label} without ${envName}. ` +
        `Set this env var to a strong password before running the seed in production.`
    );
  }

  // Dev fallback — random, surfaced ONCE in the log.
  const random =
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10);
  console.warn(
    `[seed] ${envName} not set; generated dev password for ${label}: ${random}`
  );
  return random;
}

async function main() {
  console.log("🌱 Seeding database...");

  const admin = await upsertUser(
    "admin@ello.com.br",
    "Admin ELLO",
    () => resolveSeedPassword("SEED_ADMIN_ELLO_PASSWORD", "admin@ello.com.br"),
    true
  );
  console.log(`  ✓ Super admin: ${admin.email}`);

  const oliveAdmin = await upsertUser(
    "admin@olivelabs.com",
    "Admin Olive Labs",
    () =>
      resolveSeedPassword("SEED_ADMIN_OLIVE_PASSWORD", "admin@olivelabs.com"),
    true
  );
  console.log(`  ✓ Super admin: ${oliveAdmin.email}`);

  const org = await upsertOrg("ello", "ELLO Comunicação", "contato@ello.com.br", "#72619B");
  console.log(`  ✓ Organization: ${org.name} (${org.slug})`);

  const oliveOrg = await upsertOrg("olive-labs", "Olive Labs", "contato@olivelabs.com", "#94C020");
  console.log(`  ✓ Organization: ${oliveOrg.name} (${oliveOrg.slug})`);

  await upsertMembership(admin.id, org.id, "ADMIN");
  console.log(`  ✓ Membership: ${admin.email} -> ${org.slug} (ADMIN)`);

  await upsertMembership(oliveAdmin.id, oliveOrg.id, "ADMIN");
  console.log(`  ✓ Membership: ${oliveAdmin.email} -> ${oliveOrg.slug} (ADMIN)`);

  const services = [
    {
      name: "Gestão de Mídias",
      description: "Estratégia, calendários de conteúdo, engajamento de audiência e monitoramento de performance em mídias sociais.",
      deliverables: ["Atendimento e Planejamento", "Conteúdo/Curadoria/Revisão", "Gestão de Mídias", "Captação de imagens", "Roteiros", "Edição", "Tráfego"],
      sortOrder: 0,
    },
    {
      name: "Diagnóstico de Mídia",
      description: "Análise completa da presença digital: redes sociais, website, tráfego e concorrentes.",
      deliverables: ["Relatório Concorrentes", "Tráfego", "Editorial", "Ação"],
      sortOrder: 1,
    },
    {
      name: "Relatórios",
      description: "Métricas de performance e relatórios mensais com insights acionáveis.",
      deliverables: ["Análise/Métricas", "Relatório", "Conteúdo", "Apresentações"],
      sortOrder: 2,
    },
  ];

  for (const svc of services) {
    await upsertService(org.id, svc.name, svc.description, svc.deliverables, svc.sortOrder);
  }

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => pool.end());
