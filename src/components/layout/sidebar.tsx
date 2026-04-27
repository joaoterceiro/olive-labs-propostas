"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

const orgFetcher = (url: string) =>
  fetch(url).then((r) => (r.ok ? r.json() : null)).then((r) => r?.data?.name ?? null);

interface NavItem {
  label: string;
  href: string;
  icon: string;
  children?: { label: string; href: string }[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  currentPath: string;
  orgName?: string;
  isSuperAdmin?: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onOpenSearch?: () => void;
  /** Drawer open state for mobile (<lg). On desktop the sidebar is always visible */
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const mainNav: NavGroup[] = [
  {
    title: "NAVEGAÇÃO PRINCIPAL",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "home" },
      {
        label: "Propostas",
        href: "/propostas",
        icon: "pdf",
        children: [
          { label: "Todas", href: "/propostas" },
          { label: "Nova Proposta", href: "/propostas/nova" },
        ],
      },
      { label: "Biblioteca", href: "/biblioteca", icon: "tag" },
      { label: "Clientes", href: "/clientes", icon: "users" },
    ],
  },
  {
    title: "CONFIGURAÇÃO",
    items: [
      { label: "Meu Perfil", href: "/perfil", icon: "avatar" },
      { label: "Configurações", href: "/configuracoes", icon: "settings" },
    ],
  },
];

const adminNav: NavGroup = {
  title: "ADMINISTRAÇÃO",
  items: [
    { label: "Organizações", href: "/organizacoes", icon: "building" },
    { label: "Usuários", href: "/usuarios", icon: "users" },
  ],
};

function isActive(currentPath: string, href: string): boolean {
  if (href === "/dashboard") return currentPath === "/dashboard";
  if (href === "/propostas")
    return currentPath === "/propostas" || currentPath.startsWith("/propostas/");
  return currentPath.startsWith(href);
}

