"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";
import Link from "next/link";

interface Org {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  cnpj: string | null;
  city: string | null;
  state: string | null;
  primaryColor: string | null;
  isActive: boolean;
  membersCount: number;
  createdAt: string;
}

type OrgForm = {
  name: string;
  slug: string;
  email: string;
  phone: string;
  cnpj: string;
  city: string;
  state: string;
};

const emptyForm: OrgForm = { name: "", slug: "", email: "", phone: "", cnpj: "", city: "", state: "" };

const fetcher = (url: string) =>
  fetch(url)
    .then((r) => { if (!r.ok) throw new Error("Fetch failed"); return r.json(); })
    .then((r) => r.data);

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function OrganizacoesPage() {
  const { data: orgs, isLoading, mutate } = useSWR<Org[]>("/api/admin/organizacoes", fetcher);
  const { toast } = useToast();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Org | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Org | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<OrgForm>(emptyForm);

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setEditingOrg(null);
  }, []);

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(org: Org) {
    setEditingOrg(org);
    setForm({
      name: org.name,
      slug: org.slug,
      email: org.email ?? "",
      phone: org.phone ?? "",
      cnpj: org.cnpj ?? "",
      city: org.city ?? "",
      state: org.state ?? "",
    });
    setModalOpen(true);
  }

  function handleNameChange(value: string) {
    setForm((f) => ({
      ...f,
      name: value,
      slug: editingOrg ? f.slug : slugify(value),
    }));
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      toast("Nome e slug são obrigatórios.", "warning");
      return;
    }

    setSaving(true);
    try {
      const url = editingOrg
        ? `/api/admin/organizacoes/${editingOrg.id}`
        : "/api/admin/organizacoes";
      const method = editingOrg ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (!res.ok) {
        toast(json.error || "Erro ao salvar organização.", "error");
        return;
      }

      toast(
        editingOrg ? "Organização atualizada!" : "Organização criada!",
        "success"
      );
      setModalOpen(false);
      resetForm();
      mutate();
    } catch {
      toast("Erro de conexão.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/organizacoes/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast("Organização excluída.", "success");
        setDeleteTarget(null);
        mutate();
      } else {
        const json = await res.json();
        toast(json.error || "Erro ao excluir.", "error");
      }
    } catch {
      toast("Erro de conexão.", "error");
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Org & Record<string, unknown>>[] = [
    {
      header: "Nome",
      accessor: "name",
      sortable: true,
      render: (_val, row) => (
        <Link
          href={`/organizacoes/${row.id}`}
          className="font-medium text-[#94C020] hover:underline"
        >
          {row.name as string}
        </Link>
      ),
    },
    { header: "Slug", accessor: "slug", sortable: true },
    { header: "Email", accessor: "email" },
    {
      header: "Cidade/UF",
      accessor: "city",
      render: (_val, row) => {
        const city = row.city as string | null;
        const state = row.state as string | null;
        if (!city && !state) return <span className="text-[#8B8F96]">-</span>;
        return `${city || ""}${city && state ? "/" : ""}${state || ""}`;
      },
    },
    {
      header: "Membros",
      accessor: "membersCount",
      sortable: true,
      render: (val) => <span className="font-medium">{val as number}</span>,
    },
    {
      header: "Status",
      accessor: "isActive",
      render: (val) =>
        val ? (
          <Badge variant="approved">Ativo</Badge>
        ) : (
          <Badge variant="rejected">Inativo</Badge>
        ),
    },
    {
      header: "",
      accessor: "id",
      className: "w-[100px]",
      render: (_val, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row as unknown as Org); }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#8B8F96] transition-colors hover:bg-white/[0.04] hover:text-[#94C020]"
          >
            <Icon name="sliders" size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row as unknown as Org); }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#8B8F96] transition-colors hover:bg-[#F87171]/10 hover:text-[#F87171]"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <ToastContainer />

      <div className="mb-6 flex justify-end">
        <Button onClick={openCreate}>
          <Icon name="plus" size={16} />
          Nova Organização
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-[#8B8F96]">
          <Icon name="loader" size={24} className="animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={(orgs ?? []) as (Org & Record<string, unknown>)[]}
          emptyMessage="Nenhuma organização encontrada."
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingOrg ? "Editar Organização" : "Nova Organização"}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setModalOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={() => handleSubmit()}>
              {editingOrg ? "Salvar" : "Criar"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Nome *"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Nome da organização"
          />
          <Input
            label="Slug *"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="slug-da-organizacao"
          />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="contato@empresa.com" />
          <Input label="Telefone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" />
          <Input label="CNPJ" value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cidade" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Cidade" />
            <Input label="UF" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="UF" />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir Organização"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[#ACACB0]">
          Tem certeza que deseja excluir a organização{" "}
          <strong className="text-[#E2E3E4]">{deleteTarget?.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
