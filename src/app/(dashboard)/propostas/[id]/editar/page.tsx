"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { ProposalBuilder, type InitialProposal } from "@/components/proposals/proposal-builder";
import { SkeletonCard } from "@/components/ui/skeleton";

interface ProposalItem {
  serviceId: string | null;
  serviceName: string;
  description: string | null;
  customName: string | null;
  customDescription: string | null;
  hours: string | number;
  hourlyRate: string | number;
  selectedDeliverables: string[];
}

interface ProposalResponse {
  id: string;
  companyName: string | null;
  clientName: string;
  projectName: string;
  date: string;
  observations: string | null;
  headerImageUrl: string | null;
  footerImageUrl: string | null;
  contentBlocks: unknown;
  items: ProposalItem[];
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

export default function EditarPropostaPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useSWR<ProposalResponse>(
    `/api/propostas/${id}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <SkeletonCard />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-sm text-[#F87171]">
        Nao foi possivel carregar a proposta.
      </div>
    );
  }

  const initial: InitialProposal = {
    id: data.id,
    companyName: data.companyName,
    clientName: data.clientName,
    projectName: data.projectName,
    date: data.date,
    observations: data.observations,
    headerImageUrl: data.headerImageUrl,
    footerImageUrl: data.footerImageUrl,
    contentBlocks: Array.isArray(data.contentBlocks)
      ? (data.contentBlocks as InitialProposal["contentBlocks"])
      : null,
    items: data.items,
  };

  return <ProposalBuilder initialProposal={initial} />;
}
