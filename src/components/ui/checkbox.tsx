"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex cursor-pointer items-center gap-2.5 select-none",
          props.disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className="peer sr-only"
            {...props}
          />
          <span
            className={cn(
              "absolute inset-0 rounded-sm border-2 border-white/[0.15] bg-transparent transition-colors",
              "peer-checked:border-[#94C020] peer-checked:bg-[#94C020]",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-[#94C020]/30 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-[#101012]"
            )}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative z-10 opacity-0 peer-checked:opacity-100 transition-opacity"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        {label && (
          <span className="text-sm text-[#E2E3E4]">{label}</span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
