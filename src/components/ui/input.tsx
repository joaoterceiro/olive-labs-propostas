"use client";

import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Show an indicator that this input must be filled */
  required?: boolean;
  /** Show a char counter next to the label when the value approaches maxLength */
  showCounter?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      id,
      disabled,
      required,
      showCounter,
      maxLength,
      value,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;
    const [focused, setFocused] = useState(false);
    const valueLength = typeof value === "string" ? value.length : 0;

    // Strip a trailing "*" in the label since we now render a styled asterisk
    const cleanLabel =
      label && required ? label.replace(/\s*\*\s*$/, "") : label;

    const showCount =
      showCounter && maxLength !== undefined && (focused || valueLength > 0);

    return (
      <div className="flex flex-col gap-1.5">
        {cleanLabel && (
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor={inputId}
              className="text-xs font-medium text-[#6B6F76]"
            >
              {cleanLabel}
              {required && (
                <span className="ml-0.5 text-[#F87171]" aria-hidden="true">
                  *
                </span>
              )}
            </label>
            {showCount && (
              <span
                className={cn(
                  "text-[10px] tabular-nums",
                  valueLength >= (maxLength ?? 0)
                    ? "text-[#F87171]"
                    : valueLength >= (maxLength ?? 0) * 0.8
                    ? "text-[#FBBF24]"
                    : "text-[#6B6F76]"
                )}
              >
                {valueLength}/{maxLength}
              </span>
            )}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          aria-required={required || undefined}
          required={required}
          maxLength={maxLength}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
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
        {error && <p className="text-xs text-[#F87171]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
