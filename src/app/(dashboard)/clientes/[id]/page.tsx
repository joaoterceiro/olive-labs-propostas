"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useMemo, type FormEvent } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

// ── types ────────────────────────────────────────────────────────────────────
interface Client {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  createdAt: string;
  _count: { proposals: number };
}

interface ClientForm {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  cnpj: string;
  city: string;
  state: string;
  notes: string;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Erro ao carregar dados");
    return r.json();
  });

// ── component ────────────────────────────────────────────────────────────────
export default function ClienteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const clientId = params.id;

  const { data: client, isLoading, mutate } = useSWR<Client>(
    `/api/clientes/${clientId}`,
    fetcher
  );

  // ── edit modal state ───────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ClientForm>({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    cnpj: "",
    city: "",
    state: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openEdit() {
    if (!client) return;
    setForm({
      companyName: client.companyName,
      contactName: client.contactName ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      cnpj: client.cnpj ?? "",
      city: client.city ?? "",
      state: client.state ?? "",
      notes: client.notes ?? "",
    });
    setEditOpen(true);
  }

  function setField(field: keyof ClientForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const handleUpdate = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!form.companyName.trim()) {
        toast("Nome da empresa e obrigatorio.", "error");
        return;
      }
      setSaving(true);
      try {
        const res = await fetch(`/api/clientes/${clientId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Erro ao salvar");
        }
        toast("Cliente atualizado!", "success");
        setEditOpen(false);
        mutate();
      } catch (err) {
        toast(err instanceof Error ? err.message : "Erro inesperado", "error");
      } finally {
        setSaving(false);
      }
    },
    [form, clientId, toast, mutate]
  );

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/clientes/${clientId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erro ao excluir");
      }
      toast("Cliente excluido.", "success");
      router.push("/clientes");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro inesperado", "error");
    } finally {
      setDeleting(false);
    }
  }, [clientId, toast, router]);

  // ── info rows helper ───────────────────────────────────────────────────────
  const infoRows = useMemo(() => {
    if (!client) return [];
    return [
      { label: "Empresa", value: client.companyName },
      { label: "Contato", value: client.contactName },
      { label: "E-mail", value: client.email },
      { label: "Telefone", value: client.phone },
      { label: "CNPJ", value: client.cnpj },
      { label: "Endereco", value: client.address },
      {
        label: "Cidade / UF",
        value: [client.city, client.state].filter(Boolean).join(" / ") || null,
      },
      { label: "Observacoes", value: client.notes },
    ];
  }, [client]);

  // ── loading / error ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon name="loader" size={24} className="animate-spin text-[#94C020]" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/clientes")}>
          <Icon name="arrow" size={16} className="rotate-180" />
          Voltar
        </Button>
        <p className="text-sm text-[#8B8F96]">Cliente nao encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/clientes")}>
          <Icon name="arrow" size={16} className="rotate-180" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openEdit}>
            <Icon name="sliders" size={16} />
            Editar
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Icon name="trash" size={16} />
            Excluir
          </Button>
        </div>
      </div>

      {/* Client info card */}
      <Card
        header={
          <h2 className="text-lg font-semibold text-[#E2E3E4]">
            {client.companyName}
          </h2>
        }
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          {infoRows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs font-medium uppercase tracking-wider text-[#6B6F76]">
                {row.label}
              </dt>
              <dd className="mt-0.5 text-sm text-[#ACACB0]">
                {row.value || "-"}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Proposals section */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#E2E3E4]">
              Propostas ({client._count.proposals})
            </h2>
          </div>
        }
      >
        {client._count.proposals === 0 ? (
          <p className="text-sm text-[#6B6F76] py-4 text-center">
            Nenhuma proposta vinculada a este cliente.
          </p>
        ) : (
          <p className="text-sm text-[#8B8F96]">
            Este cliente possui{" "}
            <span className="font-semibold text-[#ACACB0]">
              {client._count.proposals}
            </span>{" "}
            proposta(s). Acesse a lista de propostas para visualiza-las.
          </p>
        )}
      </Card>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar Cliente"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={handleUpdate}>
              Salvar
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Empresa *"
            name="companyName"
            value={form.companyName}
            onChange={(e) => setField("companyName", e.target.value)}
            required
          />
          <Input
            label="Contato"
            name="contactName"
            value={form.contactName}
            onChange={(e) => setField("contactName", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="E-mail"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
            />
            <Input
              label="Telefone"
              name="phone"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </div>
          <Input
            label="CNPJ"
            name="cnpj"
            value={form.cnpj}
            onChange={(e) => setField("cnpj", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cidade"
              name="city"
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
            />
            <Input
              label="UF"
              name="state"
              value={form.state}
              onChange={(e) => setField("state", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="notes"
              className="text-sm font-medium text-[#ACACB0]"
            >
              Observacoes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              className="w-full rounded-md border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-[#E2E3E4] placeholder:text-[#6B6F76] transition-colors focus:outline-none focus:ring-2 focus:ring-[#94C020] focus:border-transparent hover:border-white/[0.1]"
            />
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation ────────────────────────────────────────────── */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir Cliente"
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
          Tem certeza que deseja excluir este cliente? Esta acao nao pode ser
          desfeita.
        </p>
      </Modal>

      <ToastContainer />
    </div>
  );
}
