import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormCardProps {
  /** Section title in uppercase tracking, mirrors the proposal-form pattern. */
  title: string;
  /** Optional right-aligned hint (e.g. "2 itens", "opcional"). */
  hint?: ReactNode;
  /** Optional helper line below the title. */
  description?: string;
  /** Optional right-aligned actions in the header (compact buttons). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Card wrapper for form/page sections.
 * Replaces the duplicated FormSection/glass-card patterns scattered across
 * the dashboard and admin pages with a single source of visual hierarchy.
 */
export function FormCard({
  title,
  hint,
  description,
  actions,
  children,
  className,
}: FormCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-white/[0.04] bg-white/[0.015] p-5",
        className
      )}
    >
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8B8F96]">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-[12px] text-[#8B8F96]">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px] text-[#8B8F96]">
          {hint}
          {actions}
        </div>
      </header>
      {children}
    </section>
  );
}
