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
}: ProposalFormProps) {
  const [headerOpen, setHeaderOpen] = useState(false);
  const [footerOpen, setFooterOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Client & project info */}
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#4A4B50] mb-2">Informações</h3>
      <div className="space-y-6">
        <Input
          label="Nome do cliente *"
          name="clientName"
          placeholder="Ex: Empresa ABC Ltda"
          value={formData.clientName}
          onChange={(e) => onFormChange({ clientName: e.target.value })}
          error={errors.clientName}
        />

        <Input
          label="Nome do projeto *"
          name="projectName"
          placeholder="Ex: Redesign do site institucional"
          value={formData.projectName}
          onChange={(e) => onFormChange({ projectName: e.target.value })}
          error={errors.projectName}
        />

        <Input
          label="Data *"
          name="date"
          type="date"
          value={formData.date}
          onChange={(e) => onFormChange({ date: e.target.value })}
          error={errors.date}
        />
      </div>

      {/* Services */}
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#4A4B50] mb-2">Serviços</h3>
      <div className="space-y-3 flex-1">
        {errors.services && (
          <p className="text-xs text-danger">{errors.services}</p>
        )}
        <ServiceSelector
          selectedServices={selectedServices}
          onChange={onServicesChange}
        />
      </div>

      {/* Block Editor */}
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#4A4B50] mb-2">Conteúdo da Proposta</h3>
      <BlockEditor
        blocks={contentBlocks}
        onBlocksChange={onBlocksChange}
        clientName={formData.clientName}
        projectName={formData.projectName}
        date={formData.date}
        services={previewServices}
      />

      {/* Header/Footer Image Sections */}
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#4A4B50] mb-2">Documento</h3>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setHeaderOpen((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-semibold text-[#E2E3E4]"
        >
          <span className="flex items-center gap-2">
            <Icon name="image" size={16} className="text-[#8B8F96]" />
            Imagem do Cabecalho
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
            Imagem do Rodape
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
      <div className="sticky bottom-0 bg-[#151517] pt-4 pb-2 border-t border-white/[0.06]">
        <Button
          className="w-full"
          size="lg"
          loading={loading}
          onClick={onSubmit}
        >
          <Icon name="zap" size={18} />
          Gerar Proposta
        </Button>
      </div>
    </div>
  );
}
