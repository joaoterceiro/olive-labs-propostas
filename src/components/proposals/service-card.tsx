"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DTag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import type { SelectedService } from "@/types";

interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  deliverables: string[];
}

interface ServiceCardProps {
  service: ServiceData;
  isSelected: boolean;
  selectionData: SelectedService | null;
  onToggle: (serviceId: string) => void;
  onUpdate: (serviceId: string, data: Partial<SelectedService>) => void;
}

export function ServiceCard({
  service,
  isSelected,
  selectionData,
  onToggle,
  onUpdate,
}: ServiceCardProps) {
  const hours = selectionData?.hours ?? 8;
  const hourlyRate = selectionData?.hourlyRate ?? 200;
  const subtotal = hours * hourlyRate;

  const handleDeliverableToggle = useCallback(
    (deliverable: string) => {
      if (!selectionData) return;
      const current = selectionData.selectedDeliverables;
      const next = current.includes(deliverable)
        ? current.filter((d) => d !== deliverable)
        : [...current, deliverable];
      onUpdate(service.id, { selectedDeliverables: next });
    },
    [selectionData, onUpdate, service.id]
  );

  const selectAllDeliverables = useCallback(() => {
    onUpdate(service.id, { selectedDeliverables: [...service.deliverables] });
  }, [onUpdate, service.id, service.deliverables]);

  const clearDeliverables = useCallback(() => {
    onUpdate(service.id, { selectedDeliverables: [] });
  }, [onUpdate, service.id]);

  return (
    <div
      className={cn(
        "rounded-lg glass-subtle transition-all duration-200",
        isSelected
          ? "!border-[#94C020]/40 shadow-[0_4px_16px_rgba(148,192,32,0.08)]"
          : "hover:border-white/[0.1] hover:bg-white/[0.03]"
      )}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => onToggle(service.id)}
        className="flex w-full items-start gap-3 px-5 py-4 text-left"
      >
        <Checkbox
          checked={isSelected}
          onChange={() => onToggle(service.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-[#E2E3E4]">
            {service.name}
          </h4>
          {service.description && (
            <p className="mt-0.5 text-xs text-[#8B8F96] line-clamp-2">
              {service.description}
            </p>
          )}
        </div>
        {isSelected && (
          <span className="shrink-0 text-sm font-semibold text-[#94C020] tabular-nums">
            {fmt(subtotal)}
          </span>
        )}
      </button>

      {/* Expanded content when selected */}
      {isSelected && selectionData && (
        <div className="border-t border-white/[0.06] px-5 py-4 space-y-4 animate-fade-up">
          {/* Custom name override */}
          <Input
            label="Nome personalizado"
            placeholder={service.name}
            value={selectionData.customName}
            onChange={(e) =>
              onUpdate(service.id, { customName: e.target.value })
            }
          />

          {/* Custom description override */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#8B8F96]">
              Descricao personalizada
            </label>
            <textarea
              placeholder={service.description ?? ""}
              value={selectionData.customDescription}
              onChange={(e) =>
                onUpdate(service.id, {
                  customDescription: e.target.value,
                })
              }
              rows={2}
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-[#E2E3E4] placeholder:text-[#8B8F96] transition-colors focus:outline-none focus:ring-2 focus:ring-[#94C020]/20 focus:border-[#94C020] hover:border-white/[0.1]"
            />
          </div>

          {/* Hours and hourly rate */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Horas"
              type="number"
              min={1}
              value={selectionData.hours}
              onChange={(e) =>
                onUpdate(service.id, {
                  hours: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
            <Input
              label="Valor/hora (R$)"
              type="number"
              min={0}
              step={10}
              value={selectionData.hourlyRate}
              onChange={(e) =>
                onUpdate(service.id, {
                  hourlyRate: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          </div>

          {/* Subtotal */}
          <div className="flex items-center justify-between rounded-lg border border-[#94C020]/10 bg-[#94C020]/[0.04] px-4 py-2.5">
            <span className="text-sm font-medium text-[#E2E3E4]">Subtotal</span>
            <span
              key={subtotal}
              className="text-sm font-bold text-[#94C020] tabular-nums animate-flash"
            >
              {fmt(subtotal)}
            </span>
          </div>

          {/* Deliverables */}
          {service.deliverables.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#8B8F96]">
                  Entregaveis
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={selectAllDeliverables}
                  >
                    Selecionar Todos
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={clearDeliverables}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {service.deliverables.map((d) => (
                  <DTag
                    key={d}
                    active={selectionData.selectedDeliverables.includes(d)}
                    onClick={() => handleDeliverableToggle(d)}
                  >
                    {d}
                  </DTag>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
