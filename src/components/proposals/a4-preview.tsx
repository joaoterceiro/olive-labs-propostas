"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { ContentBlock } from "@/types";

interface PreviewService {
  name: string;
  description: string;
  hours: number;
  hourlyRate: number;
  deliverables: string[];
}

interface A4PreviewProps {
  clientName: string;
  projectName: string;
  date: string;
  services: PreviewService[];
  orgName: string;
  headerImageUrl?: string;
  footerImageUrl?: string;
  contentBlocks?: ContentBlock[];
}

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

// Design system tokens
const DS = {
  purple50: "#F7F6F3",
  purple100: "#F1F1EF",
  purple200: "#E3E2DE",
  purple300: "#D3D1CB",
  purple400: "#B4B4B0",
  purple500: "#94C020",
  purple600: "#7DA61A",
  purple700: "#37352F",
  purple900: "#37352F",
  neutral100: "#F7F6F3",
  neutral200: "#E3E2DE",
  neutral300: "#D3D1CB",
  neutral400: "#787774",
  neutral500: "#787774",
  neutral700: "#37352F",
  neutral900: "#37352F",
  ink: "#37352F",
  cream: "#FFFFFF",
};

function buildClientInfoHTML(clientName: string, projectName: string, formattedDate: string): string {
  return `
    <div class="section">
      <div class="section-title">Dados do Cliente</div>
      <div class="info-grid">
        <div class="info-item">
          <label>Cliente</label>
          <p>${clientName || "-"}</p>
        </div>
        <div class="info-item">
          <label>Projeto</label>
          <p>${projectName || "-"}</p>
        </div>
        <div class="info-item">
          <label>Data</label>
          <p>${formattedDate || "-"}</p>
        </div>
      </div>
    </div>`;
}

