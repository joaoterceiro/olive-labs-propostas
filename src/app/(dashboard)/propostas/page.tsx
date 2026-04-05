"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { fmt, fmtDate, cn } from "@/lib/utils";
import type { ProposalStatus } from "@/types";

// ── Types ────────────────────────────────────────────────────────────────────

interface ProposalRow {
  id: string;
  number: string;
  clientName: string;
  projectName: string;
  date: string;
  totalValue: number;
  status: ProposalStatus;
  createdAt: string;
  _count: { items: number };
  user: { id: string; name: string };
}

interface PaginatedResult {
  data: ProposalRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "Todas", value: "" },
  { label: "Rascunho", value: "DRAFT" },
  { label: "Enviada", value: "SENT" },
  { label: "Aprovada", value: "APPROVED" },
  { label: "Rejeitada", value: "REJECTED" },
  { label: "Expirada", value: "EXPIRED" },
];

const STATUS_LABEL: Record<ProposalStatus, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  EXPIRED: "Expirada",
};

const STATUS_BADGE: Record<ProposalStatus, BadgeVariant> = {
  DRAFT: "draft",
  SENT: "sent",
  APPROVED: "approved",
  REJECTED: "rejected",
  EXPIRED: "expired",
};

// ── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PropostasPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ProposalRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 20;

  // Build query string
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (statusFilter) params.set("status", statusFilter);
  if (search.trim()) params.set("search", search.trim());

  const { data, isLoading, mutate } = useSWR<PaginatedResult>(
    `/api/propostas?${params.toString()}`,
    fetcher,
    { keepPreviousData: true }
  );

  const proposals = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/propostas/${id}/duplicate`, {
          method: "POST",
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        toast("Proposta duplicada com sucesso!", "success");
        router.push(`/propostas/${created.id}`);
      } catch {
        toast("Erro ao duplicar proposta", "error");
      }
    },
    [router, toast]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/propostas/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast("Proposta excluida com sucesso!", "success");
      setDeleteTarget(null);
      mutate();
    } catch {
      toast("Erro ao excluir proposta", "error");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, toast, mutate]);

  const handleOpenPdf = useCallback((id: string) => {
    window.open(`/propostas/${id}/pdf`, "_blank");
  }, []);

  // ── Columns ──────────────────────────────────────────────────────────────

  const columns: Column<ProposalRow>[] = [
    {
      header: "Numero",
      accessor: "number",
      sortable: true,
      render: (_v, row) => (
        <span className="font-mono text-xs text-[#8B8F96]">{row.number}</span>
      ),
    },
    {
      header: "Cliente",
      accessor: "clientName",
      sortable: true,
      render: (_v, row) => (
        <div>
          <p className="font-medium text-[#E2E3E4]">{row.clientName}</p>
          <p className="text-xs text-[#6B6F76]">{row.projectName}</p>
        </div>
      ),
    },
    {
      header: "Projeto",
      accessor: "projectName",
      sortable: true,
      className: "hidden lg:table-cell",
    },
    {
      header: "Data",
      accessor: "date",
      sortable: true,
      render: (_v, row) => (
        <span className="text-[#8B8F96]">{fmtDate(row.date)}</span>
      ),
    },
    {
      header: "Valor",
      accessor: "totalValue",
      sortable: true,
      render: (_v, row) => (
        <span className="font-semibold text-[#E2E3E4]">
          {fmt(Number(row.totalValue))}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (_v, row) => (
        <Badge variant={STATUS_BADGE[row.status]}>
          {STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      header: "Acoes",
      accessor: "id",
      render: (_v, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push(`/propostas/${row.id}`)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B6F76] transition-colors hover:bg-white/[0.06] hover:text-[#E2E3E4]"
            title="Visualizar"
          >
            <Icon name="eye" size={16} />
          </button>
          <button
            onClick={() => handleDuplicate(row.id)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B6F76] transition-colors hover:bg-white/[0.06] hover:text-[#E2E3E4]"
            title="Duplicar"
          >
            <Icon name="copy" size={16} />
          </button>
          <button
            onClick={() => handleOpenPdf(row.id)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B6F76] transition-colors hover:bg-white/[0.06] hover:text-[#E2E3E4]"
            title="PDF"
          >
            <Icon name="pdf" size={16} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B6F76] transition-colors hover:bg-[#F87171]/10 hover:text-danger"
            title="Excluir"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Action button */}
      <div className="flex justify-end">
        <Button onClick={() => router.push("/propostas/nova")}>
          <Icon name="plus" size={16} />
          Nova Proposta
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                statusFilter === f.value
                  ? "bg-[#94C020] text-white"
                  : "bg-white/[0.04] text-[#8B8F96] hover:bg-white/[0.08]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="sm:ml-auto sm:w-64 relative">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6F76] pointer-events-none" />
          <Input
            placeholder="Buscar propostas..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table or skeleton or empty */}
      {isLoading && !data ? (
        <SkeletonTable rows={5} cols={7} />
      ) : proposals.length === 0 ? (
        <EmptyState
          title="Nenhuma proposta encontrada"
          description={
            search || statusFilter
              ? "Tente alterar os filtros ou a busca."
              : "Crie sua primeira proposta para comecar."
          }
          action={
            !search && !statusFilter ? (
              <Button onClick={() => router.push("/propostas/nova")}>
                <Icon name="plus" size={16} />
                Nova Proposta
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable columns={columns} data={proposals} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#6B6F76]">
                Pagina {page} de {totalPages} ({data?.total ?? 0} propostas)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Proximo
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir Proposta"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#ACACB0]">
          Tem certeza que deseja excluir a proposta{" "}
          <strong>{deleteTarget?.number}</strong>? Esta acao nao pode ser
          desfeita.
        </p>
      </Modal>
    </div>
  );
}
