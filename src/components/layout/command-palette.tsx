"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

interface ProposalHit {
  id: string;
  number: string;
  clientName: string;
  projectName: string;
  status: string;
}

interface ClientHit {
  id: string;
  companyName: string;
  contactName: string | null;
}

interface ServiceHit {
  id: string;
  name: string;
}

interface SearchResponse {
  proposals: ProposalHit[];
  clients: ClientHit[];
  services: ServiceHit[];
}

interface FlatItem {
  key: string;
  label: string;
  hint?: string;
  href: string;
  icon: string;
}

function flatten(data: SearchResponse): FlatItem[] {
  const items: FlatItem[] = [];
  for (const p of data.proposals) {
    items.push({
      key: `p-${p.id}`,
      label: `${p.number} — ${p.projectName}`,
      hint: p.clientName,
      href: `/propostas/${p.id}`,
      icon: "pdf",
    });
  }
  for (const c of data.clients) {
    items.push({
      key: `c-${c.id}`,
      label: c.companyName,
      hint: c.contactName || undefined,
      href: `/clientes/${c.id}`,
      icon: "users",
    });
  }
  for (const s of data.services) {
    items.push({
      key: `s-${s.id}`,
      label: s.name,
      href: `/biblioteca`,
      icon: "tag",
    });
  }
  return items;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<FlatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-close on route change (e.g. browser back/forward while open)
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Focus on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setItems([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        if (!res.ok) throw new Error();
        const data: SearchResponse = await res.json();
        setItems(flatten(data));
        setActive(0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setItems([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [query, open]);

  const go = useCallback(
    (item: FlatItem) => {
      router.push(item.href);
      onClose();
    },
    [router, onClose]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(items.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Enter") {
        if (items[active]) {
          e.preventDefault();
          go(items[active]);
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, items, active, onClose, go]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 pt-[14vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl glass-strong"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <Icon name="search" size={16} className="text-[#6B6F76]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar propostas, clientes, serviços..."
            className="flex-1 bg-transparent text-sm text-[#E2E3E4] placeholder:text-[#6B6F76] outline-none"
          />
          <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[#6B6F76]">
            ESC
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {loading && (
            <p className="px-4 py-6 text-center text-xs text-[#6B6F76]">
              Buscando...
            </p>
          )}
          {!loading && query.trim().length < 2 && (
            <p className="px-4 py-6 text-center text-xs text-[#6B6F76]">
              Digite ao menos 2 caracteres para buscar.
            </p>
          )}
          {!loading && query.trim().length >= 2 && items.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-[#6B6F76]">
              Nenhum resultado para &ldquo;{query}&rdquo;.
            </p>
          )}
          {items.map((item, i) => (
            <button
              key={item.key}
              onClick={() => go(item)}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === active ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
              }`}
            >
              <Icon name={item.icon} size={14} className="text-[#94C020]" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm text-[#E2E3E4]">{item.label}</p>
                {item.hint && (
                  <p className="truncate text-[11px] text-[#6B6F76]">
                    {item.hint}
                  </p>
                )}
              </div>
              {i === active && (
                <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[#6B6F76]">
                  ↵
                </kbd>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
