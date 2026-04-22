"use client";

import { useToast, type ToastVariant } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const variantStyles: Record<ToastVariant, string> = {
  success: "glass-strong border-[#4ADE80]/20 text-[#4ADE80] shadow-[inset_3px_0_0_#4ADE80]",
  error: "glass-strong border-[#F87171]/25 text-[#F87171] shadow-[inset_3px_0_0_#F87171]",
  warning: "glass-strong border-[#FBBF24]/20 text-[#FBBF24] shadow-[inset_3px_0_0_#FBBF24]",
  info: "glass-strong border-[#60A5FA]/20 text-[#60A5FA] shadow-[inset_3px_0_0_#60A5FA]",
};

function VariantIcon({ variant }: { variant: ToastVariant }) {
  const size = 18;
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (variant === "success") {
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }

  if (variant === "error") {
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }

  if (variant === "warning") {
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }

  // info
  return (
    <svg {...common} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3"
      role="region"
      aria-label="Notificacoes"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.variant === "error" ? "alert" : "status"}
          aria-live={t.variant === "error" ? "assertive" : "polite"}
          aria-atomic="true"
          className={cn(
            "flex items-center gap-3 rounded-lg border px-4 py-3 animate-fade-up min-w-[280px] max-w-[400px]",
            variantStyles[t.variant]
          )}
        >
          <VariantIcon variant={t.variant} />
          <span className="flex-1 text-sm font-medium">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="ml-2 text-[#6B6F76] opacity-60 transition-opacity hover:opacity-100"
            aria-label="Fechar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
