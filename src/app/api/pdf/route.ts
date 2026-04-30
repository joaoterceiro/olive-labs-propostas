import { z } from "zod";
import {
  requireSession,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/prisma-tenant";

// 2 MB cap on the HTML payload — Puppeteer is memory-hungry; bigger inputs
// turn into a DoS surface.
const schema = z.object({
  html: z.string().min(1).max(2_000_000),
  filename: z
    .string()
    .regex(/^[\w.-]{1,200}$/u, "Nome de arquivo invalido")
    .optional(),
});

export async function POST(request: Request) {
  try {
    await requireSession();
  } catch {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON invalido", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const { html, filename = "proposta.pdf" } = parsed.data;

  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(30_000);
      page.setDefaultNavigationTimeout(30_000);
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

      return new Response(Buffer.from(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } finally {
      await browser.close();
    }
  } catch (e) {
    console.error("PDF generation error:", e);
    return errorResponse("Erro ao gerar PDF", 500);
  }
}