export function Sidebar({
  currentPath,
  orgName,
  isSuperAdmin,
  collapsed: rawCollapsed,
  onToggle,
  onOpenSearch,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const groups = isSuperAdmin ? [...mainNav, adminNav] : mainNav;
  const { data: liveOrgName } = useSWR("/api/configuracoes", orgFetcher, {
    fallbackData: orgName,
    refreshInterval: 60000,
  });
  const displayOrgName =
    (typeof liveOrgName === "string" ? liveOrgName : null) ??
    orgName ??
    "Olive Labs";

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Propostas: currentPath.startsWith("/propostas"),
  });

  // Inside a mobile drawer we always render the expanded layout regardless
  // of the `collapsed` (desktop-only) toggle state.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const collapsed = rawCollapsed && !isMobile;

  function toggleExpand(label: string) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0C0C0E] border-r border-white/[0.04] transition-transform duration-200 lg:transition-all",
        // Desktop: always visible, width depends on collapsed
        collapsed ? "lg:w-[56px]" : "lg:w-[250px]",
        // Mobile: slide in/out
        mobileOpen
          ? "w-[280px] translate-x-0"
          : "w-[280px] -translate-x-full lg:translate-x-0"
      )}
    >
      {/* Close button (mobile only) */}
      {onCloseMobile && (
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Fechar menu"
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md text-[#8B8F96] hover:bg-white/[0.04] hover:text-[#E2E3E4] lg:hidden"
        >
          <Icon name="x" size={16} />
        </button>
      )}

      {/* ── Brand ── */}
      <div
        className={cn(
          "flex items-center h-[52px] px-[14px] border-b border-white/[0.04]",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-[10px] min-w-0 group"
        >
          <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-[#94C020] to-[#7DA61A] shadow-[0_0_12px_rgba(148,192,32,0.25)] transition-shadow group-hover:shadow-[0_0_20px_rgba(148,192,32,0.35)]">
            <span className="text-[10px] font-extrabold text-white leading-none drop-shadow-sm">
              OL
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="text-[14px] font-bold text-[#E2E3E4] truncate block">
                {displayOrgName}
              </span>
              {isSuperAdmin && (
                <span className="inline-flex items-center gap-0.5 mt-0.5 rounded px-1 py-0 text-[9px] font-semibold uppercase tracking-wider text-[#FBBF24]">
                  <span className="h-1 w-1 rounded-full bg-[#FBBF24]" />
                  Modo Admin
                </span>
              )}
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={onToggle}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[#4A4B50] hover:text-[#8B8F96] hover:bg-white/[0.06] transition-all"
          >
            <Icon name="panel-left" size={15} />
          </button>
        )}
      </div>

      {/* ── Search ── */}
      {!collapsed && (
        <div className="px-[12px] py-[10px]">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Abrir busca (atalho Ctrl+K)"
            className="flex h-[34px] w-full items-center gap-[8px] rounded-[6px] border border-white/[0.06] bg-white/[0.02] px-[10px] text-[12px] text-[#8B8F96] transition-all hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-[#ACACB0] active:scale-[0.99]"
          >
            <Icon name="search" size={13} />
            <span className="flex-1 text-left">Buscar...</span>
            <kbd className="flex h-[18px] items-center rounded-[4px] border border-white/[0.08] bg-white/[0.03] px-[5px] text-[9px] font-medium text-[#4A4B50]">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav
        aria-label="Navegacao principal"
        className="flex-1 overflow-y-auto overflow-x-hidden px-[8px] pt-[2px] pb-[8px]"
      >
        {groups.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 ? "mt-[20px]" : "")}>
            {!collapsed && (
              <div className="px-[10px] pb-[8px] pt-[4px]">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4A4B50]">
                  {group.title}
                </span>
              </div>
            )}
            {collapsed && gi > 0 && (
              <div className="mx-[6px] my-[8px] border-t border-white/[0.04]" />
            )}
            <ul className="space-y-[1px]">
              {group.items.map((item) => {
                const active = isActive(currentPath, item.href);
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expanded[item.label];

                return (
                  <li key={item.href}>
                    <Link
                      href={hasChildren ? "#" : item.href}
                      onClick={
                        hasChildren
                          ? (e) => {
                              e.preventDefault();
                              toggleExpand(item.label);
                            }
                          : undefined
                      }
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group/item relative flex items-center rounded-[6px] transition-all duration-150 active:scale-[0.97]",
                        collapsed
                          ? "h-[36px] w-[36px] mx-auto justify-center"
                          : "h-[36px] px-[10px] gap-[10px]",
                        active
                          ? "bg-[#94C020]/[0.10] text-[#E2E3E4]"
                          : "text-[#8B8F96] hover:bg-white/[0.04] hover:text-[#E2E3E4]"
                      )}
                    >
                      {/* Active left accent — visible in both expanded and collapsed mode */}
                      {active && (
                        <div
                          className={cn(
                            "absolute top-[9px] bottom-[9px] w-[3px] rounded-r-full bg-[#94C020] shadow-[0_0_8px_rgba(148,192,32,0.5)]",
                            collapsed ? "-left-[1px]" : "left-0"
                          )}
                        />
                      )}

                      <Icon
                        name={item.icon}
                        size={collapsed ? 18 : 16}
                        className={cn(
                          "shrink-0 transition-colors",
                          active
                            ? "text-[#94C020]"
                            : "text-[#8B8F96] group-hover/item:text-[#ACACB0]"
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-[13px]">
                            {item.label}
                          </span>
                          {hasChildren && (
                            <Icon
                              name="chevron"
                              size={11}
                              className={cn(
                                "text-[#3A3A3E] transition-transform duration-150",
                                isExpanded ? "" : "-rotate-90"
                              )}
                            />
                          )}
                        </>
                      )}
                    </Link>

                    {/* Sub-items with tree lines */}
                    {hasChildren && isExpanded && !collapsed && (
                      <ul className="mt-[6px] ml-[20px] space-y-[1px]">
                        {item.children!.map((child, ci) => {
                          const childActive = currentPath === child.href;
                          const isLast = ci === item.children!.length - 1;
                          return (
                            <li key={child.href} className="relative">
                              <div className="absolute left-[-10px] top-0 bottom-0 w-[10px]">
                                <div
                                  className={cn(
                                    "absolute left-0 top-0 w-px bg-white/[0.06]",
                                    isLast ? "h-[17px]" : "h-full"
                                  )}
                                />
                                <div className="absolute left-0 top-[17px] h-px w-[10px] bg-white/[0.06]" />
                              </div>
                              <Link
                                href={child.href}
                                aria-current={childActive ? "page" : undefined}
                                className={cn(
                                  "relative flex items-center h-[30px] rounded-[5px] px-[8px] text-[12px] transition-colors duration-100 active:scale-[0.98]",
                                  childActive
                                    ? "text-[#E2E3E4] bg-white/[0.06] font-medium"
                                    : "text-[#7A7A80] hover:text-[#E2E3E4] hover:bg-white/[0.03]"
                                )}
                              >
                                {childActive && (
                                  <span className="absolute left-[-12px] top-1/2 -translate-y-1/2 h-[6px] w-[6px] rounded-full bg-[#94C020]" />
                                )}
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-white/[0.04] p-[8px]">
        {collapsed ? (
          <div className="flex flex-col items-center gap-[4px]">
            {/* Org chip */}
            <div
              title={displayOrgName}
              className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] bg-gradient-to-br from-[#94C020]/20 to-[#94C020]/10 text-[12px] font-bold text-[#94C020]"
            >
              {displayOrgName.charAt(0).toUpperCase()}
            </div>
            {/* Logout shortcut */}
            <button
              type="button"
              onClick={() => {
                signOut({ redirect: false }).then(() => {
                  window.location.replace("/login");
                });
              }}
              title="Sair"
              aria-label="Sair"
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#4A4B50] transition-colors hover:bg-[#F87171]/10 hover:text-[#F87171]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
            {/* Toggle expand */}
            <button
              type="button"
              onClick={onToggle}
              title="Expandir menu"
              aria-label="Expandir menu"
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#4A4B50] hover:bg-white/[0.05] hover:text-[#8B8F96] transition-colors"
            >
              <Icon name="chevron-right" size={13} />
            </button>
          </div>
        ) : (
          <div className="space-y-[6px]">
            {/* Org info */}
            <div className="flex items-center gap-[9px] rounded-[6px] px-[8px] py-[8px] hover:bg-white/[0.03] transition-colors cursor-default">
              <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[6px] bg-gradient-to-br from-[#94C020]/20 to-[#94C020]/10 text-[11px] font-bold text-[#94C020]">
                {displayOrgName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-[#ACACB0]">
                  {displayOrgName}
                </p>
                <span className="inline-flex items-center mt-[2px] text-[9px] px-[5px] py-[1px] rounded-[3px] bg-[#94C020]/10 text-[#94C020] font-semibold tracking-wide">
                  PRO
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={() => {
                signOut({ redirect: false }).then(() => {
                  window.location.replace("/login");
                });
              }}
              className="flex w-full items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] text-[12px] text-[#4A4B50] transition-colors hover:bg-[#F87171]/[0.06] hover:text-[#F87171]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sair
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
