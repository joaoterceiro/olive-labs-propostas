"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { DTag } from "@/components/ui/tag";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";

interface Service {
  id: string;
  name: string;
  description: string | null;
  deliverables: string[];
  sortOrder: number;
  createdAt: string;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

export default function BibliotecaPage() {
  const { data: services, mutate, isLoading } = useSWR<Service[]>("/api/servicos", fetcher);
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  function openCreate() {
    setEditingService(null);
    setName("");
    setDescription("");
    setDeliverables([]);
    setTagInput("");
    setModalOpen(true);
  }

  function openEdit(service: Service) {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description ?? "");
    setDeliverables([...service.deliverables]);
    setTagInput("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingService(null);
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = tagInput.trim();
      if (value && !deliverables.includes(value)) {
        setDeliverables((prev) => [...prev, value]);
      }
      setTagInput("");
    }
  }

  function removeDeliverable(index: number) {
    setDeliverables((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        deliverables,
      };

      const url = editingService
        ? `/api/servicos/${editingService.id}`
        : "/api/servicos";
      const method = editingService ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao salvar serviço");
      }

      toast(
        editingService ? "Serviço atualizado com sucesso" : "Serviço criado com sucesso",
        "success"
      );
      mutate();
      closeModal();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao salvar serviço", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/servicos/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao excluir serviço");
      }

      toast("Serviço excluído com sucesso", "success");
      mutate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao excluir serviço", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Action button */}
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Icon name="plus" size={16} />
          Novo Serviço
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.04]"
            />
          ))}
        </div>
      ) : !services || services.length === 0 ? (
        <EmptyState
          title="Nenhum serviço cadastrado"
          description="Crie seu primeiro serviço para utilizar nas propostas"
          action={
            <Button onClick={openCreate}>
              <Icon name="plus" size={16} />
              Novo Serviço
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {services.map((service) => (
            <Card
              key={service.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
            >
              <div
                onClick={() => openEdit(service)}
                className="space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-[#E2E3E4] leading-tight">
                    {service.name}
                  </h2>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(service); }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8B8F96] transition-colors hover:bg-white/[0.06] hover:text-[#94C020]"
                      aria-label="Editar"
                    >
                      <Icon name="sliders" size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(service); }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8B8F96] transition-colors hover:bg-[#F87171]/10 hover:text-[#F87171]"
                      aria-label="Excluir"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>

                {service.description && (
                  <p className="text-sm text-[#8B8F96] line-clamp-3">
                    {service.description}
                  </p>
                )}

                {service.deliverables.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {service.deliverables.map((d, i) => (
                      <DTag key={i}>{d}</DTag>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingService ? "Editar Serviço" : "Novo Serviço"}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={saving} disabled={!name.trim()}>
              {editingService ? "Salvar" : "Criar"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome do serviço"
            placeholder="Ex: Identidade Visual"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#ACACB0]">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional do serviço..."
              rows={3}
              className="w-full rounded-md border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-[#E2E3E4] placeholder:text-[#8B8F96] transition-colors focus:outline-none focus:ring-2 focus:ring-[#94C020] focus:border-transparent hover:border-white/[0.1] resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#ACACB0]">
              Entregáveis
            </label>
            <Input
              placeholder="Digite e pressione Enter para adicionar..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
            />
            {deliverables.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {deliverables.map((d, i) => (
                  <DTag key={i} active onClick={() => removeDeliverable(i)}>
                    {d}
                    <Icon name="close" size={12} />
                  </DTag>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirmar exclusão"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#ACACB0]">
          Tem certeza que deseja excluir o serviço{" "}
          <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
        </p>
      </Modal>

      <ToastContainer />
    </div>
  );
}
