import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Optional eyebrow text shown above the title (e.g. count, status). */
  eyebrow?: string;
  /** Page-level secondary heading. The Shell already renders the routing-level h1. */
  title: string;
  /** Short context line shown below the title. Wraps freely. */
  description?: string;
  /** Right-side action slot — primary CTA, button group, etc. */
  actions?: ReactNode;
  /** Render the bottom divider. Default true. Set false when the next section
   *  already has its own top border to avoid a double-border effect. */
  bordered?: boolean;
  className?: string;
}

/**
 * Standard page header for dashboard/admin routes.
 * Provides a uniform title row that can carry a description and right-aligned
 * actions, and stacks gracefully on mobile.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  bordered = true,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        bordered ? "border-b border-white/[0.04] pb-5" : "pb-1",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94C020] mb-1.5">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-bold text-[#E2E3E4] sm:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-[#8B8F96]">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
