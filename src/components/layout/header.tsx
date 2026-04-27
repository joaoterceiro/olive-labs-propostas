"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Breadcrumb } from "./breadcrumb";

interface HeaderProps {
  title: string;
  userName?: string;
  isSuperAdmin?: boolean;
  onOpenMobileNav?: () => void;
  onOpenSearch?: () => void;
  className?: string;
}

export function Header({
  title,
  userName,
  isSuperAdmin,
  onOpenMobileNav,
  onOpenSearch,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-white/[0.04] bg-[#101012]/85 px-3 backdrop-blur-xl sm:px-4",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger (mobile only) */}
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-[#8B8F96] transition-colors hover:bg-white/[0.04] hover:text-[#E2E3E4] lg:hidden"
        >
          <Icon name="menu" size={18} />
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-sm font-semibold text-[#E2E3E4]">
            {title}
          </h1>
          {isSuperAdmin && (
            <span className="inline-flex items-center gap-1 rounded-md border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#FBBF24]">
              <Icon name="alert" size={10} />
              Admin
            </span>
          )}
        </div>

        {/* Breadcrumb on desktop for deep routes */}
        <div className="hidden md:block">
          <Breadcrumb />
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Search trigger */}
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Buscar (atalho Ctrl+K)"
          className="group hidden items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 h-8 text-[12px] text-[#8B8F96] transition-colors hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-[#ACACB0] md:flex"
        >
          <Icon name="search" size={14} />
          <span>Buscar</span>
          <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1 py-0.5 text-[10px] text-[#8B8F96] group-hover:text-[#8B8F96]">
            ⌘K
          </kbd>
        </button>

        {/* Search icon only on mobile */}
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Buscar"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#8B8F96] transition-colors hover:bg-white/[0.04] hover:text-[#E2E3E4] md:hidden"
        >
          <Icon name="search" size={16} />
        </button>

        <button
          type="button"
          aria-label="Notificacoes"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#8B8F96] transition-colors hover:bg-white/[0.04] hover:text-[#E2E3E4]"
        >
          <Icon name="bell" size={16} />
        </button>

        <div className="mx-1 hidden h-5 w-px bg-white/[0.06] sm:block" aria-hidden="true" />

        {userName && (
          <Link
            href="/perfil"
            className="hidden items-center gap-2 rounded-md px-2 py-1 text-sm text-[#ACACB0] transition-colors hover:bg-white/[0.04] hover:text-[#E2E3E4] sm:flex"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#94C020]/15 text-[10px] font-bold uppercase text-[#94C020]">
              {userName.charAt(0)}
            </span>
            <span className="hidden max-w-[140px] truncate md:inline">
              {userName}
            </span>
          </Link>
        )}

        <button
          onClick={() => {
            signOut({ redirect: false }).then(() => {
              window.location.replace("/login");
            });
          }}
          aria-label="Sair"
          title="Sair"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#8B8F96] transition-colors hover:bg-[#F87171]/10 hover:text-[#F87171]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
