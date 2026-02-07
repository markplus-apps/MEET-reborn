"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon } from "lucide-react";
import { formatWIB } from "@/lib/timezone";
import { useTheme } from "@/providers/theme-provider";

const pageMeta: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Overview & quick actions" },
  "/rooms": { title: "Rooms", subtitle: "Browse rooms and schedules" },
  "/my-bookings": { title: "My Bookings", subtitle: "View and manage your bookings" },
  "/analytics": { title: "Analytics", subtitle: "Room usage statistics" },
  "/profile": { title: "Profile", subtitle: "Manage your account" },
  "/admin/sync": { title: "Sheets Sync", subtitle: "Google Sheets two-way sync" },
  "/admin/users": { title: "User Management", subtitle: "Manage users and roles" },
};

function getPageMeta(pathname: string) {
  if (pageMeta[pathname]) return pageMeta[pathname];
  if (pathname.startsWith("/rooms/")) return { title: "Room Detail", subtitle: "Timeline booking" };
  return { title: "MarkPlus Meet" };
}

export function Header() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [now, setNow] = useState<Date | null>(null);
  const meta = getPageMeta(pathname);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-zinc-200/60 bg-white/70 backdrop-blur-xl dark:border-zinc-700/60 dark:bg-zinc-900/70 md:sticky md:top-0 md:z-30">
      <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
        <div className="md:hidden">
          <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {meta.title}
          </h1>
        </div>

        <div className="hidden md:flex md:items-center md:gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {meta.title}
            </h1>
            {meta.subtitle && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{meta.subtitle}</p>
            )}
          </div>
          {now && (
            <div className="ml-4 flex items-center gap-1.5 rounded-lg bg-zinc-100/80 px-3 py-1.5 dark:bg-zinc-800/80">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatWIB(now, "EEE, dd MMM")} · <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatWIB(now, "HH:mm")} WIB</span>
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-xl border border-zinc-200/60 bg-white/80 text-zinc-500 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {session?.user && (
            <>
              <Badge variant={(session.user as { role: string }).role === "EMPLOYEE" ? "secondary" : "default"} className="hidden sm:inline-flex">
                {(session.user as { role: string }).role}
              </Badge>
              <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-xs md:text-sm font-semibold text-white">
                {session.user.name?.charAt(0).toUpperCase() || "U"}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
