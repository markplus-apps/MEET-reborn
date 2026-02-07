"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { BentoGrid, BentoCard } from "@/components/dashboard/bento-grid";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Badge } from "@/components/ui/badge";
import { Building2, CalendarCheck, Clock, Users, ChevronRight, MapPin } from "lucide-react";
import { formatWIB } from "@/lib/timezone";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session } = useSession();

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: rooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await fetch("/api/rooms");
      if (!res.ok) throw new Error("Failed to fetch rooms");
      return res.json();
    },
  });

  const { data: myBookings } = useQuery({
    queryKey: ["myBookings"],
    queryFn: async () => {
      const res = await fetch("/api/bookings?my=true");
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  const upcomingBookings = (myBookings || [])
    .filter((b: { endTime: string; status: string }) => new Date(b.endTime) > new Date() && b.status !== "CANCELLED")
    .slice(0, 3);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Welcome back, <span className="gradient-text">{session?.user?.name || "User"}</span>
        </h1>
        <p className="text-sm text-zinc-500">Here&apos;s your meeting overview for today</p>
      </motion.div>

      <BentoGrid>
        <StatsCard
          title="Total Rooms"
          value={stats?.totalRooms || 0}
          icon={Building2}
          description="Active meeting rooms"
          gradient="from-violet-500 to-purple-500"
          delay={0}
        />
        <StatsCard
          title="Today's Bookings"
          value={stats?.todayBookings || 0}
          icon={CalendarCheck}
          description="Meetings scheduled today"
          gradient="from-blue-500 to-cyan-500"
          delay={0.1}
        />
        <StatsCard
          title="Available Now"
          value={stats?.availableRooms || 0}
          icon={Clock}
          description="Rooms free right now"
          gradient="from-emerald-500 to-teal-500"
          delay={0.2}
        />
        <StatsCard
          title="My Bookings"
          value={stats?.myBookings || 0}
          icon={Users}
          description="Your upcoming meetings"
          gradient="from-amber-500 to-orange-500"
          delay={0.3}
        />
      </BentoGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BentoCard colSpan={1} delay={0.4}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Upcoming Meetings</h2>
            <Link href="/schedule" className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarCheck className="mb-3 h-10 w-10 text-zinc-300" />
              <p className="text-sm text-zinc-400">No upcoming meetings</p>
              <Link href="/book" className="mt-2 text-xs font-medium text-violet-600 hover:text-violet-700">
                Book a room
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((booking: { id: string; title: string; startTime: string; endTime: string; room: { name: string; category: string } }, i: number) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 transition-colors hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                    <MapPin className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{booking.title}</p>
                    <p className="text-xs text-zinc-500">
                      {booking.room.name} • {formatWIB(new Date(booking.startTime), "HH:mm")} - {formatWIB(new Date(booking.endTime), "HH:mm")} WIB
                    </p>
                  </div>
                  <Badge variant={booking.room.category === "SPECIAL" ? "default" : "secondary"} className="flex-shrink-0">
                    {booking.room.category}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </BentoCard>

        <BentoCard colSpan={1} delay={0.5}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Quick Book</h2>
            <Link href="/book" className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400">
              All rooms <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(rooms || []).slice(0, 6).map((room: { id: string; name: string; category: string; capacity: number; canBook: boolean }, i: number) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.05 }}
              >
                <Link
                  href={`/book/${room.id}`}
                  className="flex flex-col gap-1 rounded-xl border border-zinc-200/60 bg-zinc-50 p-3 transition-all duration-200 hover:border-violet-300 hover:bg-violet-50 hover:shadow-sm dark:border-zinc-700/60 dark:bg-zinc-800/50 dark:hover:border-violet-700 dark:hover:bg-violet-900/20"
                >
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{room.name}</span>
                  <span className="text-xs text-zinc-400">{room.capacity} people</span>
                  {!room.canBook && (
                    <Badge variant="warning" className="mt-1 w-fit text-[10px]">Restricted</Badge>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
