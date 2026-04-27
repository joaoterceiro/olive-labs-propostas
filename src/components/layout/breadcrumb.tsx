"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

/**
 * Maps each path segment to a human-readable label.
 * Dynamic segments (like proposal IDs) are passed through truncated unless
 * they appear here.
 */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  propostas: "Propostas",
  nova: "Nova",
  editar: "Editar",
  pdf: "PDF",
  clientes: "Clientes",
  biblioteca: "Biblioteca",
  configuracoes: "Configuracoes",
  perfil: "Meu perfil",
  organizacoes: "Organizacoes",
  usuarios: "Usuarios",
};

interface Crumb {
  label: string;
  href?: string;
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let acc = "";

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    acc += "/" + seg;
    const isLast = i === segments.length - 1;

    let label = SEGMENT_LABELS[seg];
    if (!label) {
      // dynamic id segment: shorten cuid-like ids to last 6 chars
      label = seg.length > 12 ? `…${seg.slice(-6)}` : seg;
    }
    crumbs.push({ label, href: isLast ? undefined : acc });
  }

  return crumbs;
}

interface BreadcrumbProps {
  className?: string;
}

export function Breadcrumb({ className }: BreadcrumbProps) {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  // No breadcrumb on the top-level dashboard or any single-segment page.
  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Caminho de navegacao"
      className={
        "hidden items-center gap-1 text-[12px] text-[#6B6F76] md:flex " +
        (className ?? "")
      }
    >
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <Icon
              name="chevron-right"
              size={11}
              className="text-[#3A3A3E]"
            />
          )}
          {c.href ? (
            <Link
              href={c.href}
              className="rounded px-1 py-0.5 transition-colors hover:bg-white/[0.04] hover:text-[#ACACB0]"
            >
              {c.label}
            </Link>
          ) : (
            <span
              aria-current="page"
              className="px-1 py-0.5 font-medium text-[#E2E3E4]"
            >
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
