"use client";

import { useState } from "react";
import useSWR from "swr";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";
import { fmtDate } from "@/lib/utils";

interface Membership {
  organization: { id: string; name: string; slug: string };
  role: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  memberships: Membership[];
}

interface Org {
  id: string;
  name: string;
}

const fetcher = (url: string) =>
  fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error("Fetch failed");
      return r.json();
    })
    .then((r) => r.data);

export default function UsuariosPage() {
  const { data: users, isLoading, mutate } = useSWR<User[]>(
    "/api/admin/usuarios",
    fetcher
  );
  const { data: orgs } = useSWR<Org[]>(
    "/api/admin/organizacoes",
    (url: string) =>
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error("Fetch failed");
          return r.json();
        })
        .then((r) => r.data)
  );

  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setOrganizationId("");
    setRole("MEMBER");
    setErrors({});
  }

  function openModal() {
    resetForm();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome obrigatório";
    if (!email.trim()) e.email = "E-mail obrigatório";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "E-mail inválido";
    if (!password) e.password = "Senha obrigatória";
    else if (password.length < 6) e.password = "Mínimo 6 caracteres";
    if (!organizationId) e.organizationId = "Selecione uma organização";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, organizationId, role }),
      });
      if (res.ok) {
        toast("Usuário criado com sucesso!", "success");
        setModalOpen(false);
        resetForm();
        mutate();
      } else {
        const data = await res.json();
        toast(data.error || "Erro ao criar usuário", "error");
      }
    } catch {
      toast("Erro ao criar usuário", "error");
    } finally {
      setCreating(false);
    }
  }

  // Block/Unblock
  async function handleToggleBlock(user: User) {
    try {
      const res = await fetch(`/api/admin/usuarios/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        const data = await res.json();
        toast(data.message, "success");
        mutate();
      } else {
        const data = await res.json();
        toast(data.error || "Erro", "error");
      }
    } catch {
      toast("Erro ao atualizar usuário", "error");
    }
  }

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast("Usuário excluído", "success");
        setDeleteTarget(null);
        mutate();
      } else {
        const data = await res.json();
        toast(data.error || "Erro ao excluir", "error");
      }
    } catch {
      toast("Erro ao excluir", "error");
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<User>[] = [
    {
      header: "Nome",
      accessor: "name",
      render: (_val, user) => (
        <div>
          <p className="font-medium text-[#E2E3E4]">{user.name}</p>
          <p className="text-xs text-[#8B8F96]">{user.email}</p>
        </div>
      ),
    },
    {
      header: "Organizações",
      accessor: "memberships",
      render: (_val, user) =>
        user.memberships.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {user.memberships.map((m) => (
              <span
                key={m.organization.id}
                className="inline-flex items-center rounded bg-white/[0.04] px-2 py-0.5 text-xs font-medium text-[#94C020]"
              >
                {m.organization.name}
                <span className="ml-1 text-[#8B8F96]">
                  ({m.role === "ADMIN" ? "Admin" : "Membro"})
                </span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-[#8B8F96]">Sem organização</span>
        ),
    },
    {
      header: "Tipo",
      accessor: "isSuperAdmin",
      render: (_val, user) =>
        user.isSuperAdmin ? (
          <Badge variant="approved">Super Admin</Badge>
        ) : (
          <span className="text-sm text-[#8B8F96]">Usuário</span>
        ),
    },
    {
      header: "Criado em",
      accessor: "createdAt",
      render: (_val, user) => (
        <span className="text-sm text-[#8B8F96]">
          {fmtDate(user.createdAt)}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      render: (_val, user) => (
        <Badge variant={user.isActive ? "approved" : "expired"}>
          {user.isActive ? "Ativo" : "Bloqueado"}
        </Badge>
      ),
    },
    {
      header: "Ações",
      accessor: "id",
      className: "w-[100px]",
      render: (_val, user) =>
        user.isSuperAdmin ? (
          <span className="text-[10px] text-[#4A4B50]">Protegido</span>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleToggleBlock(user)}
              title={user.isActive ? "Bloquear" : "Desbloquear"}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#8B8F96] transition-colors hover:bg-white/[0.04] hover:text-[#FBBF24]"
            >
              <Icon name={user.isActive ? "alert" : "check"} size={14} />
            </button>
            <button
              onClick={() => setDeleteTarget(user)}
              title="Excluir"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#8B8F96] transition-colors hover:bg-[#F87171]/10 hover:text-[#F87171]"
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        ),
    },
  ];

  const orgOptions = (orgs ?? []).map((o) => ({
    value: o.id,
    label: o.name,
  }));

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Action bar */}
      <div className="flex justify-end">
        <Button onClick={openModal}>
          <Icon name="plus" size={16} />
          Novo Usuário
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="skel h-8 w-48 rounded" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users ?? []}
          emptyMessage="Nenhum usuário encontrado."
        />
      )}

      {/* Create User Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Usuário"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              Criar Usuário
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: "" }));
            }}
            error={errors.name}
            placeholder="Nome completo"
          />
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: "" }));
            }}
            error={errors.email}
            placeholder="email@exemplo.com"
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((prev) => ({ ...prev, password: "" }));
            }}
            error={errors.password}
            placeholder="Mínimo 6 caracteres"
          />
          <Select
            label="Organização"
            value={organizationId}
            onChange={(e) => {
              setOrganizationId(e.target.value);
              setErrors((prev) => ({ ...prev, organizationId: "" }));
            }}
            options={orgOptions}
            placeholder="Selecione uma organização"
            error={errors.organizationId}
          />
          <Select
            label="Função"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={[
              { value: "MEMBER", label: "Membro" },
              { value: "ADMIN", label: "Administrador" },
            ]}
          />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir Usuário"
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
          Tem certeza que deseja excluir o usuário{" "}
          <strong className="text-[#E2E3E4]">{deleteTarget?.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
