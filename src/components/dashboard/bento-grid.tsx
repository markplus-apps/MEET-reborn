"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4", className)}>
      {children}
    </div>
  );
}

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
  delay?: number;
}

export function BentoCard({ children, className, colSpan = 1, rowSpan = 1, delay = 0 }: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={cn(
        "overflow-hidden rounded-2xl border border-zinc-200/60 bg-white/70 p-4 md:p-5 backdrop-blur-xl dark:border-zinc-700/60 dark:bg-zinc-900/70",
        colSpan === 2 && "col-span-2",
        colSpan === 3 && "col-span-2 lg:col-span-3",
        colSpan === 4 && "col-span-2 lg:col-span-4",
        rowSpan === 2 && "row-span-2",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
