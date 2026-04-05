import { cn } from "@/lib/utils";

interface CardProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Card({ header, footer, children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg glass-card",
        className
      )}
    >
      {header && (
        <div className="border-b border-white/[0.06] px-6 py-4">{header}</div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="border-t border-white/[0.06] px-6 py-4">{footer}</div>
      )}
    </div>
  );
}
