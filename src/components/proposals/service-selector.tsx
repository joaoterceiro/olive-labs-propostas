"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { fmt } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ServiceCard } from "./service-card";
import type { SelectedService, SelectedServices } from "@/types";

interface ServiceFromAPI {
  id: string;
  name: string;
  description: string | null;
  deliverables: string[];
  sortOrder: number;
}

interface ServiceSelectorProps {
  selectedServices: SelectedServices;
  onChange: (services: SelectedServices) => void;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

export function ServiceSelector({
  selectedServices,
  onChange,
}: ServiceSelectorProps) {
  const { data: services, isLoading } = useSWR<ServiceFromAPI[]>(
    "/api/servicos",
    fetcher
  );

  const handleToggle = useCallback(
    (serviceId: string) => {
      const next = { ...selectedServices };
      if (next[serviceId]) {
        delete next[serviceId];
      } else {
        const service = services?.find((s) => s.id === serviceId);
        next[serviceId] = {
          serviceId,
          hours: 8,
          hourlyRate: 200,
          selectedDeliverables: service?.deliverables ?? [],
          customName: "",
          customDescription: "",
        };
      }
      onChange(next);
    },
    [selectedServices, onChange, services]
  );

  const handleUpdate = useCallback(
    (serviceId: string, data: Partial<SelectedService>) => {
      const current = selectedServices[serviceId];
      if (!current) return;
      onChange({
        ...selectedServices,
        [serviceId]: { ...current, ...data },
      });
    },
    [selectedServices, onChange]
  );

  // Summary calculations
  const entries = Object.values(selectedServices);
  const totalServices = entries.length;
  const totalHours = entries.reduce((sum, s) => sum + s.hours, 0);
  const totalValue = entries.reduce(
    (sum, s) => sum + s.hours * s.hourlyRate,
    0
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <EmptyState
        title="Nenhum servico cadastrado"
        description="Cadastre servicos na Biblioteca antes de criar propostas."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            isSelected={!!selectedServices[service.id]}
            selectionData={selectedServices[service.id] ?? null}
            onToggle={handleToggle}
            onUpdate={handleUpdate}
          />
        ))}
      </div>

      {/* Summary */}
      {totalServices > 0 && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="layers" size={16} className="text-[#8B8F96]" />
            <span className="text-sm font-semibold text-[#E2E3E4]">
              Resumo
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-[#8B8F96]">Servicos</p>
              <p className="text-lg font-bold text-[#E2E3E4]">
                {totalServices}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#8B8F96]">Horas</p>
              <p className="text-lg font-bold text-[#E2E3E4]">{totalHours}</p>
            </div>
            <div>
              <p className="text-xs text-[#8B8F96]">Total/mes</p>
              <p className="text-lg font-bold text-[#E2E3E4]">
                {fmt(totalValue)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
