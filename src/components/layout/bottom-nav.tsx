"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Home, Building2, Calendar, User, MoreHorizontal, BarChart3, FileSpreadsheet, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Drawer } from "vaul";

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
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
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
              onClick={() => setMoreOpen(true)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-all duration-200",
                "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              )}
            >
              <MoreHorizontal className="relative z-10 h-4 w-4" />
              <span className="relative z-10">More</span>
            </button>
          </nav>
        </div>
      </div>

      <Drawer.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-zinc-200/60 bg-white p-6 dark:border-zinc-700/60 dark:bg-zinc-900">
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <Drawer.Title className="sr-only">More Options</Drawer.Title>
            <div className="space-y-1">
              <Link
                href="/analytics"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <BarChart3 className="h-5 w-5 text-violet-500" />
                Analytics
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/sync"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <FileSpreadsheet className="h-5 w-5 text-violet-500" />
                  Legacy Sync
                </Link>
              )}
              <div className="my-2 h-px bg-zinc-200 dark:bg-zinc-700" />
              <button
                onClick={() => { setMoreOpen(false); signOut(); }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
