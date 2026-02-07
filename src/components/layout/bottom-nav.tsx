"use client";

import { motion } from "framer-motion";
import { Home, CalendarPlus, CalendarClock, Calendar, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/book", icon: CalendarPlus, label: "Book" },
  { href: "/schedules", icon: CalendarClock, label: "Rooms" },
  { href: "/schedule", icon: Calendar, label: "Mine" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
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
        </nav>
      </div>
    </div>
  );
}
