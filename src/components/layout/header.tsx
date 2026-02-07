"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon } from "lucide-react";
import Image from "next/image";
import { formatWIB } from "@/lib/timezone";
import { useTheme } from "@/providers/theme-provider";

export function Header() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/60 bg-white/70 backdrop-blur-xl dark:border-zinc-700/60 dark:bg-zinc-900/70">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3 md:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-md dark:bg-zinc-800">
            <Image src="/logo.png" alt="MCorp" width={24} height={24} className="object-contain" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">MEET</h1>
            <p className="text-[10px] font-medium text-zinc-400">MarkPlus</p>
          </div>
        </div>
        <div className="hidden md:block">
          {now && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {formatWIB(now, "EEEE, dd MMMM yyyy")} • <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatWIB(now, "HH:mm")} WIB</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/60 bg-white/80 text-zinc-500 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {session?.user && (
            <>
              <Badge variant={(session.user as { role: string }).role === "EMPLOYEE" ? "secondary" : "default"}>
                {(session.user as { role: string }).role}
              </Badge>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-sm font-semibold text-white">
                {session.user.name?.charAt(0).toUpperCase() || "U"}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
