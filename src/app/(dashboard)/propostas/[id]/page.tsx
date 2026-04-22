"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { fmt, fmtDate } from "@/lib/utils";
import type { ProposalStatus, ProposalWithItems } from "@/types";

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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProposalDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [sendMessage, setSendMessage] = useState("");

  const { data: proposal, isLoading, mutate } = useSWR<ProposalWithItems>(
    `/api/propostas/${id}`,
    fetcher
  );

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleStatusChange = useCallback(
    async (status: ProposalStatus) => {
      setUpdatingStatus(true);
      try {
        const res = await fetch(`/api/propostas/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error();
        toast(`Status atualizado para ${STATUS_LABEL[status]}`, "success");
        mutate();
      } catch {
        toast("Erro ao atualizar status", "error");
      } finally {
        setUpdatingStatus(false);
      }
    },
    [id, toast, mutate]
  );

  const handleDuplicate = useCallback(async () => {
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
  }, [id, router, toast]);

  const handleSend = useCallback(async () => {
    if (!sendTo.trim()) {
      toast("Informe o e-mail do destinatario", "error");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/propostas/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: sendTo.trim(),
          subject: sendSubject.trim() || undefined,
          message: sendMessage.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao enviar");
      toast("Proposta enviada por e-mail!", "success");
      setSendOpen(false);
      setSendMessage("");
      mutate();
    } catch (e) {
      toast((e as Error).message || "Erro ao enviar proposta", "error");
    } finally {
      setSending(false);
    }
  }, [id, sendTo, sendSubject, sendMessage, toast, mutate]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/propostas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Proposta excluida com sucesso!", "success");
      router.push("/propostas");
    } catch {
      toast("Erro ao excluir proposta", "error");
    } finally {
      setDeleting(false);
    }
  }, [id, router, toast]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading || !proposal) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-20" />
        <SkeletonCard className="h-40" />
        <SkeletonTable rows={3} cols={5} />
      </div>
    );
  }

  const status = proposal.status as ProposalStatus;
  const items = proposal.items ?? [];
  const totalHours = Number(proposal.totalHours ?? 0);
  const totalValue = Number(proposal.totalValue ?? 0);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/propostas")}
        className="inline-flex items-center gap-1.5 text-sm text-[#8B8F96] transition-colors hover:text-[#ACACB0]"
      >
        <Icon name="arrow" size={16} className="rotate-180" />
        Voltar para propostas
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#E2E3E4]">
            {proposal.number}
          </h1>
          <Badge variant={STATUS_BADGE[status]}>
            {STATUS_LABEL[status]}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/propostas/${id}/editar`)}
          >
            <Icon name="type" size={16} />
            Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDuplicate}>
            <Icon name="copy" size={16} />
            Duplicar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSendSubject(`Proposta ${proposal.number}`);
              setSendOpen(true);
            }}
          >
            <Icon name="arrow" size={16} />
            Enviar por e-mail
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`/propostas/${id}/pdf`, "_blank")}
          >
            <Icon name="pdf" size={16} />
            PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="text-danger hover:text-danger"
          >
            <Icon name="trash" size={16} />
            Excluir
          </Button>
        </div>
      </div>

      {/* Info card */}
      <Card
        header={
          <h2 className="text-base font-semibold text-[#E2E3E4]">
            Dados da Proposta
          </h2>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase text-[#6B6F76]">
              Cliente
            </p>
            <p className="mt-1 text-sm font-medium text-[#E2E3E4]">
              {proposal.clientName}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-[#6B6F76]">
              Projeto
            </p>
            <p className="mt-1 text-sm font-medium text-[#E2E3E4]">
              {proposal.projectName}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-[#6B6F76]">
              Data
            </p>
            <p className="mt-1 text-sm text-[#ACACB0]">
              {fmtDate(proposal.date)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-[#6B6F76]">
              Responsavel
            </p>
            <p className="mt-1 text-sm text-[#ACACB0]">
              {proposal.user?.name ?? "-"}
            </p>
          </div>
        </div>

        {proposal.observations && (
          <div className="mt-4 rounded-md bg-white/[0.04] p-4">
            <p className="text-xs font-medium uppercase text-[#6B6F76] mb-1">
              Observacoes
            </p>
            <p className="text-sm text-[#ACACB0] whitespace-pre-wrap">
              {proposal.observations}
            </p>
          </div>
        )}
      </Card>

      {/* Items table */}
      <Card
        header={
          <h2 className="text-base font-semibold text-[#E2E3E4]">
            Itens da Proposta
          </h2>
        }
      >
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#8B8F96]">
                  Servico
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#8B8F96] text-center">
                  Horas
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#8B8F96] text-right">
                  Valor/h
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#8B8F96] text-right">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-white/[0.04] last:border-0"
                >
                  <td className="px-6 py-3">
                    <p className="font-medium text-[#E2E3E4]">
                      {item.customName || item.serviceName}
                    </p>
                    {item.description && (
                      <p className="text-xs text-[#6B6F76] mt-0.5">
                        {item.description}
                      </p>
                    )}
                    {item.selectedDeliverables &&
                      item.selectedDeliverables.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {item.selectedDeliverables.map((d: string) => (
                            <span
                              key={d}
                              className="inline-block rounded-full bg-white/[0.04] px-2 py-0.5 text-xs text-[#94C020]"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                  </td>
                  <td className="px-6 py-3 text-center text-[#ACACB0]">
                    {Number(item.hours)}h
                  </td>
                  <td className="px-6 py-3 text-right text-[#ACACB0]">
                    {fmt(Number(item.hourlyRate))}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-[#E2E3E4]">
                    {fmt(Number(item.subtotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 flex items-center justify-end gap-8 border-t border-white/[0.06] pt-4">
          <div className="text-right">
            <p className="text-xs font-medium uppercase text-[#6B6F76]">
              Total Horas
            </p>
            <p className="text-lg font-bold text-[#E2E3E4]">{totalHours}h</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase text-[#6B6F76]">
              Valor Total
            </p>
            <p className="text-lg font-bold text-[#94C020]">
              {fmt(totalValue)}
            </p>
          </div>
        </div>
      </Card>

      {/* Status transition */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#E2E3E4]">
              Status da Proposta
            </p>
            <p className="text-xs text-[#6B6F76]">
              Atualize o status conforme o andamento
            </p>
          </div>

          <div className="flex gap-2">
            {status === "DRAFT" && (
              <Button
                variant="primary"
                size="sm"
                loading={updatingStatus}
                onClick={() => handleStatusChange("SENT")}
              >
                <Icon name="arrow" size={16} />
                Marcar como Enviada
              </Button>
            )}
            {status === "SENT" && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  loading={updatingStatus}
                  onClick={() => handleStatusChange("APPROVED")}
                >
                  <Icon name="check" size={16} />
                  Aprovar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={updatingStatus}
                  onClick={() => handleStatusChange("REJECTED")}
                >
                  <Icon name="close" size={16} />
                  Rejeitar
                </Button>
              </>
            )}
            {(status === "APPROVED" || status === "REJECTED") && (
              <Badge variant={STATUS_BADGE[status]} className="text-sm px-4 py-1.5">
                {STATUS_LABEL[status]}
              </Badge>
            )}
            {status === "EXPIRED" && (
              <Badge variant="expired" className="text-sm px-4 py-1.5">
                Expirada
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Send by email modal */}
      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Enviar proposta por e-mail"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSendOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" loading={sending} onClick={handleSend}>
              <Icon name="arrow" size={16} />
              Enviar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Destinatario *"
            type="email"
            placeholder="cliente@email.com"
            value={sendTo}
            onChange={(e) => setSendTo(e.target.value)}
          />
          <Input
            label="Assunto"
            value={sendSubject}
            onChange={(e) => setSendSubject(e.target.value)}
            placeholder={`Proposta ${proposal.number}`}
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#8B8F96]">
              Mensagem (opcional)
            </label>
            <textarea
              rows={5}
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              placeholder="Adicione uma mensagem personalizada ao cliente..."
              className="w-full resize-none rounded-md border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-[#E2E3E4] placeholder:text-[#6B6F76] transition-colors hover:border-white/[0.1] focus:border-[#94C020] focus:outline-none focus:ring-2 focus:ring-[#94C020]/20"
            />
          </div>
          <p className="text-xs text-[#6B6F76]">
            O destinatario recebera um link para visualizar a proposta. O status mudara para Enviada.
          </p>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir Proposta"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
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
          <strong>{proposal.number}</strong>? Todos os itens e anexos serao
          removidos permanentemente.
        </p>
      </Modal>
    </div>
  );
}
