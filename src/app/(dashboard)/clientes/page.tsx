"use client";

import { useState, useCallback, useMemo, type FormEvent } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
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
  [key: string]: unknown;
}

interface PaginatedClients {
  data: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

const emptyForm: ClientForm = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  cnpj: "",
  city: "",
  state: "",
  notes: "",
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

// ── component ────────────────────────────────────────────────────────────────
export default function ClientesPage() {
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search) params.set("search", search);
    return `/api/clientes?${params.toString()}`;
  }, [page, search]);

  const { data, isLoading, mutate } = useSWR<PaginatedClients>(apiUrl, fetcher, {
    keepPreviousData: true,
  });

  // ── handlers ───────────────────────────────────────────────────────────────
  function openCreate() {
    setEditingClient(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
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
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingClient(null);
    setForm(emptyForm);
  }

  function setField(field: keyof ClientForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!form.companyName.trim()) {
        toast("Nome da empresa e obrigatorio.", "error");
        return;
      }

      setSaving(true);
      try {
        const isEdit = !!editingClient;
        const url = isEdit
          ? `/api/clientes/${editingClient.id}`
          : "/api/clientes";
        const method = isEdit ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Erro ao salvar cliente");
        }

        toast(isEdit ? "Cliente atualizado!" : "Cliente criado!", "success");
        closeModal();
        mutate();
      } catch (err) {
        toast(err instanceof Error ? err.message : "Erro inesperado", "error");
      } finally {
        setSaving(false);
      }
    },
    [form, editingClient, toast, mutate]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clientes/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erro ao excluir");
      }
      toast("Cliente excluido.", "success");
      setDeleteId(null);
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro inesperado", "error");
    } finally {
      setDeleting(false);
    }
  }, [deleteId, toast, mutate]);

  // ── columns ────────────────────────────────────────────────────────────────
  const columns: Column<Client>[] = useMemo(
    () => [
      { header: "Empresa", accessor: "companyName", sortable: true },
      { header: "Contato", accessor: "contactName", sortable: true },
      { header: "E-mail", accessor: "email" },
      { header: "Telefone", accessor: "phone" },
      {
        header: "Cidade/UF",
        accessor: "city",
        render: (_val, row) => {
          const parts = [row.city, row.state].filter(Boolean);
          return parts.join(" / ") || "-";
        },
      },
      {
        header: "",
        accessor: "id",
        className: "w-28 text-right",
        render: (_val, row) => (
          <div className="flex items-center justify-end gap-1">
            <a
              href={`/clientes/${row.id}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6B6F76] hover:bg-white/[0.06] hover:text-[#E2E3E4] transition-colors"
              title="Ver detalhes"
            >
              <Icon name="eye" size={16} />
            </a>
            <button
              onClick={() => openEdit(row)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6B6F76] hover:bg-white/[0.06] hover:text-[#E2E3E4] transition-colors"
              title="Editar"
            >
              <Icon name="sliders" size={16} />
            </button>
            <button
              onClick={() => setDeleteId(row.id)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B6F76] hover:bg-[#F87171]/10 hover:text-[#F87171] transition-colors"
              title="Excluir"
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // ── render ─────────────────────────────────────────────────────────────────
  const clients = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Search + Action */}
      <div className="flex justify-between items-center">
        <div className="max-w-sm flex-1 relative">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6F76] pointer-events-none" />
          <Input
            placeholder="Buscar por empresa, contato ou e-mail..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button onClick={openCreate}>
          <Icon name="plus" size={16} />
          Novo Cliente
        </Button>
      </div>

      {/* Table */}
      {isLoading && clients.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Icon name="loader" size={24} className="animate-spin text-[#94C020]" />
        </div>
      ) : clients.length === 0 && !search ? (
        <EmptyState
          title="Nenhum cliente cadastrado"
          description="Adicione seu primeiro cliente para comecar."
          action={
            <Button onClick={openCreate}>
              <Icon name="plus" size={16} />
              Novo Cliente
            </Button>
          }
        />
      ) : (
        <>
          <DataTable columns={columns} data={clients} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-[#8B8F96]">
                Pagina {page} de {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Proxima
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Create / Edit Modal ────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingClient ? "Editar Cliente" : "Novo Cliente"}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={handleSubmit}>
              {editingClient ? "Salvar" : "Criar"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Excluir Cliente"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
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
