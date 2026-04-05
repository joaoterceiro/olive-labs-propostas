import { requireSession, unauthorizedResponse, errorResponse } from "@/lib/prisma-tenant";

export async function POST(request: Request) {
  try {
    await requireSession();
  } catch {
    return unauthorizedResponse();
  }

  try {
    const { html } = await request.json();
    if (!html) return errorResponse("HTML content required");

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
        "Content-Disposition": 'attachment; filename="proposta.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("PDF generation error:", e);
    return errorResponse("Erro ao gerar PDF", 500);
  }
}
