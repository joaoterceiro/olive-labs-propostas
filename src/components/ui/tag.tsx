"use client";

import { cn } from "@/lib/utils";
import { Icon } from "./icon";

interface DTagProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function DTag({ active = false, onClick, children, className }: DTagProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
        active
          ? "bg-[#94C020] text-white"
          : "bg-[#94C020]/[0.08] text-[#94C020] border border-[#94C020]/[0.15] hover:bg-[#94C020]/[0.14] hover:text-[#A4D030]",
        className
      )}
    >
      {active && <Icon name="check" size={14} />}
      {children}
    </button>
  );
}
