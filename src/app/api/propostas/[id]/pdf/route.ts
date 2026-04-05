import { prisma } from "@/lib/prisma";
import {
  requireSession,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/prisma-tenant";
import { getFileUrl } from "@/lib/minio";
import { fmt, fmtDate } from "@/lib/utils";
import type { ProposalBodyImage, ContentBlock } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(str: string): string {
  return escapeHtml(str).replace(/\n/g, "<br/>");
}

// ── HTML builder ─────────────────────────────────────────────────────────────

interface PdfData {
  org: {
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  };
  proposal: {
    number: string;
    clientName: string;
    projectName: string;
    date: string;
    observations: string | null;
    totalValue: number;
    totalHours: number;
    headerImageUrl: string | null;
    footerImageUrl: string | null;
    bodyImages: ProposalBodyImage[];
    contentBlocks: ContentBlock[];
  };
  items: {
    serviceName: string;
    description: string | null;
    customName: string | null;
    customDescription: string | null;
    hours: number;
    hourlyRate: number;
    subtotal: number;
    selectedDeliverables: string[];
  }[];
  userName: string;
}

function buildBodyImageHTML(images: ProposalBodyImage[], position: ProposalBodyImage["position"]): string {
  return images
    .filter((img) => img.position === position)
    .map(
      (img) =>
        `<div style="text-align:center;margin:16px 0;">
          <img src="${escapeHtml(img.url)}" style="max-width:${img.width}%;height:auto;border-radius:8px;" />
          ${img.caption ? `<p style="font-size:9px;color:#b0aab8;margin-top:4px;">${escapeHtml(img.caption)}</p>` : ""}
        </div>`
    )
    .join("");
}

function buildContentBlocksHTML(
  blocks: ContentBlock[],
  items: PdfData["items"],
  proposal: PdfData["proposal"],
  color: string,
  colorLight: string,
  colorMedium: string,
  fmtBRL: (v: number) => string
): string {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  let html = "";

  for (const block of sorted) {
    switch (block.type) {
      case "client-info":
        html += `
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${color};font-weight:700;margin-bottom:12px;">
          Dados do Cliente
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;background:#fafafe;border-radius:10px;padding:16px 20px;border:1px solid #e8e4ef;">
          <div>
            <div style="font-size:9px;font-weight:600;text-transform:uppercase;color:#78718a;letter-spacing:0.8px;">Cliente</div>
            <div style="font-size:13px;font-weight:500;color:#2d2640;margin-top:2px;">${escapeHtml(proposal.clientName)}</div>
          </div>
          <div>
            <div style="font-size:9px;font-weight:600;text-transform:uppercase;color:#78718a;letter-spacing:0.8px;">Projeto</div>
            <div style="font-size:13px;font-weight:500;color:#2d2640;margin-top:2px;">${escapeHtml(proposal.projectName)}</div>
          </div>
          <div>
            <div style="font-size:9px;font-weight:600;text-transform:uppercase;color:#78718a;letter-spacing:0.8px;">Data</div>
            <div style="font-size:13px;font-weight:500;color:#2d2640;margin-top:2px;">${escapeHtml(proposal.date)}</div>
          </div>
        </div>
      </div>`;
        break;

      case "services":
        // Service detail cards
        html += `
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${color};font-weight:700;margin-bottom:20px;">
        Escopo dos Servicos
      </div>`;
        for (const item of items) {
          const name = item.customName || item.serviceName;
          const desc = item.customDescription || item.description || "";
          const deliverables = item.selectedDeliverables || [];
          html += `
      <div style="margin-bottom:20px;padding:18px 20px;background:#fafafe;border-radius:12px;border:1px solid #e8e4ef;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:${desc || deliverables.length > 0 ? "10" : "0"}px;">
          <div style="font-size:14px;font-weight:700;color:#2d2640;">${escapeHtml(name)}</div>
          <div style="font-size:13px;font-weight:700;color:${color};white-space:nowrap;margin-left:16px;">${fmtBRL(item.subtotal)}</div>
        </div>
        ${desc ? `<div style="font-size:11px;color:#78718a;line-height:1.5;margin-bottom:${deliverables.length > 0 ? "10" : "0"}px;">${nl2br(desc)}</div>` : ""}
        ${deliverables.length > 0
          ? `<div style="display:flex;flex-wrap:wrap;gap:5px;">
              ${deliverables.map((d) => `<span style="display:inline-block;background:${colorLight};color:${color};font-size:9px;padding:3px 10px;border-radius:12px;font-weight:600;">${escapeHtml(d)}</span>`).join("")}
            </div>`
          : ""}
        <div style="margin-top:8px;font-size:10px;color:#b0aab8;">${item.hours}h &times; ${fmtBRL(item.hourlyRate)}/h</div>
      </div>`;
        }
        break;

      case "text":
        html += `
      <div style="margin-bottom:24px;font-size:12px;color:#374151;line-height:1.7;" class="text-block">
        ${block.content || ""}
      </div>`;
        break;

      case "image":
        if (block.url) {
          html += `
      <div style="text-align:center;margin-bottom:24px;">
        <img src="${escapeHtml(block.url)}" style="max-width:${block.width ?? 100}%;height:auto;border-radius:8px;" />
        ${block.caption ? `<p style="font-size:9px;color:#b0aab8;margin-top:4px;">${escapeHtml(block.caption)}</p>` : ""}
      </div>`;
        }
        break;
    }
  }

  return html;
}

function buildProposalHTML(data: PdfData): string {
  const { org, proposal, items, userName } = data;
  const color = org.primaryColor || "#94C020";

  const colorLight = `${color}18`;
  const colorMedium = `${color}30`;

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Build logo HTML
  const logoHtml = org.logoUrl
    ? `<img src="${org.logoUrl}" alt="${escapeHtml(org.name)}" style="max-height:48px;max-width:180px;object-fit:contain;" />`
    : `<div style="font-size:28px;font-weight:800;color:${color};letter-spacing:-0.5px;font-family:'Montserrat',sans-serif;">${escapeHtml(org.name)}</div>`;

  // Build service rows
  const serviceRows = items
    .map((item) => {
      const name = item.customName || item.serviceName;
      const desc = item.customDescription || item.description || "";
      const deliverables = item.selectedDeliverables || [];

      return `
      <tr>
        <td style="padding:12px 14px;border-bottom:1px solid #e8e4ef;font-size:12px;color:#2d2640;">
          <strong style="font-size:13px;">${escapeHtml(name)}</strong>
          ${desc ? `<br/><span style="color:#78718a;font-size:11px;line-height:1.4;">${escapeHtml(desc)}</span>` : ""}
          ${
            deliverables.length > 0
              ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
                  ${deliverables.map((d) => `<span style="display:inline-block;background:${colorLight};color:${color};font-size:9px;padding:3px 10px;border-radius:12px;font-weight:600;letter-spacing:0.2px;">${escapeHtml(d)}</span>`).join("")}
                </div>`
              : ""
          }
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid #e8e4ef;font-size:12px;color:#2d2640;text-align:center;font-weight:500;">${item.hours}h</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e8e4ef;font-size:12px;color:#2d2640;text-align:right;">${fmtBRL(item.hourlyRate)}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e8e4ef;font-size:12px;color:#2d2640;text-align:right;font-weight:700;">${fmtBRL(item.subtotal)}</td>
      </tr>`;
    })
    .join("");

  // Build contact footer parts
  const contactParts: string[] = [];
  if (org.email) contactParts.push(escapeHtml(org.email));
  if (org.phone) contactParts.push(escapeHtml(org.phone));
  if (org.website) contactParts.push(escapeHtml(org.website));
  const contactLine = contactParts.join(" &bull; ");

  const addressParts: string[] = [];
  if (org.address) addressParts.push(escapeHtml(org.address));
  if (org.city && org.state) addressParts.push(`${escapeHtml(org.city)} - ${escapeHtml(org.state)}`);
  else if (org.city) addressParts.push(escapeHtml(org.city));
  const addressLine = addressParts.join(", ");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=794"/>
  <title>Proposta ${escapeHtml(proposal.number)} - ${escapeHtml(proposal.projectName)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');

    * { margin:0; padding:0; box-sizing:border-box; }

    @page {
      size: A4;
      margin: 0;
    }

    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #0C0A16;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 794px;
      min-height: 1123px;
      position: relative;
      padding: 0;
      page-break-after: always;
      overflow: hidden;
    }

    .page:last-child {
      page-break-after: auto;
    }

    @media print {
      body { background: #fff; }
      .page { box-shadow: none; }
      .no-print { display: none !important; }
    }

    .text-block h2 {
      font-size: 16px;
      font-weight: 700;
      color: #1A1625;
      margin-bottom: 8px;
      margin-top: 16px;
    }
    .text-block h3 {
      font-size: 13px;
      font-weight: 700;
      color: #1A1625;
      margin-bottom: 6px;
      margin-top: 12px;
    }
    .text-block p {
      margin-bottom: 8px;
    }
    .text-block ul, .text-block ol {
      margin-left: 20px;
      margin-bottom: 8px;
    }
    .text-block li {
      margin-bottom: 4px;
    }
    .text-block a {
      color: #94C020;
      text-decoration: underline;
    }
    .text-block strong {
      font-weight: 700;
      color: #1A1625;
    }
    .text-block em {
      font-style: italic;
    }
    .text-block u {
      text-decoration: underline;
    }

    @media screen {
      body {
        background: #f0edf5;
        padding: 24px 0;
      }
      .page {
        margin: 0 auto 24px auto;
        box-shadow: 0 4px 24px rgba(12,10,22,0.12);
        border-radius: 4px;
      }
    }
  </style>
</head>
<body>

  <!-- ═══════════ PAGE 1: COVER ═══════════ -->
  <div class="page">
    <!-- Top accent bar -->
    <div style="height:6px;background:linear-gradient(90deg, ${color}, ${color}aa);"></div>

    ${proposal.headerImageUrl ? `<img src="${escapeHtml(proposal.headerImageUrl)}" alt="" style="width:100%;max-height:140px;object-fit:cover;display:block;" />` : ""}

    <!-- Header with logo -->
    <div style="padding:${proposal.headerImageUrl ? "16px" : "40px"} 48px 0 48px;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>${logoHtml}</div>
      <div style="text-align:right;font-size:11px;color:#78718a;">
        <div style="font-weight:600;color:#2d2640;font-size:12px;">Proposta ${escapeHtml(proposal.number)}</div>
        <div style="margin-top:2px;">${escapeHtml(proposal.date)}</div>
      </div>
    </div>

    <!-- Cover content -->
    <div style="padding:120px 48px 0 48px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${color};font-weight:700;margin-bottom:16px;">
        Proposta Comercial
      </div>

      <h1 style="font-size:36px;font-weight:800;color:#0C0A16;line-height:1.15;margin-bottom:24px;max-width:560px;">
        ${escapeHtml(proposal.projectName)}
      </h1>

      <div style="width:60px;height:4px;background:${color};border-radius:2px;margin-bottom:32px;"></div>

      <div style="font-size:14px;color:#78718a;margin-bottom:8px;">Preparado para</div>
      <div style="font-size:22px;font-weight:700;color:#2d2640;">${escapeHtml(proposal.clientName)}</div>
    </div>

    <!-- Investment highlight -->
    <div style="position:absolute;bottom:120px;left:48px;right:48px;">
      <div style="background:linear-gradient(135deg, ${color}10, ${color}08);border:1px solid ${color}20;border-radius:16px;padding:32px 36px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#78718a;font-weight:600;margin-bottom:4px;">Investimento Total</div>
          <div style="font-size:32px;font-weight:800;color:${color};">${fmtBRL(proposal.totalValue)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#78718a;font-weight:600;margin-bottom:4px;">Horas Estimadas</div>
          <div style="font-size:24px;font-weight:700;color:#2d2640;">${proposal.totalHours}h</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:${proposal.footerImageUrl ? "0" : "32px"};left:0;right:0;text-align:center;">
      <div style="font-size:9px;color:#b0aab8;border-top:1px solid #e8e4ef;padding:12px 48px;margin:0 ${proposal.footerImageUrl ? "0" : "48px"};">
        ${contactLine ? contactLine : escapeHtml(org.name)}
        ${addressLine ? `<br/>${addressLine}` : ""}
      </div>
      ${proposal.footerImageUrl ? `<img src="${escapeHtml(proposal.footerImageUrl)}" alt="" style="width:100%;max-height:100px;object-fit:cover;display:block;" />` : ""}
    </div>
  </div>

  <!-- ═══════════ PAGE 2: SERVICES / CONTENT BLOCKS ═══════════ -->
  <div class="page">
    <div style="height:6px;background:linear-gradient(90deg, ${color}, ${color}aa);"></div>

    ${proposal.headerImageUrl ? `<img src="${escapeHtml(proposal.headerImageUrl)}" alt="" style="width:100%;max-height:140px;object-fit:cover;display:block;" />` : ""}

    <div style="padding:${proposal.headerImageUrl ? "16px" : "40px"} 48px 0 48px;">
      <!-- Page header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid ${color};">
        <div style="font-size:15px;font-weight:800;color:${color};font-family:'Montserrat',sans-serif;">${escapeHtml(org.name)}</div>
        <div style="font-size:10px;color:#78718a;">Proposta ${escapeHtml(proposal.number)}</div>
      </div>

      ${proposal.contentBlocks.length > 0
        ? buildContentBlocksHTML(proposal.contentBlocks, items, proposal, color, colorLight, colorMedium, fmtBRL)
        : `
      <!-- Section title -->
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${color};font-weight:700;margin-bottom:20px;">
        Escopo dos Servicos
      </div>

      <!-- Services detail -->
      ${items
        .map(
          (item, i) => {
            const name = item.customName || item.serviceName;
            const desc = item.customDescription || item.description || "";
            const deliverables = item.selectedDeliverables || [];

            return `
      <div style="margin-bottom:20px;padding:18px 20px;background:#fafafe;border-radius:12px;border:1px solid #e8e4ef;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:${desc || deliverables.length > 0 ? "10" : "0"}px;">
          <div style="font-size:14px;font-weight:700;color:#2d2640;">${escapeHtml(name)}</div>
          <div style="font-size:13px;font-weight:700;color:${color};white-space:nowrap;margin-left:16px;">${fmtBRL(item.subtotal)}</div>
        </div>
        ${desc ? `<div style="font-size:11px;color:#78718a;line-height:1.5;margin-bottom:${deliverables.length > 0 ? "10" : "0"}px;">${nl2br(desc)}</div>` : ""}
        ${
          deliverables.length > 0
            ? `<div style="display:flex;flex-wrap:wrap;gap:5px;">
                ${deliverables.map((d) => `<span style="display:inline-block;background:${colorLight};color:${color};font-size:9px;padding:3px 10px;border-radius:12px;font-weight:600;">${escapeHtml(d)}</span>`).join("")}
              </div>`
            : ""
        }
        <div style="margin-top:8px;font-size:10px;color:#b0aab8;">${item.hours}h &times; ${fmtBRL(item.hourlyRate)}/h</div>
      </div>`;
          }
        )
        .join("")}

      ${buildBodyImageHTML(proposal.bodyImages, "after-services")}`
      }
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:${proposal.footerImageUrl ? "0" : "32px"};left:0;right:0;text-align:center;">
      <div style="font-size:9px;color:#b0aab8;border-top:1px solid #e8e4ef;padding:12px 48px;margin:0 ${proposal.footerImageUrl ? "0" : "48px"};">
        ${contactLine ? contactLine : escapeHtml(org.name)} &bull; Pagina 2
      </div>
      ${proposal.footerImageUrl ? `<img src="${escapeHtml(proposal.footerImageUrl)}" alt="" style="width:100%;max-height:100px;object-fit:cover;display:block;" />` : ""}
    </div>
  </div>

  <!-- ═══════════ PAGE 3: INVESTMENT ═══════════ -->
  <div class="page">
    <div style="height:6px;background:linear-gradient(90deg, ${color}, ${color}aa);"></div>

    ${proposal.headerImageUrl ? `<img src="${escapeHtml(proposal.headerImageUrl)}" alt="" style="width:100%;max-height:140px;object-fit:cover;display:block;" />` : ""}

    <div style="padding:${proposal.headerImageUrl ? "16px" : "40px"} 48px 0 48px;">
      <!-- Page header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid ${color};">
        <div style="font-size:15px;font-weight:800;color:${color};font-family:'Montserrat',sans-serif;">${escapeHtml(org.name)}</div>
        <div style="font-size:10px;color:#78718a;">Proposta ${escapeHtml(proposal.number)}</div>
      </div>

      <!-- Section title -->
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${color};font-weight:700;margin-bottom:20px;">
        Resumo do Investimento
      </div>

      ${buildBodyImageHTML(proposal.bodyImages, "after-client")}

      <!-- Summary table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr>
            <th style="padding:12px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${color};background:${colorLight};border-bottom:2px solid ${colorMedium};text-align:left;border-radius:8px 0 0 0;">Servico</th>
            <th style="padding:12px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${color};background:${colorLight};border-bottom:2px solid ${colorMedium};text-align:center;">Horas</th>
            <th style="padding:12px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${color};background:${colorLight};border-bottom:2px solid ${colorMedium};text-align:right;">Valor/h</th>
            <th style="padding:12px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${color};background:${colorLight};border-bottom:2px solid ${colorMedium};text-align:right;border-radius:0 8px 0 0;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${serviceRows}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="display:flex;justify-content:flex-end;gap:32px;padding:20px 0;border-top:3px solid ${color};">
        <div style="text-align:right;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#78718a;font-weight:600;">Total Horas</div>
          <div style="font-size:18px;font-weight:700;color:#2d2640;margin-top:4px;">${proposal.totalHours}h</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#78718a;font-weight:600;">Valor Total</div>
          <div style="font-size:24px;font-weight:800;color:${color};margin-top:4px;">${fmtBRL(proposal.totalValue)}</div>
        </div>
      </div>

      ${
        proposal.observations
          ? `
      <!-- Observations -->
      <div style="margin-top:28px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:${color};font-weight:700;margin-bottom:12px;">
          Observacoes
        </div>
        <div style="background:#fafafe;border-radius:12px;padding:18px 20px;font-size:12px;color:#4a4458;line-height:1.6;white-space:pre-wrap;border:1px solid #e8e4ef;">
          ${nl2br(proposal.observations)}
        </div>
      </div>`
          : ""
      }

      ${buildBodyImageHTML(proposal.bodyImages, "after-observations")}

      <!-- Validity -->
      <div style="margin-top:32px;padding:20px 24px;background:linear-gradient(135deg, ${color}10, ${color}06);border:1px solid ${color}20;border-radius:12px;">
        <div style="font-size:11px;font-weight:700;color:#2d2640;margin-bottom:6px;">Validade da Proposta</div>
        <div style="font-size:12px;color:#78718a;line-height:1.5;">
          Esta proposta e valida por <strong style="color:${color};">30 dias</strong> a partir da data de emissao (${escapeHtml(proposal.date)}).
          Apos este periodo, os valores e condicoes poderao ser revisados.
        </div>
      </div>

      <!-- Prepared by -->
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8e4ef;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#78718a;font-weight:600;margin-bottom:4px;">Elaborado por</div>
          <div style="font-size:13px;font-weight:600;color:#2d2640;">${escapeHtml(userName)}</div>
          <div style="font-size:11px;color:#78718a;">${escapeHtml(org.name)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#78718a;font-weight:600;margin-bottom:4px;">Data</div>
          <div style="font-size:13px;font-weight:600;color:#2d2640;">${escapeHtml(proposal.date)}</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:${proposal.footerImageUrl ? "0" : "32px"};left:0;right:0;text-align:center;">
      <div style="font-size:9px;color:#b0aab8;border-top:1px solid #e8e4ef;padding:12px 48px;margin:0 ${proposal.footerImageUrl ? "0" : "48px"};">
        ${contactLine ? contactLine : escapeHtml(org.name)}
        ${addressLine ? `<br/>${addressLine}` : ""}
        <br/>Proposta valida por 30 dias &bull; Documento confidencial
      </div>
      ${proposal.footerImageUrl ? `<img src="${escapeHtml(proposal.footerImageUrl)}" alt="" style="width:100%;max-height:100px;object-fit:cover;display:block;" />` : ""}
    </div>
  </div>

  <!-- Print button (screen only) -->
  <div class="no-print" style="position:fixed;bottom:24px;right:24px;z-index:1000;">
    <button onclick="window.print()" style="
      background:${color};color:#fff;border:none;padding:14px 28px;
      border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;
      font-family:'Montserrat',sans-serif;box-shadow:0 4px 16px ${color}40;
      display:flex;align-items:center;gap:8px;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Salvar como PDF
    </button>
  </div>

</body>
</html>`;
}

// ── GET /api/propostas/[id]/pdf ──────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return unauthorizedResponse();
  }

  const orgId = session.organizationId;
  if (!orgId) return unauthorizedResponse();

  const { id } = await params;

  // Fetch proposal with relations
  const proposal = await prisma.proposal.findFirst({
    where: { id, organizationId: orgId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!proposal) return notFoundResponse();

  // Fetch organization for branding
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      email: true,
      phone: true,
      website: true,
      address: true,
      city: true,
      state: true,
    },
  });

  if (!org) return errorResponse("Organizacao nao encontrada", 404);

  // Resolve logo URL if stored in MinIO
  let resolvedLogoUrl = org.logoUrl;
  if (resolvedLogoUrl && !resolvedLogoUrl.startsWith("http")) {
    try {
      resolvedLogoUrl = await getFileUrl("logos", resolvedLogoUrl, 3600);
    } catch {
      resolvedLogoUrl = null;
    }
  }

  // Build data for HTML generation
  const pdfData: PdfData = {
    org: {
      ...org,
      logoUrl: resolvedLogoUrl,
    },
    proposal: {
      number: proposal.number,
      clientName: proposal.clientName,
      projectName: proposal.projectName,
      date: fmtDate(proposal.date),
      observations: proposal.observations,
      totalValue: Number(proposal.totalValue),
      totalHours: Number(proposal.totalHours),
      headerImageUrl: proposal.headerImageUrl ?? null,
      footerImageUrl: proposal.footerImageUrl ?? null,
      bodyImages: (proposal.bodyImages as ProposalBodyImage[] | null) ?? [],
      contentBlocks: (proposal.contentBlocks as ContentBlock[] | null) ?? [],
    },
    items: proposal.items.map((item) => ({
      serviceName: item.serviceName,
      description: item.description,
      customName: item.customName,
      customDescription: item.customDescription,
      hours: Number(item.hours),
      hourlyRate: Number(item.hourlyRate),
      subtotal: Number(item.subtotal),
      selectedDeliverables: (item.selectedDeliverables as string[]) || [],
    })),
    userName: proposal.user?.name || session.name || "Consultor",
  };

  const html = buildProposalHTML(pdfData);

  const safeFilename = `proposta-${proposal.number.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;

  // Generate PDF using Puppeteer
  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    await browser.close();

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("PDF generation error:", e);
    // Fallback: return HTML if Puppeteer fails
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${safeFilename.replace('.pdf', '.html')}"`,
        "Cache-Control": "no-store",
      },
    });
  }
}
