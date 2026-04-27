"use client";

import { useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fmt } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
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
  const { data: services, isLoading, error } = useSWR<ServiceFromAPI[]>(
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

  if (error) {
    return (
      <EmptyState
        title="Nao foi possivel carregar os servicos"
        description="Verifique sua conexao e tente novamente."
      />
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] px-5 py-6 text-center">
        <Icon name="tag" size={22} className="mx-auto mb-2 text-[#8B8F96]" />
        <p className="text-sm font-medium text-[#E2E3E4] mb-1">
          Nenhum servico cadastrado
        </p>
        <p className="text-xs text-[#8B8F96] mb-4">
          Cadastre seu primeiro servico para comecar a montar propostas.
        </p>
        <Link href="/biblioteca">
          <Button variant="primary" size="sm">
            <Icon name="plus" size={14} />
            Criar servico na Biblioteca
          </Button>
        </Link>
      </div>
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
        <div className="sticky bottom-2 rounded-lg border border-white/[0.08] bg-[#0F0F11]/85 backdrop-blur-md px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="layers" size={14} className="text-[#94C020]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8B8F96]">
              Resumo
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#8B8F96]">
                Servicos
              </p>
              <p className="text-lg font-bold text-[#E2E3E4] tabular-nums">
                {totalServices}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#8B8F96]">
                Horas
              </p>
              <p className="text-lg font-bold text-[#E2E3E4] tabular-nums">
                {totalHours}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#8B8F96]">
                Total
              </p>
              <p
                key={totalValue}
                className="text-lg font-bold text-[#94C020] tabular-nums animate-flash"
              >
                {fmt(totalValue)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
