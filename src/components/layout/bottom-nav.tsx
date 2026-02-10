"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Building2, Calendar, User, MoreHorizontal, BarChart3, FileSpreadsheet, LogOut, X, CalendarDays, Users, ChevronUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const [roomsSubOpen, setRoomsSubOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const moreRef = useRef<HTMLDivElement>(null);
  const roomsSubRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollThreshold = 8;
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const isOnRooms = pathname === "/rooms" || pathname.startsWith("/rooms/");
  const currentTab = searchParams.get("tab") === "schedule" ? "schedule" : "rooms";

  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (!mainEl) return;

    const handleScroll = () => {
      const currentY = mainEl.scrollTop;
      const diff = currentY - lastScrollY.current;

      if (diff > scrollThreshold && currentY > 60) {
        setNavVisible(false);
        setMoreOpen(false);
        setRoomsSubOpen(false);
      } else if (diff < -scrollThreshold) {
        setNavVisible(true);
      }

      lastScrollY.current = currentY;
    };

    mainEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => mainEl.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

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
    if (!roomsSubOpen) return;
    const handler = (e: PointerEvent) => {
      if (roomsSubRef.current && !roomsSubRef.current.contains(e.target as Node)) {
        setRoomsSubOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [roomsSubOpen]);

  useEffect(() => {
    setMoreOpen(false);
    setRoomsSubOpen(false);
  }, [pathname, searchParams]);

  const handleRoomsTap = (e: React.MouseEvent) => {
    if (isOnRooms) {
      e.preventDefault();
      setRoomsSubOpen(!roomsSubOpen);
      setMoreOpen(false);
    } else {
      setMoreOpen(false);
    }
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      animate={{ y: navVisible ? 0 : 120 }}
      transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
    >
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            ref={moreRef}
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
                  href="/admin/users"
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-[10px] font-medium transition-all duration-200",
                    pathname.startsWith("/admin/users")
                      ? "bg-violet-100/80 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                      : "text-zinc-500 active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-zinc-800"
                  )}
                >
                  <Users className="h-5 w-5" />
                  Users
                </Link>
              )}
              {isSuperAdmin && (
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

        {roomsSubOpen && (
          <motion.div
            ref={roomsSubRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
            className="mx-3 mb-2"
          >
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/80 px-3 py-2.5 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-zinc-700/50 dark:bg-zinc-900/80">
              <Link
                href="/rooms"
                onClick={() => setRoomsSubOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-5 py-1.5 text-[10px] font-medium transition-all duration-200",
                  currentTab === "rooms"
                    ? "bg-violet-100/80 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                    : "text-zinc-500 active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-zinc-800"
                )}
              >
                <Building2 className="h-5 w-5" />
                Rooms
              </Link>
              <Link
                href="/rooms?tab=schedule"
                onClick={() => setRoomsSubOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-5 py-1.5 text-[10px] font-medium transition-all duration-200",
                  currentTab === "schedule"
                    ? "bg-violet-100/80 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                    : "text-zinc-500 active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-zinc-800"
                )}
              >
                <CalendarDays className="h-5 w-5" />
                Schedule
              </Link>
              <button
                onClick={() => setRoomsSubOpen(false)}
                className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-3 mb-3" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <button
          onClick={scrollToTop}
          className="mx-auto mb-1 flex items-center gap-1 rounded-full bg-violet-500/10 px-3 py-0.5 text-[9px] font-semibold text-violet-500 backdrop-blur-sm transition-all active:bg-violet-500/20 dark:text-violet-400"
        >
          <ChevronUp className="h-3 w-3" />
          back to top
        </button>
        <nav className="flex items-center justify-around rounded-2xl border border-white/20 bg-white/70 px-1 py-1.5 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-zinc-700/50 dark:bg-zinc-900/70">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const isRoomsItem = item.href === "/rooms";

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={isRoomsItem ? handleRoomsTap : undefined}
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
            onClick={() => { setMoreOpen(!moreOpen); setRoomsSubOpen(false); }}
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
    </motion.div>
  );
}
