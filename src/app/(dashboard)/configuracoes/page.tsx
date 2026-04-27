"use client";

import { useState } from "react";
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

interface OrgData {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
}

export default function ConfiguracoesPage() {
  const { data, mutate, isLoading } = useSWR<{ data: OrgData }>(
    "/api/configuracoes",
    fetcher
  );
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const org = data?.data;

  const [form, setForm] = useState<Partial<OrgData>>({});

  // Initialize form when data loads
  const currentForm = {
    name: form.name ?? org?.name ?? "",
    email: form.email ?? org?.email ?? "",
    phone: form.phone ?? org?.phone ?? "",
    cnpj: form.cnpj ?? org?.cnpj ?? "",
    address: form.address ?? org?.address ?? "",
    city: form.city ?? org?.city ?? "",
    state: form.state ?? org?.state ?? "",
    website: form.website ?? org?.website ?? "",
    primaryColor: form.primaryColor ?? org?.primaryColor ?? "#94C020",
  };

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast("Configurações salvas com sucesso!", "success");
        setForm({});
        mutate();
      } else {
        const data = await res.json();
        toast(data.error || "Erro ao salvar", "error");
      }
    } catch {
      toast("Erro ao salvar configurações", "error");
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-6">
      <ToastContainer />

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          <Icon name="check" size={16} />
          Salvar Alterações
        </Button>
      </div>

      {/* Dados da Empresa */}
      <Card
        header={
          <h2 className="text-base font-semibold text-[#E2E3E4]">
            Dados da Empresa
          </h2>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nome da Empresa"
            value={currentForm.name}
            onChange={(e) => updateField("name", e.target.value)}
          />
          <Input
            label="CNPJ"
            value={currentForm.cnpj}
            onChange={(e) => updateField("cnpj", e.target.value)}
            placeholder="00.000.000/0000-00"
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
          <Input
            label="Website"
            value={currentForm.website}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://"
          />
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#8B8F96]">
              Cor Primária
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={currentForm.primaryColor}
                onChange={(e) => updateField("primaryColor", e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-white/[0.06]"
              />
              <span className="text-sm font-mono text-[#ACACB0]">
                {currentForm.primaryColor}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Endereço */}
      <Card
        header={
          <h2 className="text-base font-semibold text-[#E2E3E4]">
            Endereço
          </h2>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Input
              label="Endereço"
              value={currentForm.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cidade"
              value={currentForm.city}
              onChange={(e) => updateField("city", e.target.value)}
            />
            <Input
              label="Estado"
              value={currentForm.state}
              onChange={(e) => updateField("state", e.target.value)}
              placeholder="SP"
            />
          </div>
        </div>
      </Card>

      {/* Info da Organização */}
      <Card
        header={
          <h2 className="text-base font-semibold text-[#E2E3E4]">
            Informações do Sistema
          </h2>
        }
      >
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <span className="text-[#8B8F96]">Slug</span>
            <p className="font-medium text-[#ACACB0]">{org?.slug}</p>
          </div>
          <div>
            <span className="text-[#8B8F96]">ID</span>
            <p className="truncate font-mono text-xs text-[#8B8F96]">
              {org?.id}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
