"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Building2, Calendar, User, MoreHorizontal, BarChart3, FileSpreadsheet, LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/rooms", icon: Building2, label: "Rooms" },
  { href: "/my-bookings", icon: Calendar, label: "Bookings" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden" ref={moreRef}>
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
            className="mx-3 mb-2"
          >
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/80 px-3 py-2.5 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-zinc-700/50 dark:bg-zinc-900/80">
              <Link
                href="/analytics"
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-[10px] font-medium transition-all duration-200",
                  pathname === "/analytics"
                    ? "bg-violet-100/80 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                    : "text-zinc-500 active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-zinc-800"
                )}
              >
                <BarChart3 className="h-5 w-5" />
                Analytics
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/sync"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-[10px] font-medium transition-all duration-200",
                    pathname.startsWith("/admin/sync")
                      ? "bg-violet-100/80 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                      : "text-zinc-500 active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-zinc-800"
                  )}
                >
                  <FileSpreadsheet className="h-5 w-5" />
                  Sync
                </Link>
              )}
              <button
                onClick={() => { setMoreOpen(false); signOut(); }}
                className="flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-[10px] font-medium text-red-500 transition-all duration-200 active:bg-red-50 dark:text-red-400 dark:active:bg-red-900/20"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
              <button
                onClick={() => setMoreOpen(false)}
                className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-3 mb-3">
        <nav className="flex items-center justify-around rounded-2xl border border-white/20 bg-white/70 px-1 py-1.5 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-zinc-700/50 dark:bg-zinc-900/70">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-all duration-200",
                  isActive
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomNavActive"
                    className="absolute inset-0 rounded-xl bg-violet-100/80 dark:bg-violet-900/30"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-all duration-200",
              moreOpen
                ? "text-violet-600 dark:text-violet-400"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            )}
          >
            {moreOpen && (
              <motion.div
                layoutId="bottomNavActive"
                className="absolute inset-0 rounded-xl bg-violet-100/80 dark:bg-violet-900/30"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <MoreHorizontal className="relative z-10 h-4 w-4" />
            <span className="relative z-10">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
