"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";
import { fmt, fmtDate } from "@/lib/utils";
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
}

interface PaginatedResult {
  data: ProposalRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

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

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg glass-card p-5">
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-md bg-[#94C020]/10 text-[#94C020]"
        >
          {icon}
        </div>
        <div>
          <p className="text-[12px] font-medium tracking-wide text-[#6B6F76]">
            {label}
          </p>
          {loading ? (
            <div className="skel mt-1 h-6 w-20 rounded" />
          ) : (
            <p className="text-2xl font-bold text-[#E2E3E4]">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  // Fetch all proposals (no filter) for stats
  const { data: allData, isLoading: loadingAll } = useSWR<PaginatedResult>(
    "/api/propostas?limit=1&page=1",
    fetcher
  );

  // Fetch approved proposals for stats
  const { data: approvedData, isLoading: loadingApproved } =
    useSWR<PaginatedResult>(
      "/api/propostas?status=APPROVED&limit=1&page=1",
      fetcher
    );

  // Fetch pending (DRAFT + SENT) for stats
  const { data: draftData, isLoading: loadingDraft } =
    useSWR<PaginatedResult>(
      "/api/propostas?status=DRAFT&limit=1&page=1",
      fetcher
    );
  const { data: sentData, isLoading: loadingSent } =
    useSWR<PaginatedResult>(
      "/api/propostas?status=SENT&limit=1&page=1",
      fetcher
    );

  // Fetch recent 5 proposals
  const { data: recentData, isLoading: loadingRecent } =
    useSWR<PaginatedResult>("/api/propostas?limit=5&page=1", fetcher);

  const totalProposals = allData?.total ?? 0;
  const totalApproved = approvedData?.total ?? 0;
  const totalPending = (draftData?.total ?? 0) + (sentData?.total ?? 0);
  const recentProposals = recentData?.data ?? [];

  // We don't have a dedicated total-value endpoint, so we show count-based stats
  const statsLoading =
    loadingAll || loadingApproved || loadingDraft || loadingSent;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Propostas"
          value={String(totalProposals)}
          icon={<Icon name="layers" size={24} />}
          loading={statsLoading}
        />
        <StatCard
          label="Aprovadas"
          value={String(totalApproved)}
          icon={<Icon name="check" size={24} />}
          loading={statsLoading}
        />
        <StatCard
          label="Pendentes"
          value={String(totalPending)}
          icon={<Icon name="stepwiz" size={24} />}
          loading={statsLoading}
        />
        <StatCard
          label="Taxa de Aprovacao"
          value={
            totalProposals > 0
              ? `${Math.round((totalApproved / totalProposals) * 100)}%`
              : "0%"
          }
          icon={<Icon name="zap" size={24} />}
          loading={statsLoading}
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => router.push("/propostas/nova")}>
          <Icon name="plus" size={16} />
          Nova Proposta
        </Button>
        <Button variant="ghost" className="border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06]" onClick={() => router.push("/clientes")}>
          <Icon name="users" size={16} />
          Novo Cliente
        </Button>
        <Button variant="ghost" className="border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06]" onClick={() => router.push("/biblioteca")}>
          <Icon name="layers" size={16} />
          Nova Biblioteca
        </Button>
      </div>

      {/* Recent proposals */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#E2E3E4]">
              Propostas Recentes
            </h2>
            <Button
              variant="ghost"
              size="xs"
              className="text-[#94C020] hover:text-[#A4D030]"
              onClick={() => router.push("/propostas")}
            >
              Ver todas
              <Icon name="arrow" size={14} />
            </Button>
          </div>
        }
      >
        {loadingRecent ? (
          <SkeletonTable rows={5} cols={5} />
        ) : recentProposals.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#6B6F76]">
            Nenhuma proposta criada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-[#8B8F96]">
                    Numero
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-[#8B8F96]">
                    Cliente
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-[#8B8F96]">
                    Data
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-[#8B8F96] text-right">
                    Valor
                  </th>
                  <th className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-[#8B8F96]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentProposals.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/propostas/${p.id}`)}
                    className="border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-6 py-3 font-mono text-xs text-[#8B8F96]">
                      {p.number}
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-medium text-[#E2E3E4]">
                        {p.clientName}
                      </p>
                      <p className="text-xs text-[#6B6F76]">
                        {p.projectName}
                      </p>
                    </td>
                    <td className="px-6 py-3 text-[#8B8F96]">
                      {fmtDate(p.date)}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-[#E2E3E4]">
                      {fmt(Number(p.totalValue))}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={STATUS_BADGE[p.status]}>
                        {STATUS_LABEL[p.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
