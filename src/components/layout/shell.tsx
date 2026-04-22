"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { CommandPalette } from "./command-palette";

interface ShellProps {
  children: React.ReactNode;
  orgName?: string;
  userName?: string;
  isSuperAdmin?: boolean;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/propostas": "Propostas",
  "/propostas/nova": "Nova Proposta",
  "/biblioteca": "Biblioteca de Serviços",
  "/clientes": "Clientes",
  "/perfil": "Meu Perfil",
  "/configuracoes": "Configurações",
  "/organizacoes": "Organizações",
  "/usuarios": "Usuários",
};

function resolveTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const segments = pathname.split("/").filter(Boolean);
  while (segments.length > 0) {
    const candidate = "/" + segments.join("/");
    if (pageTitles[candidate]) return pageTitles[candidate];
    segments.pop();
  }
  return "Olive Labs";
}

const MOBILE_BREAKPOINT = 1024;

export function Shell({
  children,
  orgName,
  userName,
  isSuperAdmin,
}: ShellProps) {
  const pathname = usePathname();
  const title = resolveTitle(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close drawer on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= MOBILE_BREAKPOINT) {
        setMobileOpen(false);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Global ⌘K / Ctrl+K to toggle the command palette
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-full">
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-md focus:bg-[#94C020] focus:px-3 focus:py-1.5 focus:text-xs focus:font-semibold focus:text-[#0a0f0a]"
      >
        Pular para o conteudo principal
      </a>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        currentPath={pathname}
        orgName={orgName}
        isSuperAdmin={isSuperAdmin}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onOpenSearch={() => setPaletteOpen(true)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <div
        className="flex min-h-screen flex-1 flex-col bg-[#101012] transition-all duration-200 lg:ml-[var(--sidebar-w)]"
        style={
          {
            "--sidebar-w": collapsed ? "56px" : "250px",
          } as React.CSSProperties
        }
      >
        <Header
          title={title}
          userName={userName}
          isSuperAdmin={isSuperAdmin}
          onOpenMobileNav={() => setMobileOpen(true)}
          onOpenSearch={() => setPaletteOpen(true)}
        />
        <main id="main-content" className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
