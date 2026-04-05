"use client";

import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#94C020]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101012] disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-[#94C020] text-white hover:bg-[#7DA61A] active:bg-[#7DA61A] shadow-[0_0_20px_rgba(148,192,32,0.25)]",
        secondary:
          "bg-white/[0.06] text-[#E2E3E4] hover:bg-white/[0.1] border border-white/[0.06]",
        ghost: "bg-transparent text-[#8B8F96] hover:text-[#E2E3E4] hover:bg-white/[0.06]",
        danger: "bg-[#F87171]/10 text-[#F87171] hover:bg-[#F87171]/20 border border-[#F87171]/20",
        outline:
          "border border-white/[0.1] bg-transparent text-[#E2E3E4] hover:bg-white/[0.04]",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md",
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <Icon name="loader" size={16} className="animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
