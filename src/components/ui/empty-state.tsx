import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="mb-6">
        {icon ?? (
          <img
            src="/illustrations/empty-state.svg"
            alt=""
            className="h-40 w-40 opacity-80"
          />
        )}
      </div>
      <h3 className="mb-1 text-base font-semibold text-[#E2E3E4]">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-[#6B6F76]">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
