"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { ImageUpload } from "@/components/ui/image-upload";
import { ServiceSelector } from "./service-selector";
import { BlockEditor } from "./block-editor";
import type { ProposalFormData, ContentBlock, SelectedServices } from "@/types";

interface PreviewService {
  name: string;
  description: string;
  hours: number;
  hourlyRate: number;
  deliverables: string[];
}

interface ProposalFormProps {
  formData: ProposalFormData;
  selectedServices: SelectedServices;
  onFormChange: (data: Partial<ProposalFormData>) => void;
  onServicesChange: (services: SelectedServices) => void;
  onSubmit: () => void;
  errors: Partial<Record<keyof ProposalFormData | "services", string>>;
  loading: boolean;
  headerImageUrl?: string;
  onHeaderImageChange: (url: string | null) => void;
  footerImageUrl?: string;
  onFooterImageChange: (url: string | null) => void;
  contentBlocks: ContentBlock[];
  onBlocksChange: (blocks: ContentBlock[]) => void;
  previewServices: PreviewService[];
  onSaveAsDefault: (type: "header" | "footer") => void;
  /** When true, submit button reads "Salvar alteracoes" */
  isEditing?: boolean;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4A4B50] mt-6 mb-3">
      {children}
    </h3>
  );
}

export function ProposalForm({
  formData,
  selectedServices,
  onFormChange,
  onServicesChange,
  onSubmit,
  errors,
  loading,
  headerImageUrl,
  onHeaderImageChange,
  footerImageUrl,
  onFooterImageChange,
  contentBlocks,
  onBlocksChange,
  previewServices,
  onSaveAsDefault,
  isEditing,
}: ProposalFormProps) {
  const [headerOpen, setHeaderOpen] = useState(false);
  const [footerOpen, setFooterOpen] = useState(false);

  const errorCount = Object.keys(errors).length;

  return (
    <div className="flex flex-col gap-2 h-full pb-20">
      {/* Global error summary */}
      {errorCount > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-[#F87171]/30 bg-[#F87171]/5 px-3 py-2">
          <Icon name="alert" size={14} className="text-[#F87171] mt-0.5" />
          <p className="text-xs text-[#F87171]">
            Corrija os campos destacados antes de continuar.
          </p>
        </div>
      )}

      {/* Client & project info */}
      <SectionHeader>Informacoes</SectionHeader>
      <div className="space-y-4">
        <Input
          label="Nome da empresa"
          name="companyName"
          placeholder="Ex: Empresa ABC Ltda"
          value={formData.companyName}
          onChange={(e) => onFormChange({ companyName: e.target.value })}
          error={errors.companyName}
          required
          maxLength={240}
          showCounter
          autoComplete="organization"
        />

        <Input
          label="Nome do cliente"
          name="clientName"
          placeholder="Ex: Joao da Silva"
          value={formData.clientName}
          onChange={(e) => onFormChange({ clientName: e.target.value })}
          error={errors.clientName}
          required
          maxLength={240}
          autoComplete="name"
        />

        <Input
          label="Nome do projeto"
          name="projectName"
          placeholder="Ex: Redesign do site institucional"
          value={formData.projectName}
          onChange={(e) => onFormChange({ projectName: e.target.value })}
          error={errors.projectName}
          required
          maxLength={240}
        />

        <Input
          label="Data"
          name="date"
          type="date"
          value={formData.date}
          onChange={(e) => onFormChange({ date: e.target.value })}
          error={errors.date}
          required
          lang="pt-BR"
        />
      </div>

      {/* Services */}
      <SectionHeader>Servicos</SectionHeader>
      <div className="space-y-3">
        {errors.services && (
          <p className="text-xs text-[#F87171] flex items-center gap-1.5">
            <Icon name="alert" size={12} /> {errors.services}
          </p>
        )}
        <ServiceSelector
          selectedServices={selectedServices}
          onChange={onServicesChange}
        />
      </div>

      {/* Block Editor */}
      <SectionHeader>Conteudo da proposta</SectionHeader>
      <BlockEditor
        blocks={contentBlocks}
        onBlocksChange={onBlocksChange}
        clientName={formData.clientName}
        projectName={formData.projectName}
        date={formData.date}
        services={previewServices}
      />

      {/* Header/Footer Image Sections */}
      <SectionHeader>Documento</SectionHeader>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setHeaderOpen((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-semibold text-[#E2E3E4]"
        >
          <span className="flex items-center gap-2">
            <Icon name="image" size={16} className="text-[#8B8F96]" />
            Imagem do cabecalho
          </span>
          <Icon
            name="chevron"
            size={16}
            className={`text-[#6B6F76] transition-transform ${headerOpen ? "rotate-180" : ""}`}
          />
        </button>
        {headerOpen && (
          <div className="space-y-2">
            <ImageUpload
              value={headerImageUrl}
              onChange={onHeaderImageChange}
              label="Imagem do topo do documento"
            />
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#6B6F76]">
                Ideal: <strong>794 x 140 px</strong> (proporcao ~5.7:1)
              </p>
              {headerImageUrl && (
                <button
                  type="button"
                  onClick={() => onSaveAsDefault("header")}
                  className="text-[10px] font-medium text-[#94C020] hover:text-[#7DA61A] transition-colors"
                >
                  Salvar como padrao
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Image Section */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setFooterOpen((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-semibold text-[#E2E3E4]"
        >
          <span className="flex items-center gap-2">
            <Icon name="image" size={16} className="text-[#8B8F96]" />
            Imagem do rodape
          </span>
          <Icon
            name="chevron"
            size={16}
            className={`text-[#6B6F76] transition-transform ${footerOpen ? "rotate-180" : ""}`}
          />
        </button>
        {footerOpen && (
          <div className="space-y-2">
            <ImageUpload
              value={footerImageUrl}
              onChange={onFooterImageChange}
              label="Imagem da parte inferior do documento"
            />
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#6B6F76]">
                Ideal: <strong>794 x 100 px</strong> (proporcao ~8:1)
              </p>
              {footerImageUrl && (
                <button
                  type="button"
                  onClick={() => onSaveAsDefault("footer")}
                  className="text-[10px] font-medium text-[#94C020] hover:text-[#7DA61A] transition-colors"
                >
                  Salvar como padrao
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      <div className="sticky bottom-0 -mx-4 px-4 pt-4 pb-3 bg-gradient-to-t from-[#151517] via-[#151517] to-transparent">
        <Button
          className="w-full"
          size="lg"
          loading={loading}
          onClick={onSubmit}
        >
          <Icon name="zap" size={18} />
          {isEditing ? "Salvar alteracoes" : "Gerar proposta"}
        </Button>
      </div>
    </div>
  );
}
