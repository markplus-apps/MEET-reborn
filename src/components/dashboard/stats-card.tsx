"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  gradient?: string;
  delay?: number;
}

export function StatsCard({ title, value, icon: Icon, description, gradient = "from-violet-500 to-purple-500", delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border border-zinc-200/60 bg-white/70 p-4 md:p-5 backdrop-blur-xl transition-shadow duration-300 hover:shadow-xl hover:shadow-violet-500/5 dark:border-zinc-700/60 dark:bg-zinc-900/70"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
          <p className="text-[10px] md:text-xs font-medium uppercase tracking-wider text-zinc-400 truncate">{title}</p>
          <p className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{value}</p>
          {description && (
            <p className="text-[10px] md:text-xs text-zinc-500 truncate">{description}</p>
          )}
        </div>
        <div className={cn("flex h-9 w-9 md:h-11 md:w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg", gradient)}>
          <Icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
        </div>
      </div>
      <div className={cn("absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br opacity-10 blur-2xl transition-opacity group-hover:opacity-20", gradient)} />
    </motion.div>
  );
}
