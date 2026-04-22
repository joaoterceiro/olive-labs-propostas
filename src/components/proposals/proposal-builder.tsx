"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { toDateInput } from "@/lib/utils";
import { ProposalForm } from "./proposal-form";
import { A4Preview } from "./a4-preview";
import type { ProposalFormData, ContentBlock, SelectedServices } from "@/types";

interface ServiceFromAPI {
  id: string;
  name: string;
  description: string | null;
  deliverables: string[];
}

interface SessionResponse {
  user?: {
    orgName?: string;
  };
}

const sessionFetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

interface InitialProposalItem {
  id?: string;
  serviceId: string | null;
  serviceName: string;
  description?: string | null;
  customName?: string | null;
  customDescription?: string | null;
  hours: number | string;
  hourlyRate: number | string;
  selectedDeliverables: string[];
}

export interface InitialProposal {
  id: string;
  companyName?: string | null;
  clientName: string;
  projectName: string;
  date: string;
  observations?: string | null;
  headerImageUrl?: string | null;
  footerImageUrl?: string | null;
  contentBlocks?: ContentBlock[] | null;
  items: InitialProposalItem[];
}

interface ProposalBuilderProps {
  initialProposal?: InitialProposal;
}

export function ProposalBuilder({ initialProposal }: ProposalBuilderProps = {}) {
  const router = useRouter();
  const { toast } = useToast();

  // Get org name from session
  const { data: session } = useSWR<SessionResponse>(
    "/api/auth/session",
    sessionFetcher
  );
  const orgName = session?.user?.orgName ?? "Olive Labs";

  // Get services for name resolution
  const { data: allServices } = useSWR<ServiceFromAPI[]>(
    "/api/servicos",
    sessionFetcher
  );

  // Get org defaults for header/footer
  const { data: orgConfig } = useSWR<{ data: { defaultHeaderImage?: string | null; defaultFooterImage?: string | null } }>(
    "/api/configuracoes",
    sessionFetcher
  );

  // Form state — hydrated from initialProposal when editing
  const [formData, setFormData] = useState<ProposalFormData>(() => ({
    companyName: initialProposal?.companyName ?? "",
    clientName: initialProposal?.clientName ?? "",
    projectName: initialProposal?.projectName ?? "",
    date: initialProposal ? toDateInput(new Date(initialProposal.date)) : toDateInput(new Date()),
    observations: initialProposal?.observations ?? "",
  }));

  const [selectedServices, setSelectedServices] = useState<SelectedServices>(() => {
    if (!initialProposal) return {};
    const map: SelectedServices = {};
    for (const item of initialProposal.items) {
      const key = item.serviceId || `custom-${item.id ?? item.serviceName}`;
      map[key] = {
        id: item.id,
        serviceId: item.serviceId || "",
        customName: item.customName || "",
        customDescription: item.customDescription || "",
        hours: Number(item.hours) || 0,
        hourlyRate: Number(item.hourlyRate) || 0,
        selectedDeliverables: item.selectedDeliverables || [],
      };
    }
    return map;
  });
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(
    initialProposal?.headerImageUrl ?? null
  );
  const [footerImageUrl, setFooterImageUrl] = useState<string | null>(
    initialProposal?.footerImageUrl ?? null
  );
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(
    initialProposal?.contentBlocks ?? []
  );
  const [defaultsLoaded, setDefaultsLoaded] = useState(!!initialProposal);

  // Load org defaults for header/footer when config is available
  useEffect(() => {
    if (orgConfig?.data && !defaultsLoaded) {
      if (orgConfig.data.defaultHeaderImage && !headerImageUrl) {
        setHeaderImageUrl(orgConfig.data.defaultHeaderImage);
      }
      if (orgConfig.data.defaultFooterImage && !footerImageUrl) {
        setFooterImageUrl(orgConfig.data.defaultFooterImage);
      }
      setDefaultsLoaded(true);
    }
  }, [orgConfig, defaultsLoaded, headerImageUrl, footerImageUrl]);
  const [errors, setErrors] =
    useState<Partial<Record<keyof ProposalFormData | "services", string>>>({});
  const [loading, setLoading] = useState(false);

  // Auto-save state
  const [savedProposalId, setSavedProposalId] = useState<string | null>(
    initialProposal?.id ?? null
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveRef = useRef<string>("");

  // Handle form field changes
  const handleFormChange = useCallback(
    (data: Partial<ProposalFormData>) => {
      setFormData((prev) => ({ ...prev, ...data }));
      // Clear related errors
      const keys = Object.keys(data) as (keyof ProposalFormData)[];
      setErrors((prev) => {
        const next = { ...prev };
        keys.forEach((k) => delete next[k]);
        return next;
      });
    },
    []
  );

  // Handle services changes
  const handleServicesChange = useCallback((services: SelectedServices) => {
    setSelectedServices(services);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.services;
      return next;
    });
  }, []);

  // Image handlers
  const handleHeaderImageChange = useCallback((url: string | null) => {
    setHeaderImageUrl(url);
  }, []);

  const handleFooterImageChange = useCallback((url: string | null) => {
    setFooterImageUrl(url);
  }, []);

  // Save header/footer as org default
  const handleSaveAsDefault = useCallback(
    async (type: "header" | "footer") => {
      const url = type === "header" ? headerImageUrl : footerImageUrl;
      const field = type === "header" ? "defaultHeaderImage" : "defaultFooterImage";
      try {
        const res = await fetch("/api/configuracoes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: url }),
        });
        if (res.ok) {
          toast(
            `Imagem de ${type === "header" ? "cabecalho" : "rodape"} salva como padrao`,
            "success"
          );
        } else if (res.status === 403) {
          toast(
            "Apenas administradores da organizacao podem definir imagens padrao.",
            "error"
          );
        } else {
          toast("Erro ao salvar padrao", "error");
        }
      } catch (e) {
        console.error("[proposal-builder] save-default failed:", e);
        toast("Erro ao salvar padrao", "error");
      }
    },
    [headerImageUrl, footerImageUrl, toast]
  );

  // Build preview services
  const servicesList = Array.isArray(allServices) ? allServices : [];
  const previewServices = useMemo(() => {
    const servicesMap = new Map(
      servicesList.map((s) => [s.id, s])
    );

    return Object.values(selectedServices).map((sel) => {
      const base = servicesMap.get(sel.serviceId);
      return {
        name: sel.customName || base?.name || "Servico",
        description:
          sel.customDescription || base?.description || "",
        hours: sel.hours,
        hourlyRate: sel.hourlyRate,
        deliverables: sel.selectedDeliverables,
      };
    });
  }, [selectedServices, servicesList]);

  // Validate
  const validate = useCallback((): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = "Nome da empresa e obrigatorio";
    }
    if (!formData.clientName.trim()) {
      newErrors.clientName = "Nome do cliente e obrigatorio";
    }
    if (!formData.projectName.trim()) {
      newErrors.projectName = "Nome do projeto e obrigatorio";
    }
    if (!formData.date) {
      newErrors.date = "Data e obrigatoria";
    }
    if (Object.keys(selectedServices).length === 0) {
      newErrors.services = "Selecione ao menos um servico";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, selectedServices]);

  // ── Auto-save ──────────────────────────────────────────────────────────────

  const buildPayload = useCallback(() => {
    const items = Object.values(selectedServices).map((sel) => {
      const base = servicesList.find((s) => s.id === sel.serviceId);
      return {
        id: sel.id, // preserved for PUT diff; harmless on POST
        serviceId: sel.serviceId,
        serviceName: base?.name ?? "Servico",
        description: base?.description ?? undefined,
        customName: sel.customName || undefined,
        customDescription: sel.customDescription || undefined,
        hours: sel.hours,
        hourlyRate: sel.hourlyRate,
        selectedDeliverables: sel.selectedDeliverables,
      };
    });

    return {
      companyName: formData.companyName.trim() || undefined,
      clientName: formData.clientName.trim() || "Rascunho",
      projectName: formData.projectName.trim() || "Sem titulo",
      date: formData.date,
      observations: formData.observations.trim() || undefined,
      clientId: formData.clientId || undefined,
      headerImageUrl: headerImageUrl || undefined,
      footerImageUrl: footerImageUrl || undefined,
      contentBlocks: contentBlocks.length > 0 ? contentBlocks : undefined,
      items,
    };
  }, [formData, selectedServices, servicesList, headerImageUrl, footerImageUrl, contentBlocks]);

  const autoSave = useCallback(async () => {
    const payload = buildPayload();
    const payloadStr = JSON.stringify(payload);

    // Skip if nothing changed
    if (payloadStr === lastSaveRef.current) return;

    // Don't attempt the first POST until the form has the minimum it needs.
    // This keeps the autosave indicator quiet (no "Erro ao salvar") while the
    // user is still filling in the first required fields.
    if (!savedProposalId) {
      const hasRequired =
        formData.companyName.trim().length > 0 &&
        formData.clientName.trim().length > 0 &&
        formData.projectName.trim().length > 0 &&
        !!formData.date &&
        Object.keys(selectedServices).length > 0;
      if (!hasRequired) {
        setSaveStatus("idle");
        return;
      }
    }

    setSaveStatus("saving");
    try {
      if (savedProposalId) {
        // PUT - update existing
        const res = await fetch(`/api/propostas/${savedProposalId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: payloadStr,
        });
        if (!res.ok) throw new Error("Save failed");
      } else {
        const res = await fetch("/api/propostas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payloadStr,
        });
        if (!res.ok) throw new Error("Save failed");
        const data = await res.json();
        setSavedProposalId(data.id);
      }
      lastSaveRef.current = payloadStr;
      setSaveStatus("saved");
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("[proposal-builder] auto-save failed:", err);
      setSaveStatus("error");
    }
  }, [buildPayload, savedProposalId, selectedServices, formData]);

  // Mark unsaved on any change
  useEffect(() => {
    setHasUnsavedChanges(true);
    setSaveStatus("idle");
  }, [formData, selectedServices, headerImageUrl, footerImageUrl, contentBlocks]);

  // Auto-save timer: debounced 8 seconds after the last change
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      autoSave();
    }, 8000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [hasUnsavedChanges, autoSave]);

  // ── Submit (final) ──
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const payload = buildPayload();
    setLoading(true);
    try {
      let res;
      if (savedProposalId) {
        res = await fetch(`/api/propostas/${savedProposalId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/propostas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erro ao salvar proposta");
      }

      const proposal = await res.json();
      toast("Proposta salva com sucesso!", "success");
      router.push(`/propostas/${proposal.id ?? savedProposalId}`);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Erro inesperado",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [
    validate,
    buildPayload,
    savedProposalId,
    toast,
    router,
  ]);

  const isEditing = !!initialProposal;

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-120px)]">
      {/* Top bar: title + status + primary action */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[#E2E3E4]">
            {isEditing ? "Editar proposta" : "Nova proposta"}
          </h1>
          <div className="flex items-center gap-2 text-[12px]">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1.5 text-[#8B8F96]">
                <div className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-[#94C020] border-t-transparent" />
                Salvando...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-[#4ADE80]">
                <Icon name="check" size={12} />
                Salvo
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-[#F87171]">
                <Icon name="alert" size={12} />
                Erro ao salvar — tente de novo
              </span>
            )}
            {saveStatus === "idle" && hasUnsavedChanges && (
              <span className="text-[#6B6F76]">Alteracoes nao salvas</span>
            )}
          </div>
        </div>
        <button
          onClick={() => autoSave()}
          disabled={!hasUnsavedChanges || saveStatus === "saving"}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-[#8B8F96] transition-colors hover:bg-white/[0.04] hover:text-[#E2E3E4] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon name="check" size={12} />
          Salvar agora
        </button>
      </div>

      {/* Mobile preview toggle */}
      <details className="lg:hidden rounded-lg glass-card overflow-hidden">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-[#E2E3E4]">
          <span className="flex items-center gap-2">
            <Icon name="eye" size={14} />
            Pre-visualizacao A4
          </span>
          <Icon name="chevron" size={14} />
        </summary>
        <div className="h-[60vh]">
          <A4Preview
            clientName={formData.clientName}
            projectName={formData.projectName}
            date={formData.date}
            services={previewServices}
            orgName={orgName}
            headerImageUrl={headerImageUrl ?? undefined}
            footerImageUrl={footerImageUrl ?? undefined}
            contentBlocks={contentBlocks}
          />
        </div>
      </details>

      <div className="grid grid-cols-1 gap-6 flex-1 min-h-0 lg:grid-cols-[460px_1fr]">
        {/* Left panel: Form */}
        <div className="overflow-y-auto rounded-lg glass-card p-6">
          <ProposalForm
            formData={formData}
            selectedServices={selectedServices}
            onFormChange={handleFormChange}
            onServicesChange={handleServicesChange}
            onSubmit={handleSubmit}
            errors={errors}
            loading={loading}
            headerImageUrl={headerImageUrl ?? undefined}
            onHeaderImageChange={handleHeaderImageChange}
            footerImageUrl={footerImageUrl ?? undefined}
            onFooterImageChange={handleFooterImageChange}
            contentBlocks={contentBlocks}
            onBlocksChange={setContentBlocks}
            previewServices={previewServices}
            onSaveAsDefault={handleSaveAsDefault}
            isEditing={isEditing}
          />
        </div>

        {/* Right panel: A4 Preview (desktop only — mobile uses <details> above) */}
        <div className="hidden lg:block min-w-0 rounded-2xl glass-card overflow-hidden">
          <A4Preview
            clientName={formData.clientName}
            projectName={formData.projectName}
            date={formData.date}
            services={previewServices}
            orgName={orgName}
            headerImageUrl={headerImageUrl ?? undefined}
            footerImageUrl={footerImageUrl ?? undefined}
            contentBlocks={contentBlocks}
          />
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
