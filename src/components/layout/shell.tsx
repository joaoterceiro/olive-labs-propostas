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

export function Shell({
  children,
  orgName,
  userName,
  isSuperAdmin,
}: ShellProps) {
  const pathname = usePathname();
  const title = resolveTitle(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

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
      <Sidebar
        currentPath={pathname}
        orgName={orgName}
        isSuperAdmin={isSuperAdmin}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onOpenSearch={() => setPaletteOpen(true)}
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <div
        className="flex min-h-screen flex-1 flex-col bg-[#101012] transition-all duration-200"
        style={{ marginLeft: collapsed ? 56 : 250 }}
      >
        <Header title={title} userName={userName} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
