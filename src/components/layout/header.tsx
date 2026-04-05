"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

interface HeaderProps {
  title: string;
  userName?: string;
  className?: string;
}

export function Header({ title, userName, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-12 items-center justify-between px-4 glass",
        className
      )}
    >
      <span className="text-sm font-semibold text-[#E2E3E4]">{title}</span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B6F76] transition-colors hover:bg-white/[0.04] hover:text-[#E2E3E4]"
        >
          <Icon name="bell" size={18} />
        </button>

        {userName && (
          <Link
            href="/perfil"
            className="ml-1 text-sm text-[#6B6F76] transition-colors hover:text-[#E2E3E4]"
          >
            {userName}
          </Link>
        )}

        <button
          onClick={() => {
            signOut({ redirect: false }).then(() => {
              window.location.replace("/login");
            });
          }}
          title="Sair"
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B6F76] transition-colors hover:bg-[#F87171]/10 hover:text-[#F87171]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
