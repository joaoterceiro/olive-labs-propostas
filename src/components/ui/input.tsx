"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, disabled, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[#6B6F76]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            "h-10 w-full rounded-md border glass-input px-3 text-sm text-[#E2E3E4] placeholder:text-[#6B6F76] transition-colors",
            "focus:outline-none",
            "disabled:cursor-not-allowed disabled:bg-white/[0.02] disabled:text-[#6B6F76]",
            error
              ? "border-[#F87171] focus:border-[#F87171] focus:!shadow-[0_0_0_2px_rgba(248,113,113,0.15)]"
              : "border-white/[0.06] hover:border-white/[0.1]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-[#F87171]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
