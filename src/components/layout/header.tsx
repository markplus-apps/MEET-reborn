"use client";

import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { formatWIB, getWIBNow } from "@/lib/timezone";

export function Header() {
  const { data: session } = useSession();
  const now = getWIBNow();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/60 bg-white/70 backdrop-blur-xl dark:border-zinc-700/60 dark:bg-zinc-900/70">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3 md:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">MEET</h1>
            <p className="text-[10px] font-medium text-zinc-400">MarkPlus</p>
          </div>
        </div>
        <div className="hidden md:block">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatWIB(now, "EEEE, dd MMMM yyyy")} • <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatWIB(now, "HH:mm")} WIB</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
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
