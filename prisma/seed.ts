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
  password: string,
  isSuperAdmin: boolean
) {
  const hash = hashSync(password, 12);
  const res = await pool.query(
    `INSERT INTO "User" (id, name, email, "passwordHash", "isSuperAdmin", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET "updatedAt" = NOW()
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

async function main() {
  console.log("🌱 Seeding database...");

  const admin = await upsertUser("admin@ello.com.br", "Admin ELLO", "admin123", true);
  console.log(`  ✓ Super admin: ${admin.email}`);

  const oliveAdmin = await upsertUser("admin@olivelabs.com", "Admin Olive Labs", "olive@2024", true);
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
