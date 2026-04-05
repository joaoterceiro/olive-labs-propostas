"use client";

import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import { A4Preview } from "@/components/proposals/a4-preview";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SkeletonCard } from "@/components/ui/skeleton";
import type { ProposalWithItems, ContentBlock } from "@/types";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });

export default function ProposalPdfPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const { data: proposal, isLoading } = useSWR<ProposalWithItems>(
    `/api/propostas/${id}`,
    fetcher
  );

  if (isLoading || !proposal) {
    return (
      <div className="space-y-4">
        <SkeletonCard className="h-12" />
        <SkeletonCard className="h-[600px]" />
      </div>
    );
  }

  // Map proposal items to A4Preview service format
  const services = (proposal.items ?? []).map((item) => ({
    name: item.customName || item.serviceName,
    description: item.description ?? item.customDescription ?? "",
    hours: Number(item.hours),
    hourlyRate: Number(item.hourlyRate),
    deliverables: item.selectedDeliverables ?? [],
  }));

  const dateStr = new Date(proposal.date as string | Date)
    .toISOString()
    .split("T")[0];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/propostas/${id}`)}
        >
          <Icon name="arrow" size={16} className="rotate-180" />
          Voltar
        </Button>

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.open(`/api/propostas/${id}/pdf`, "_blank")}
          >
            <Icon name="pdf" size={16} />
            Download PDF
          </Button>
        </div>
      </div>

      {/* A4 Preview */}
      <div className="rounded-lg border border-white/[0.06] bg-[#151517] overflow-hidden" style={{ minHeight: 600 }}>
        <A4Preview
          clientName={proposal.clientName}
          projectName={proposal.projectName}
          date={dateStr}
          services={services}
          orgName=""
          headerImageUrl={proposal.headerImageUrl ?? undefined}
          footerImageUrl={proposal.footerImageUrl ?? undefined}
          contentBlocks={(proposal.contentBlocks as unknown as ContentBlock[]) ?? undefined}
        />
      </div>
    </div>
  );
}
