"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

interface MembershipData {
  userId: string;
  organizationId: string;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
  organization: { id: string; name: string };
}

interface UserData {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  phone: string | null;
  createdAt: string;
  memberships: MembershipData[];
}

export default function PerfilPage() {
  const { data, mutate, isLoading } = useSWR<{ data: UserData }>(
    "/api/perfil",
    fetcher
  );
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = data?.data;

  // Profile form state
  const [form, setForm] = useState<Partial<UserData>>({});

  const currentForm = {
    name: form.name ?? user?.name ?? "",
    email: form.email ?? user?.email ?? "",
    phone: form.phone ?? user?.phone ?? "",
    avatarUrl: form.avatarUrl ?? user?.avatarUrl ?? "",
  };

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  function updatePasswordField(key: string, value: string) {
    setPasswordForm((prev) => ({ ...prev, [key]: value }));
  }

  // Avatar upload
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "attachments");
    formData.append("prefix", "avatars");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        toast("Erro ao enviar imagem", "error");
        return;
      }
      const localUrl = URL.createObjectURL(file);
      setForm((prev) => ({ ...prev, avatarUrl: localUrl }));
      toast("Imagem carregada. Salve para aplicar.", "success");
    } catch {
      toast("Erro ao enviar imagem", "error");
    }
  }

  // Save profile
  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast("Perfil salvo com sucesso!", "success");
        setForm({});
        mutate();
      } else {
        const data = await res.json();
        toast(data.error || "Erro ao salvar", "error");
      }
    } catch {
      toast("Erro ao salvar perfil", "error");
    } finally {
      setSaving(false);
    }
  }

  // Change password
  async function handlePasswordChange() {
    if (passwordForm.newPassword.length < 6) {
      toast("A nova senha deve ter no minimo 6 caracteres", "error");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast("As senhas nao coincidem", "error");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/perfil/senha", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      if (res.ok) {
        toast("Senha alterada com sucesso!", "success");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const data = await res.json();
        toast(data.error || "Erro ao alterar senha", "error");
      }
    } catch {
      toast("Erro ao alterar senha", "error");
    } finally {
      setSavingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-md bg-white/[0.04]" />
          ))}
        </div>
      </div>
    );
  }

  const membership = user?.memberships?.[0];
  const initial = user?.name?.charAt(0).toUpperCase() ?? "U";

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Dados Pessoais */}
      <Card
        header={
          <h2 className="text-base font-semibold text-[#E2E3E4]">
            Dados Pessoais
          </h2>
        }
      >
        <div className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-[#94C020]/12">
              {currentForm.avatarUrl ? (
                <img
                  src={currentForm.avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#94C020]">
                  {initial}
                </div>
              )}
            </div>
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="upload" size={14} />
                Alterar
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Nome"
              value={currentForm.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
            <Input
              label="E-mail"
              type="email"
              value={currentForm.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            <Input
              label="Telefone"
              value={currentForm.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving}>
              <Icon name="check" size={16} />
              Salvar Alteracoes
            </Button>
          </div>
        </div>
      </Card>

      {/* Trocar Senha */}
      <Card
        header={
          <h2 className="text-base font-semibold text-[#E2E3E4]">
            Trocar Senha
          </h2>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="Senha atual"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => updatePasswordField("currentPassword", e.target.value)}
            />
            <Input
              label="Nova senha"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => updatePasswordField("newPassword", e.target.value)}
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => updatePasswordField("confirmPassword", e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={handlePasswordChange}
              loading={savingPassword}
            >
              <Icon name="settings" size={16} />
              Alterar Senha
            </Button>
          </div>
        </div>
      </Card>

      {/* Informacoes */}
      {membership && (
        <Card
          header={
            <h2 className="text-base font-semibold text-[#E2E3E4]">
              Informacoes
            </h2>
          }
        >
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div>
              <span className="text-[#6B6F76]">Organizacao</span>
              <p className="font-medium text-[#E2E3E4]">
                {membership.organization.name}
              </p>
            </div>
            <div>
              <span className="text-[#6B6F76]">Funcao</span>
              <p className="font-medium text-[#E2E3E4]">
                {membership.role === "ADMIN" ? "Administrador" : "Membro"}
              </p>
            </div>
            <div>
              <span className="text-[#6B6F76]">Membro desde</span>
              <p className="font-medium text-[#E2E3E4]">
                {new Date(membership.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
