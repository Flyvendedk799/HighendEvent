import type { InputHTMLAttributes } from "react";
import { cx } from "./utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cx(
        "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
