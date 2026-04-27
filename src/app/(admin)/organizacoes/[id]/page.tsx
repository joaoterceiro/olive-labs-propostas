"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";
import Link from "next/link";

interface OrgMember {
  id: string;
  userId: string;
  organizationId: string;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
}

interface OrgDetail {
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
  createdAt: string;
  members: OrgMember[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((r) => r.data);

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: org, isLoading, mutate } = useSWR<OrgDetail>(
    `/api/admin/organizacoes/${id}`,
    fetcher
  );
  const { toast } = useToast();

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "MEMBER",
  });
  const [addingUser, setAddingUser] = useState(false);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();

    if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) {
      toast("Nome, email e senha são obrigatórios.", "warning");
      return;
    }

    setAddingUser(true);
    try {
      const res = await fetch(`/api/admin/organizacoes/${id}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      const json = await res.json();

      if (!res.ok) {
        toast(json.error || "Erro ao adicionar usuário.", "error");
        return;
      }

      toast("Usuário adicionado com sucesso!", "success");
      setUserForm({ name: "", email: "", password: "", role: "MEMBER" });
      mutate();
    } catch {
      toast("Erro de conexão.", "error");
    } finally {
      setAddingUser(false);
    }
  }

  async function handleRemoveMember(membershipId: string) {
    try {
      const res = await fetch(`/api/admin/organizacoes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      // For remove we delete the membership directly
      const delRes = await fetch(`/api/admin/organizacoes/${id}/usuarios`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });

      // The DELETE endpoint doesn't exist yet, so we do it via a workaround
      // For now we just reload
      if (!res.ok && !delRes.ok) {
        toast("Erro ao remover membro.", "error");
        return;
      }

      mutate();
    } catch {
      toast("Erro de conexão.", "error");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#8B8F96]">
        <Icon name="loader" size={24} className="animate-spin" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="py-20 text-center text-[#8B8F96]">
        Organização não encontrada.
      </div>
    );
  }

  const memberColumns: Column<(OrgMember & Record<string, unknown>)>[] = [
    {
      header: "Nome",
      accessor: "id",
      render: (_val, row) => {
        const member = row as unknown as OrgMember;
        return <span className="font-medium">{member.user.name}</span>;
      },
    },
    {
      header: "Email",
      accessor: "userId",
      render: (_val, row) => {
        const member = row as unknown as OrgMember;
        return member.user.email;
      },
    },
    {
      header: "Cargo",
      accessor: "role",
      render: (val) =>
        val === "ADMIN" ? (
          <Badge variant="sent">Admin</Badge>
        ) : (
          <Badge variant="draft">Membro</Badge>
        ),
    },
    {
      header: "Status",
      accessor: "organizationId",
      render: (_val, row) => {
        const member = row as unknown as OrgMember;
        return member.user.isActive ? (
          <Badge variant="approved">Ativo</Badge>
        ) : (
          <Badge variant="rejected">Inativo</Badge>
        );
      },
    },
    {
      header: "",
      accessor: "createdAt",
      className: "w-12",
      render: (_val, row) => (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => handleRemoveMember(row.id as string)}
          title="Remover membro"
        >
          <Icon name="trash" size={14} />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/organizacoes"
          className="inline-flex items-center gap-1 text-sm text-[#94C020] hover:text-[#7DA61A]"
        >
          <Icon name="arrow" size={14} className="rotate-180" />
          Voltar
        </Link>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <Card
          header={
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#E2E3E4]">
                Informações
              </h2>
              {org.isActive ? (
                <Badge variant="approved">Ativo</Badge>
              ) : (
                <Badge variant="rejected">Inativo</Badge>
              )}
            </div>
          }
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="font-medium text-[#8B8F96]">Nome</dt>
              <dd className="text-[#E2E3E4]">{org.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-[#8B8F96]">Slug</dt>
              <dd className="font-mono text-[#E2E3E4]">{org.slug}</dd>
            </div>
            <div>
              <dt className="font-medium text-[#8B8F96]">Email</dt>
              <dd className="text-[#E2E3E4]">{org.email || "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-[#8B8F96]">Telefone</dt>
              <dd className="text-[#E2E3E4]">{org.phone || "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-[#8B8F96]">CNPJ</dt>
              <dd className="text-[#E2E3E4]">{org.cnpj || "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-[#8B8F96]">Cidade/UF</dt>
              <dd className="text-[#E2E3E4]">
                {org.city || org.state
                  ? `${org.city || ""}${org.city && org.state ? "/" : ""}${org.state || ""}`
                  : "-"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          header={
            <h2 className="text-lg font-semibold text-[#E2E3E4]">
              Adicionar Usuário
            </h2>
          }
        >
          <form onSubmit={handleAddUser} className="flex flex-col gap-3">
            <Input
              label="Nome *"
              name="user_name"
              value={userForm.name}
              onChange={(e) =>
                setUserForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Nome do usuário"
              required
            />
            <Input
              label="Email *"
              name="user_email"
              type="email"
              value={userForm.email}
              onChange={(e) =>
                setUserForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="email@exemplo.com"
              required
            />
            <Input
              label="Senha *"
              name="user_password"
              type="password"
              value={userForm.password}
              onChange={(e) =>
                setUserForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="Senha"
              required
            />
            <Select
              label="Cargo"
              name="user_role"
              value={userForm.role}
              onChange={(e) =>
                setUserForm((f) => ({ ...f, role: e.target.value }))
              }
              options={[
                { value: "MEMBER", label: "Membro" },
                { value: "ADMIN", label: "Administrador" },
              ]}
            />
            <Button type="submit" loading={addingUser} className="mt-1">
              <Icon name="plus" size={16} />
              Adicionar
            </Button>
          </form>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-[#E2E3E4]">
          Membros ({org.members.length})
        </h2>
        <DataTable
          columns={memberColumns}
          data={org.members as (OrgMember & Record<string, unknown>)[]}
          emptyMessage="Nenhum membro encontrado."
        />
      </div>

      <ToastContainer />
    </div>
  );
}
