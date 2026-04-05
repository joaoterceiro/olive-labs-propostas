import { cn } from "@/lib/utils";

const badgeVariants = {
  draft: {
    bg: "bg-white/[0.06]",
    text: "text-[#8B8F96]",
    dot: "bg-[#6B6F76]",
  },
  sent: {
    bg: "bg-[#60A5FA]/10",
    text: "text-[#60A5FA]",
    dot: "bg-[#60A5FA]",
  },
  approved: {
    bg: "bg-[#4ADE80]/10",
    text: "text-[#4ADE80]",
    dot: "bg-[#4ADE80]",
  },
  rejected: {
    bg: "bg-[#F87171]/10",
    text: "text-[#F87171]",
    dot: "bg-[#F87171]",
  },
  expired: {
    bg: "bg-[#FBBF24]/10",
    text: "text-[#FBBF24]",
    dot: "bg-[#FBBF24]",
  },
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "draft", children, className }: BadgeProps) {
  const styles = badgeVariants[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-xs font-medium",
        styles.bg,
        styles.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
      {children}
    </span>
  );
}
