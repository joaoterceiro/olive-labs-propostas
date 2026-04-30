"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-lg glass-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F87171]/10 text-[#F87171]">
          <Icon name="alert" size={24} />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-[#E2E3E4]">
          Erro no painel administrativo
        </h2>
        <p className="mb-6 text-sm text-[#8B8F96]">
          {error.message || "Encontramos um erro inesperado."}
          {error.digest && (
            <span className="mt-2 block text-[10px] text-[#6B6F76]">
              Codigo: {error.digest}
            </span>
          )}
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="ghost" onClick={() => window.location.assign("/dashboard")}>
            Voltar
          </Button>
          <Button variant="primary" onClick={() => reset()}>
            Tentar de novo
          </Button>
        </div>
      </div>
    </div>
  );
}
