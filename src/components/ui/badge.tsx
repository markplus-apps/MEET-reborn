import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        {
          "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300": variant === "default",
          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300": variant === "secondary",
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300": variant === "success",
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300": variant === "warning",
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300": variant === "destructive",
          "border border-zinc-200 bg-transparent text-zinc-700 dark:border-zinc-700 dark:text-zinc-300": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}
