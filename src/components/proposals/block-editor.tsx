"use client";

import { useState, useRef, useEffect } from "react";
import type { ContentBlock } from "@/types";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { ImageUpload } from "@/components/ui/image-upload";
import { Icon, type IconName } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn, fmt, fmtDate } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ServiceItem {
  name: string;
  description: string;
  hours: number;
  hourlyRate: number;
  deliverables: string[];
}

interface BlockEditorProps {
  blocks: ContentBlock[];
  onBlocksChange: (blocks: ContentBlock[]) => void;
  clientName: string;
  projectName: string;
  date: string;
  services: ServiceItem[];
}

type BlockType = ContentBlock["type"];

/* ------------------------------------------------------------------ */
/*  CommandMenu                                                        */
/* ------------------------------------------------------------------ */

const MENU_OPTIONS: {
  type: BlockType;
  icon: IconName;
  label: string;
  desc: string;
}[] = [
  { type: "text", icon: "type", label: "Texto", desc: "Bloco de texto com formatacao rica" },
  { type: "image", icon: "image", label: "Imagem", desc: "Imagem com legenda e largura" },
  { type: "client-info", icon: "users", label: "Dados do Cliente", desc: "Nome, projeto e data" },
  { type: "services", icon: "table", label: "Tabela de Servicos", desc: "Servicos selecionados" },
];

