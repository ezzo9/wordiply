import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "navy" | "navyOutline";
export type ButtonSize = "md" | "lg";

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "px-3.5 py-2 text-sm sm:px-4 sm:py-2.5",
  lg: "px-6 py-3.5 text-base sm:px-7 sm:py-4 sm:text-lg",
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500",
  secondary: "bg-accent-500 text-white hover:bg-accent-600 focus-visible:ring-accent-400",
  outline: "border-2 border-white/40 text-white hover:bg-white/10 focus-visible:ring-white/50",
  ghost:
    "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 focus-visible:ring-stone-400",
  // The results screen's own two-tone palette (pink + navy, no teal/amber).
  navy: "bg-[#33397d] text-white hover:bg-[#282d63] focus-visible:ring-[#33397d]",
  navyOutline:
    "border-2 border-[#33397d] text-[#33397d] hover:bg-[#33397d]/10 focus-visible:ring-[#33397d] dark:border-white dark:text-white dark:hover:bg-white/10",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = ""
): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none";
  return `${base} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}
