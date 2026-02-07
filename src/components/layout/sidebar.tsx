"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Building2, Calendar, User, ChevronLeft, ChevronRight, LogOut, BarChart3, FileSpreadsheet, Shield, Users, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/rooms", icon: Building2, label: "Rooms" },
  { href: "/my-bookings", icon: Calendar, label: "My Bookings" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [adminOpen, setAdminOpen] = useState(true);
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const adminSubItems = [
    { href: "/admin/users", icon: Users, label: "User Management" },
    ...(isSuperAdmin ? [{ href: "/admin/sync", icon: FileSpreadsheet, label: "Google Sheets Sync" }] : []),
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className="hidden md:flex h-screen flex-col border-r border-zinc-200/60 bg-white/80 backdrop-blur-xl dark:border-zinc-700/60 dark:bg-zinc-900/80"
    >
      <div className="flex h-16 items-center justify-between px-4">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-md dark:bg-zinc-800">
                <Image src="/logo.png" alt="MCorp" width={28} height={28} className="object-contain" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  MEET
                </h1>
                <p className="text-[10px] font-medium text-zinc-400">MarkPlus</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-violet-700 dark:text-violet-300"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActive"
                  className="absolute inset-0 rounded-xl bg-violet-50 dark:bg-violet-900/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className={cn("relative z-10 h-5 w-5 flex-shrink-0", isActive && "text-violet-600 dark:text-violet-400")} />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="relative z-10"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            {!collapsed && (
              <div className="!mt-4 mb-1 px-3">
                <div className="h-px bg-zinc-200/80 dark:bg-zinc-700/60" />
              </div>
            )}
            {collapsed ? (
              adminSubItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "text-violet-700 dark:text-violet-300"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActive"
                        className="absolute inset-0 rounded-xl bg-violet-50 dark:bg-violet-900/20"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <item.icon className={cn("relative z-10 h-5 w-5 flex-shrink-0", isActive && "text-violet-600 dark:text-violet-400")} />
                  </Link>
                );
              })
            ) : (
              <div className="!mt-2">
                <button
                  onClick={() => setAdminOpen(!adminOpen)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 transition-all duration-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <Shield className="h-5 w-5 flex-shrink-0 text-amber-500" />
                  <span className="flex-1 text-left">Admin</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", adminOpen && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {adminOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-3 space-y-0.5 border-l-2 border-zinc-200/80 pl-3 dark:border-zinc-700/60">
                        {adminSubItems.map((item) => {
                          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                                isActive
                                  ? "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300"
                                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                              )}
                            >
                              <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive && "text-violet-600 dark:text-violet-400")} />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </nav>

      <div className="border-t border-zinc-200/60 px-3 py-4 dark:border-zinc-700/60">
        <button
          onClick={() => signOut()}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-900/20 dark:hover:text-red-400",
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