function CommandMenu({
  onSelect,
  onClose,
}: {
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}) {
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => (h + 1) % MENU_OPTIONS.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((h) => (h - 1 + MENU_OPTIONS.length) % MENU_OPTIONS.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelect(MENU_OPTIONS[highlighted].type);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [highlighted, onSelect, onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-1/2 -translate-x-1/2 z-30 mt-2 w-[260px] glass-strong rounded-lg p-1.5 animate-slide-in"
    >
      {MENU_OPTIONS.map((opt, i) => (
        <button
          key={opt.type}
          type="button"
          onClick={() => onSelect(opt.type)}
          onMouseEnter={() => setHighlighted(i)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
            i === highlighted
              ? "bg-white/[0.06] text-[#E2E3E4]"
              : "text-[#8B8F96] hover:bg-white/[0.04]"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.04]">
            <Icon name={opt.icon} size={16} className="text-[#6B6F76]" />
          </div>
          <div>
            <div className="text-[13px] font-medium">{opt.label}</div>
            <div className="text-[11px] text-[#6B6F76]">{opt.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  InsertionBar                                                       */
/* ------------------------------------------------------------------ */

function InsertionBar({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="group/insert relative flex items-center justify-center py-2">
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.04] opacity-0 group-hover/insert:opacity-100 transition-opacity" />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-[#1A1A1D] text-[#6B6F76] opacity-0 group-hover/insert:opacity-100 transition-all hover:border-[#94C020] hover:text-[#94C020]"
      >
        <Icon name="plus" size={12} />
      </button>
      {open && (
        <CommandMenu
          onSelect={(type) => {
            onAdd(type);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ActionsMenu                                                        */
/* ------------------------------------------------------------------ */

const MENU_ITEM_CLASS =
  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-[#8B8F96] transition-colors hover:bg-white/[0.04] hover:text-[#E2E3E4]";

function ActionsMenu({
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
  isFirst,
  isLast,
}: {
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-6 w-6 items-center justify-center rounded-md text-[#6B6F76] hover:bg-white/[0.06] hover:text-[#E2E3E4] transition-colors"
      >
        <Icon name="more" size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-[180px] glass-strong rounded-lg p-1 animate-slide-in">
          <button
            type="button"
            onClick={() => {
              onDuplicate();
              setOpen(false);
            }}
            className={MENU_ITEM_CLASS}
          >
            <Icon name="copy" size={14} /> Duplicar
          </button>
          <button
            type="button"
            disabled={isFirst}
            onClick={() => {
              onMoveUp();
              setOpen(false);
            }}
            className={cn(MENU_ITEM_CLASS, "disabled:opacity-30")}
          >
            <Icon name="chevron" size={14} className="rotate-180" /> Mover para cima
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() => {
              onMoveDown();
              setOpen(false);
            }}
            className={cn(MENU_ITEM_CLASS, "disabled:opacity-30")}
          >
            <Icon name="chevron" size={14} /> Mover para baixo
          </button>
          <div className="my-1 border-t border-white/[0.06]" />
          <button
            type="button"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className={cn(MENU_ITEM_CLASS, "text-[#F87171] hover:bg-[#F87171]/10")}
          >
            <Icon name="trash" size={14} /> Remover
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BlockCard                                                          */
/* ------------------------------------------------------------------ */

function BlockCard({
  children,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
  isFirst,
  isLast,
  typeLabel,
  typeIcon,
}: {
  children: React.ReactNode;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
  typeLabel: string;
  typeIcon: IconName;
}) {
  return (
    <div className="group/block relative rounded-lg border border-transparent transition-all duration-150 hover:border-white/[0.06] hover:bg-white/[0.02] animate-slide-in">
      {/* Drag handle - left side */}
      <div className="absolute -left-7 top-3 opacity-0 group-hover/block:opacity-100 transition-opacity cursor-grab">
        <Icon name="grip" size={14} className="text-[#4A4B50]" />
      </div>

      {/* Actions menu - top right */}
      <div className="absolute right-2 top-2 opacity-0 group-hover/block:opacity-100 transition-opacity z-10">
        <ActionsMenu
          onDuplicate={onDuplicate}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDelete={onDelete}
          isFirst={isFirst}
          isLast={isLast}
        />
      </div>

      {/* Type badge */}
      <div className="px-3 pt-2.5 pb-0.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#6B6F76] uppercase tracking-wider">
          <Icon name={typeIcon} size={10} /> {typeLabel}
        </span>
      </div>

      {/* Content */}
      <div className="px-3 pb-3">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Block content renderers                                            */
/* ------------------------------------------------------------------ */

function TextBlockContent({
  block,
  onUpdate,
}: {
  block: ContentBlock;
  onUpdate: (patch: Partial<ContentBlock>) => void;
}) {
  return (
    <TiptapEditor
      content={block.content ?? ""}
      onChange={(html) => onUpdate({ content: html })}
      placeholder="Digite o conteudo..."
    />
  );
}

const WIDTH_OPTIONS = [25, 50, 75, 100] as const;

function ImageBlockContent({
  block,
  onUpdate,
}: {
  block: ContentBlock;
  onUpdate: (patch: Partial<ContentBlock>) => void;
}) {
  return (
    <div className="space-y-3">
      <ImageUpload
        value={block.url ?? null}
        onChange={(url) => onUpdate({ url: url ?? undefined })}
        compact
      />

      <div>
        <label className="mb-1 block text-xs font-medium text-[#6B6F76]">
          Legenda
        </label>
        <input
          type="text"
          value={block.caption ?? ""}
          onChange={(e) => onUpdate({ caption: e.target.value })}
          placeholder="Legenda da imagem (opcional)"
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-sm text-[#E2E3E4] placeholder:text-[#6B6F76] focus:border-[#94C020] focus:outline-none focus:ring-2 focus:ring-[#94C020]/20"
        />
      </div>

      <div className="flex gap-1.5 mt-2">
        {WIDTH_OPTIONS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onUpdate({ width: w })}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium border transition-colors",
              (block.width ?? 100) === w
                ? "bg-[#94C020]/15 text-[#94C020] border-[#94C020]/30"
                : "bg-white/[0.04] text-[#6B6F76] border-white/[0.06] hover:text-[#E2E3E4]"
            )}
          >
            {w}%
          </button>
        ))}
      </div>

      {block.url && (
        <div className="flex justify-center mt-3">
          <img
            src={block.url}
            alt={block.caption ?? ""}
            style={{ width: `${block.width ?? 100}%` }}
            className="rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

function ClientInfoPreview({
  clientName,
  projectName,
  date,
}: {
  clientName: string;
  projectName: string;
  date: string;
}) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6F76]">
        Preview &mdash; Dados do Cliente
      </p>
      <div className="mt-2 space-y-1 text-sm text-[#E2E3E4]">
        <p>
          <span className="font-medium text-[#8B8F96]">Cliente:</span>{" "}
          {clientName || "---"}
        </p>
        <p>
          <span className="font-medium text-[#8B8F96]">Projeto:</span>{" "}
          {projectName || "---"}
        </p>
        <p>
          <span className="font-medium text-[#8B8F96]">Data:</span>{" "}
          {date ? fmtDate(date) : "---"}
        </p>
      </div>
    </div>
  );
}

function ServicesPreview({ services }: { services: ServiceItem[] }) {
  const total = services.reduce((s, svc) => s + svc.hours * svc.hourlyRate, 0);
  return (
    <div className="rounded-lg bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6F76]">
        Preview &mdash; Servicos
      </p>
      <p className="mt-2 text-sm text-[#E2E3E4]">
        <span className="font-semibold text-[#94C020]">{services.length}</span>{" "}
        {services.length === 1 ? "servico selecionado" : "servicos selecionados"}{" "}
        &mdash; Total:{" "}
        <span className="font-semibold text-[#94C020]">{fmt(total)}</span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Type metadata                                                      */
/* ------------------------------------------------------------------ */

const TYPE_META: Record<BlockType, { label: string; icon: IconName }> = {
  text: { label: "Texto", icon: "type" },
  image: { label: "Imagem", icon: "image" },
  "client-info": { label: "Dados do Cliente", icon: "users" },
  services: { label: "Servicos", icon: "table" },
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function BlockEditor({
  blocks,
  onBlocksChange,
  clientName,
  projectName,
  date,
  services,
}: BlockEditorProps) {
  const [deleteTarget, setDeleteTarget] = useState<ContentBlock | null>(null);

  /* sorted blocks -------------------------------------------------- */

  const sorted = [...blocks].sort((a, b) => a.order - b.order);

  /* helpers -------------------------------------------------------- */

  function reorder(arr: ContentBlock[]): ContentBlock[] {
    return arr.map((b, i) => ({ ...b, order: i }));
  }

  function addBlock(type: BlockType, afterIndex: number) {
    const newBlock: ContentBlock = {
      id: crypto.randomUUID(),
      type,
      order: afterIndex + 1,
      content: type === "text" ? "" : undefined,
      url: type === "image" ? undefined : undefined,
      caption: type === "image" ? "" : undefined,
      width: type === "image" ? 100 : undefined,
    };
    const next = [...sorted];
    next.splice(afterIndex + 1, 0, newBlock);
    onBlocksChange(reorder(next));
  }

  function updateBlock(id: string, updates: Partial<ContentBlock>) {
    onBlocksChange(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }

  function moveBlock(id: string, direction: -1 | 1) {
    const idx = sorted.findIndex((b) => b.id === id);
    const target = idx + direction;
    if (target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    [next[idx], next[target]] = [next[target], next[idx]];
    onBlocksChange(reorder(next));
  }

  function duplicateBlock(id: string) {
    const source = sorted.find((b) => b.id === id);
    if (!source) return;
    const idx = sorted.findIndex((b) => b.id === id);
    const clone: ContentBlock = { ...source, id: crypto.randomUUID() };
    const next = [...sorted];
    next.splice(idx + 1, 0, clone);
    onBlocksChange(reorder(next));
  }

  function deleteBlock(id: string) {
    onBlocksChange(reorder(blocks.filter((b) => b.id !== id)));
    setDeleteTarget(null);
  }

  return (
    <div className="relative pl-8">
      {sorted.length === 0 && (
        <div className="rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] py-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
            <Icon name="layers" size={18} className="text-[#6B6F76]" />
          </div>
          <p className="text-sm font-medium text-[#E2E3E4] mb-1">
            Conteudo da proposta
          </p>
          <p className="text-xs text-[#6B6F76]">
            Clique no <span className="text-[#94C020]">+</span> abaixo para adicionar texto, imagem, dados do cliente ou tabela de servicos.
          </p>
        </div>
      )}

      {/* Insertion bar before first block */}
      <InsertionBar onAdd={(type) => addBlock(type, -1)} />

      {sorted.map((block, i) => {
        const meta = TYPE_META[block.type];
        return (
          <div key={block.id}>
            <BlockCard
              typeLabel={meta.label}
              typeIcon={meta.icon}
              isFirst={i === 0}
              isLast={i === sorted.length - 1}
              onDuplicate={() => duplicateBlock(block.id)}
              onMoveUp={() => moveBlock(block.id, -1)}
              onMoveDown={() => moveBlock(block.id, 1)}
              onDelete={() => setDeleteTarget(block)}
            >
              {block.type === "text" && (
                <TextBlockContent
                  block={block}
                  onUpdate={(patch) => updateBlock(block.id, patch)}
                />
              )}
              {block.type === "image" && (
                <ImageBlockContent
                  block={block}
                  onUpdate={(patch) => updateBlock(block.id, patch)}
                />
              )}
              {block.type === "client-info" && (
                <ClientInfoPreview
                  clientName={clientName}
                  projectName={projectName}
                  date={date}
                />
              )}
              {block.type === "services" && (
                <ServicesPreview services={services} />
              )}
            </BlockCard>
            <InsertionBar onAdd={(type) => addBlock(type, i)} />
          </div>
        );
      })}

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remover bloco"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteTarget && deleteBlock(deleteTarget.id)}
            >
              <Icon name="trash" size={14} />
              Remover
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[#ACACB0]">
            Tem certeza que deseja remover o bloco{" "}
            <span className="font-semibold text-[#E2E3E4]">
              {deleteTarget ? TYPE_META[deleteTarget.type].label : ""}
            </span>
            ? Esta acao nao pode ser desfeita.
          </p>
          {deleteTarget?.type === "text" && deleteTarget.content && (
            <div
              className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-[#6B6F76] max-h-24 overflow-hidden"
              dangerouslySetInnerHTML={{
                __html: deleteTarget.content.slice(0, 300),
              }}
            />
          )}
          {deleteTarget?.type === "image" && deleteTarget.caption && (
            <p className="text-xs text-[#6B6F76] italic">
              Legenda: {deleteTarget.caption}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