function buildServicesHTML(services: PreviewService[]): string {
  const totalHours = services.reduce((s, svc) => s + svc.hours, 0);
  const totalValue = services.reduce(
    (s, svc) => s + svc.hours * svc.hourlyRate,
    0
  );

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const serviceRows = services
    .map(
      (svc) => `
      <tr>
        <td class="svc-cell">
          <div class="svc-name">${svc.name}</div>
          ${svc.description ? `<div class="svc-desc">${svc.description}</div>` : ""}
          ${
            svc.deliverables.length > 0
              ? `<div class="tags">${svc.deliverables.map((d) => `<span class="tag">${d}</span>`).join("")}</div>`
              : ""
          }
        </td>
        <td class="num-cell center">${svc.hours}</td>
        <td class="num-cell right">${fmtBRL(svc.hourlyRate)}</td>
        <td class="num-cell right bold">${fmtBRL(svc.hours * svc.hourlyRate)}</td>
      </tr>`
    )
    .join("");

  if (services.length > 0) {
    return `
    <div class="section">
      <div class="section-title">Servicos</div>
      <div style="border:1px solid ${DS.neutral200};border-radius:10px;overflow:hidden;">
        <table>
          <thead>
            <tr>
              <th>Servico</th>
              <th>Horas</th>
              <th>Valor/h</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${serviceRows}
          </tbody>
        </table>
        <div class="totals-bar">
          <div class="total-item">
            <label>Total Horas</label>
            <div class="val">${totalHours}h</div>
          </div>
          <div class="total-item">
            <label>Valor Total</label>
            <div class="val highlight">${fmtBRL(totalValue)}</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  return `
    <div class="section">
      <div class="section-title">Servicos</div>
      <p class="empty-msg">Selecione servicos no painel esquerdo</p>
    </div>`;
}

function buildHTML(props: A4PreviewProps): string {
  const {
    clientName,
    projectName,
    date,
    services,
    orgName,
    headerImageUrl,
    footerImageUrl,
    contentBlocks,
  } = props;

  const formattedDate = date
    ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR")
    : "";

  // Build content sections from blocks or auto-generate
  let contentSections = "";
  const hasBlocks = contentBlocks && contentBlocks.length > 0;
  const hasData = clientName || projectName || services.length > 0;

  if (hasBlocks) {
    // Render blocks in order
    const sorted = [...contentBlocks].sort((a, b) => a.order - b.order);
    for (const block of sorted) {
      switch (block.type) {
        case "client-info":
          contentSections += buildClientInfoHTML(clientName, projectName, formattedDate);
          break;
        case "services":
          contentSections += buildServicesHTML(services);
          break;
        case "text":
          contentSections += `<div class="section text-block">${block.content || ""}</div>`;
          break;
        case "image":
          if (block.url) {
            contentSections += `<div class="section" style="text-align:center;">
              <img src="${block.url}" style="max-width:${block.width ?? 100}%;height:auto;border-radius:10px;" />
              ${block.caption ? `<p style="font-size:9px;color:${DS.neutral400};margin-top:6px;font-style:italic;">${block.caption}</p>` : ""}
            </div>`;
          }
          break;
      }
    }
  } else if (hasData) {
    // Auto-generate when no blocks but user has data
    if (clientName || projectName) {
      contentSections += buildClientInfoHTML(clientName, projectName, formattedDate);
    }
    if (services.length > 0) {
      contentSections += buildServicesHTML(services);
    }
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }

    body {
      font-family: 'Montserrat', -apple-system, sans-serif;
      width: ${A4_WIDTH}px;
      min-height: ${A4_HEIGHT}px;
      background: #fff;
      color: ${DS.ink};
      position: relative;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Header/Footer images (full-bleed) ── */
    .header-image img {
      width: 100%;
      height: auto;
      display: block;
      max-height: 140px;
      object-fit: cover;
    }
    .footer-image {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
    }
    .footer-image img {
      width: 100%;
      height: auto;
      display: block;
      max-height: 100px;
      object-fit: cover;
    }

    /* ── Page content ── */
    .page-content {
      padding: 40px 48px;
      ${headerImageUrl ? "padding-top: 24px;" : ""}
      ${footerImageUrl ? "padding-bottom: 120px;" : ""}
    }

    /* ── Document header ── */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 28px;
      padding-bottom: 16px;
      border-bottom: 2.5px solid ${DS.purple500};
    }
    .org-name {
      font-size: 20px;
      font-weight: 800;
      color: ${DS.purple600};
      letter-spacing: -0.3px;
      line-height: 1.2;
    }
    .org-subtitle {
      font-size: 10px;
      font-weight: 500;
      color: ${DS.neutral400};
      margin-top: 3px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-meta .project {
      font-size: 13px;
      font-weight: 700;
      color: ${DS.neutral900};
    }
    .doc-meta .date {
      font-size: 11px;
      color: ${DS.neutral400};
      margin-top: 2px;
    }

    /* ── Sections ── */
    .section {
      margin-bottom: 28px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 600;
      color: ${DS.neutral400};
      margin-bottom: 12px;
    }

    /* ── Client info grid ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
      background: ${DS.cream};
      border-radius: 10px;
      padding: 16px 20px;
      border: 1px solid ${DS.neutral200};
    }
    .info-item label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      color: ${DS.neutral400};
      letter-spacing: 0.8px;
    }
    .info-item p {
      font-size: 13px;
      font-weight: 500;
      color: ${DS.neutral900};
      margin-top: 2px;
    }

    /* ── Services table ── */
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 600;
      color: ${DS.neutral400};
      background: ${DS.purple50};
      border-bottom: 2px solid ${DS.purple200};
      text-align: left;
    }
    th:nth-child(2) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }

    .svc-cell {
      padding: 12px 14px;
      border-bottom: 1px solid ${DS.neutral200};
      font-size: 12px;
    }
    .svc-name {
      font-weight: 700;
      color: ${DS.neutral900};
      font-size: 12px;
    }
    .svc-desc {
      color: ${DS.neutral500};
      font-size: 10px;
      margin-top: 3px;
      line-height: 1.4;
    }
    .tags {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .tag {
      display: inline-block;
      background: ${DS.purple100};
      color: ${DS.neutral700};
      font-size: 9px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
    }
    .num-cell {
      padding: 12px 14px;
      border-bottom: 1px solid ${DS.neutral200};
      font-size: 12px;
      color: ${DS.neutral700};
      vertical-align: top;
    }
    .num-cell.center { text-align: center; }
    .num-cell.right { text-align: right; }
    .num-cell.bold { font-weight: 700; color: ${DS.neutral900}; }

    /* ── Totals ── */
    .totals-bar {
      display: flex;
      justify-content: flex-end;
      gap: 32px;
      padding: 16px 14px;
      background: ${DS.cream};
      border-radius: 0 0 10px 10px;
      border: 1px solid ${DS.neutral200};
      border-top: 2px solid ${DS.purple500};
    }
    .total-item { text-align: right; }
    .total-item label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      color: ${DS.neutral400};
      letter-spacing: 0.8px;
    }
    .total-item .val {
      font-size: 13px;
      font-weight: 700;
      color: ${DS.neutral900};
      margin-top: 2px;
    }
    .total-item .val.highlight {
      font-size: 18px;
      font-weight: 800;
      color: ${DS.purple600};
    }

    /* ── Text block (Tiptap HTML output) ── */
    .text-block {
      font-size: 12px;
      color: ${DS.neutral700};
      line-height: 1.7;
    }
    .text-block h2 {
      font-size: 16px;
      font-weight: 700;
      color: ${DS.neutral900};
      margin-bottom: 8px;
      margin-top: 16px;
    }
    .text-block h3 {
      font-size: 13px;
      font-weight: 700;
      color: ${DS.neutral900};
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
      color: ${DS.purple500};
      text-decoration: underline;
    }
    .text-block strong {
      font-weight: 700;
      color: ${DS.neutral900};
    }
    .text-block em {
      font-style: italic;
    }
    .text-block u {
      text-decoration: underline;
    }
    .text-block blockquote {
      border-left: 3px solid ${DS.purple500};
      padding-left: 12px;
      margin: 8px 0;
      color: ${DS.neutral500};
      font-style: italic;
    }
    .text-block hr {
      border: none;
      border-top: 1px solid ${DS.neutral200};
      margin: 16px 0;
    }

    /* ── Empty state ── */
    .empty-msg {
      font-size: 12px;
      color: ${DS.neutral300};
      text-align: center;
      padding: 40px 0;
      font-style: italic;
    }
  </style>
</head>
<body>
  ${headerImageUrl ? `<div class="header-image"><img src="${headerImageUrl}" alt="" /></div>` : ""}

  <div class="page-content">
    ${(hasBlocks || hasData) ? `
    ${contentSections}
    ` : `
    <!-- Empty state -->
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:600px;text-align:center;color:${DS.neutral300};">
      <div style="font-size:48px;margin-bottom:16px;opacity:0.3;">📄</div>
      <div style="font-size:16px;font-weight:600;color:${DS.neutral400};margin-bottom:8px;">Documento em branco</div>
      <div style="font-size:12px;color:${DS.neutral300};max-width:280px;line-height:1.5;">
        Preencha os dados e selecione servicos para gerar sua proposta
      </div>
    </div>
    `}
  </div>

  ${footerImageUrl ? `<div class="footer-image"><img src="${footerImageUrl}" alt="" /></div>` : ""}
</body>
</html>`;
}

export function A4Preview({
  clientName,
  projectName,
  date,
  services,
  orgName,
  headerImageUrl,
  footerImageUrl,
  contentBlocks,
}: A4PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);

  const html = useMemo(
    () =>
      buildHTML({
        clientName,
        projectName,
        date,
        services,
        orgName,
        headerImageUrl,
        footerImageUrl,
        contentBlocks,
      }),
    [clientName, projectName, date, services, orgName, headerImageUrl, footerImageUrl, contentBlocks]
  );

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const newScale = Math.min(1, containerWidth / A4_WIDTH);
    setScale(newScale);
  }, []);

  useEffect(() => {
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [updateScale]);

  const [downloading, setDownloading] = useState(false);

  // Convert blob URLs in HTML to base64 data URLs so Puppeteer can render them
  const resolveHtmlImages = useCallback(async (rawHtml: string): Promise<string> => {
    const blobUrlRegex = /blob:http[s]?:\/\/[^\s"')]+/g;
    const blobUrls = Array.from(new Set(rawHtml.match(blobUrlRegex) ?? []));
    if (blobUrls.length === 0) return rawHtml;

    let resolved = rawHtml;
    for (const blobUrl of blobUrls) {
      try {
        const resp = await fetch(blobUrl);
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        resolved = resolved.replaceAll(blobUrl, dataUrl);
      } catch {
        // Skip unresolvable blob URLs
      }
    }
    return resolved;
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    setDownloading(true);
    try {
      const resolvedHtml = await resolveHtmlImages(html);
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: resolvedHtml }),
      });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "proposta.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback to print
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) iframe.contentWindow.print();
    } finally {
      setDownloading(false);
    }
  }, [html, resolveHtmlImages]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#151517] rounded-t-lg">
        <span className="text-sm font-medium text-[#8B8F96]">
          Pre-visualizacao A4
        </span>
        <Button variant="ghost" size="sm" onClick={handleDownloadPdf} loading={downloading}>
          <Icon name="pdf" size={16} />
          Baixar PDF
        </Button>
      </div>

      {/* Preview area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#1A1A1D] p-6 flex justify-center"
      >
        <div
          style={{
            width: A4_WIDTH,
            height: A4_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            flexShrink: 0,
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title="Proposta preview"
            className="w-full h-full border-0 rounded-lg shadow-lg bg-white"
            style={{ width: A4_WIDTH, height: A4_HEIGHT }}
          />
        </div>
      </div>
    </div>
  );
}
