"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, disabled, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-medium text-[#8B8F96]"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            "w-full appearance-none rounded-md border bg-white/[0.04] px-4 py-3 pr-10 text-sm text-[#E2E3E4] transition-colors [color-scheme:dark]",
            "placeholder:text-[#8B8F96]",
            "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-opacity%3D%220.4%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat",
            "focus:outline-none focus:border-[#94C020] focus:shadow-[0_0_0_2px_rgba(148,192,32,0.15)]",
            error
              ? "border-[#F87171] focus:border-[#F87171] focus:!shadow-[0_0_0_2px_rgba(248,113,113,0.15)]"
              : "border-white/[0.06] hover:border-white/[0.1]",
            disabled && "cursor-not-allowed opacity-50 bg-white/[0.02] text-[#8B8F96]",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-xs text-[#F87171]">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
