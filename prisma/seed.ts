import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashSync } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Super Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@ello.com.br" },
    update: {},
    create: {
      name: "Admin ELLO",
      email: "admin@ello.com.br",
      passwordHash: hashSync("admin123", 12),
      isSuperAdmin: true,
      isActive: true,
    },
  });
  console.log(`  ✓ Super admin: ${admin.email}`);

  // 2. Organization demo
  const org = await prisma.organization.upsert({
    where: { slug: "ello" },
    update: {},
    create: {
      name: "ELLO Comunicação",
      slug: "ello",
      email: "contato@ello.com.br",
      phone: "(11) 99999-0000",
      city: "São Paulo",
      state: "SP",
      primaryColor: "#72619B",
      isActive: true,
    },
  });
  console.log(`  ✓ Organization: ${org.name} (${org.slug})`);

  // 3. Membership: admin -> org
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: admin.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      organizationId: org.id,
      role: "ADMIN",
    },
  });
  console.log(`  ✓ Membership: ${admin.email} -> ${org.slug} (ADMIN)`);

  // 4. Initial services (from ello-proposals.jsx INITIAL_SERVICES)
  const services = [
    {
      name: "Gestão de Mídias",
      description:
        "Estratégia, calendários de conteúdo, engajamento de audiência e monitoramento de performance em mídias sociais.",
      deliverables: [
        "Atendimento e Planejamento",
        "Conteúdo/Curadoria/Revisão",
        "Gestão de Mídias",
        "Captação de imagens",
        "Roteiros",
        "Edição",
        "Tráfego",
      ],
      isDefault: true,
      sortOrder: 0,
    },
    {
      name: "Diagnóstico de Mídia",
      description:
        "Análise completa da presença digital: redes sociais, website, tráfego e concorrentes.",
      deliverables: [
        "Relatório Concorrentes",
        "Tráfego",
        "Editorial",
        "Ação",
      ],
      isDefault: true,
      sortOrder: 1,
    },
    {
      name: "Relatórios",
      description:
        "Métricas de performance e relatórios mensais com insights acionáveis.",
      deliverables: [
        "Análise/Métricas",
        "Relatório",
        "Conteúdo",
        "Apresentações",
      ],
      isDefault: true,
      sortOrder: 2,
    },
  ];

  for (const svc of services) {
    const existing = await prisma.service.findFirst({
      where: { organizationId: org.id, name: svc.name },
    });
    if (!existing) {
      await prisma.service.create({
        data: { ...svc, organizationId: org.id },
      });
      console.log(`  ✓ Service: ${svc.name} (${svc.deliverables.length} deliverables)`);
    } else {
      console.log(`  · Service already exists: ${svc.name}`);
    }
  }

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
