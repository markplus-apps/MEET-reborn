"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { BentoGrid, BentoCard } from "@/components/dashboard/bento-grid";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CalendarCheck,
  Clock,
  Users,
  ChevronRight,
  MapPin,
  Plus,
  ArrowRight,
  CalendarDays,
  BarChart3,
  Zap,
} from "lucide-react";
import { formatWIB, toWIB } from "@/lib/timezone";
import Link from "next/link";
import { useState, useEffect } from "react";

function getGreeting() {
  const hour = toWIB(new Date()).getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getTodayWIB() {
  return formatWIB(new Date(), "EEEE, d MMMM yyyy");
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [greeting, setGreeting] = useState("");
  const [todayStr, setTodayStr] = useState("");

  useEffect(() => {
    setGreeting(getGreeting());
    setTodayStr(getTodayWIB());
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 60000,
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
    refetchInterval: 60000,
  });

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const upcomingBookings = now
    ? (myBookings || [])
        .filter((b: { endTime: string; status: string }) => new Date(b.endTime) > now && b.status !== "CANCELLED")
        .sort((a: { startTime: string }, b: { startTime: string }) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 3)
    : [];

  const nextMeeting = upcomingBookings[0] || null;

  const nextMeetingTimeLabel = nextMeeting && now
    ? (() => {
        const start = new Date(nextMeeting.startTime);
        const diffMs = start.getTime() - now.getTime();
        const diffMin = Math.max(0, Math.floor(diffMs / 60000));
        if (diffMin <= 0) return "Happening now";
        if (diffMin < 60) return `In ${diffMin} min`;
        const diffHrs = Math.floor(diffMin / 60);
        const remainMin = diffMin % 60;
        if (diffHrs < 24) return remainMin > 0 ? `In ${diffHrs}h ${remainMin}m` : `In ${diffHrs}h`;
        return formatWIB(start, "dd MMM, HH:mm");
      })()
    : "";

  return (
    <div className="space-y-5 md:space-y-6 p-4 md:p-6 pb-28 md:pb-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 md:p-8 text-white"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzB2MkgyVjRoMzR6TTIgNTBoMzR2Mkgydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-violet-200">{greeting}</p>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              {session?.user?.name || "User"}
            </h1>
            <p className="text-xs md:text-sm text-violet-200/80">{todayStr}</p>
          </div>

          <Link
            href="/rooms"
            className="group flex items-center justify-center gap-2.5 rounded-xl bg-white px-6 py-3.5 md:px-8 md:py-4 font-semibold text-violet-700 shadow-xl shadow-violet-900/20 transition-all duration-200 hover:bg-violet-50 hover:shadow-2xl hover:shadow-violet-900/30 active:scale-[0.98]"
          >
            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90 duration-300" />
            <span className="text-base md:text-lg">Book Now</span>
            <ArrowRight className="h-4 w-4 ml-1 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 duration-300" />
          </Link>
        </div>

        {nextMeeting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative z-10 mt-4 flex items-center gap-3 rounded-xl bg-white/15 backdrop-blur-sm px-4 py-3 border border-white/10"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/20">
              <Zap className="h-5 w-5 text-amber-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-violet-200">Next Meeting</p>
              <p className="truncate text-sm font-semibold">{nextMeeting.title}</p>
              <p className="text-xs text-violet-200/80">
                {(nextMeeting as { room: { name: string } }).room.name} &middot; {formatWIB(new Date(nextMeeting.startTime), "HH:mm")} - {formatWIB(new Date(nextMeeting.endTime), "HH:mm")} WIB
              </p>
            </div>
            <div className="flex-shrink-0 rounded-lg bg-white/20 px-3 py-1.5">
              <p className="text-xs font-bold text-amber-200">{nextMeetingTimeLabel}</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      <BentoGrid>
        <StatsCard
          title="Total Rooms"
          value={stats?.totalRooms || 0}
          icon={Building2}
          description="Active meeting rooms"
          gradient="from-violet-500 to-purple-500"
          delay={0.1}
        />
        <StatsCard
          title="Today's Bookings"
          value={stats?.todayBookings || 0}
          icon={CalendarCheck}
          description="Meetings scheduled"
          gradient="from-blue-500 to-cyan-500"
          delay={0.15}
        />
        <StatsCard
          title="Available Now"
          value={stats?.availableRooms || 0}
          icon={Clock}
          description="Rooms free now"
          gradient="from-emerald-500 to-teal-500"
          delay={0.2}
        />
        <StatsCard
          title="My Bookings"
          value={stats?.myBookings || 0}
          icon={Users}
          description="Upcoming meetings"
          gradient="from-amber-500 to-orange-500"
          delay={0.25}
        />
      </BentoGrid>

      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Link href="/rooms" className="group flex flex-col items-center gap-2 rounded-2xl border border-zinc-200/60 bg-white/70 p-4 backdrop-blur-xl transition-all active:scale-[0.97] dark:border-zinc-700/60 dark:bg-zinc-900/70">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg shadow-violet-500/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Browse Rooms</span>
        </Link>
        <Link href="/my-bookings" className="group flex flex-col items-center gap-2 rounded-2xl border border-zinc-200/60 bg-white/70 p-4 backdrop-blur-xl transition-all active:scale-[0.97] dark:border-zinc-700/60 dark:bg-zinc-900/70">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
            <CalendarDays className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">My Bookings</span>
        </Link>
        <Link href="/rooms?tab=schedule" className="group flex flex-col items-center gap-2 rounded-2xl border border-zinc-200/60 bg-white/70 p-4 backdrop-blur-xl transition-all active:scale-[0.97] dark:border-zinc-700/60 dark:bg-zinc-900/70">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Schedules</span>
        </Link>
        <Link href="/analytics" className="group flex flex-col items-center gap-2 rounded-2xl border border-zinc-200/60 bg-white/70 p-4 backdrop-blur-xl transition-all active:scale-[0.97] dark:border-zinc-700/60 dark:bg-zinc-900/70">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Analytics</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BentoCard colSpan={1} delay={0.3}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-zinc-100">Upcoming Meetings</h2>
            <Link href="/my-bookings" className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                <CalendarCheck className="h-7 w-7 text-zinc-300 dark:text-zinc-600" />
              </div>
              <p className="text-sm font-medium text-zinc-400">No upcoming meetings</p>
              <p className="mt-1 text-xs text-zinc-400/70">Book a room to get started</p>
              <Link href="/rooms" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-violet-700">
                <Plus className="h-3.5 w-3.5" />
                Book Now
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingBookings.map((booking: { id: string; title: string; startTime: string; endTime: string; room: { name: string; category: string } }, i: number) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 transition-colors hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                    <MapPin className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{booking.title}</p>
                    <p className="text-xs text-zinc-500">
                      {booking.room.name} &middot; {formatWIB(new Date(booking.startTime), "HH:mm")} - {formatWIB(new Date(booking.endTime), "HH:mm")} WIB
                    </p>
                  </div>
                  <Badge variant={booking.room.category === "SPECIAL" ? "default" : "secondary"} className="flex-shrink-0 text-[10px]">
                    {booking.room.category}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </BentoCard>

        <BentoCard colSpan={1} delay={0.4}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-zinc-100">Quick Book</h2>
            <Link href="/rooms" className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400">
              All rooms <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(rooms || []).slice(0, 6).map((room: { id: string; name: string; category: string; capacity: number; canBook: boolean }, i: number) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.05 }}
              >
                <Link
                  href={`/rooms/${room.id}`}
                  className="flex flex-col gap-1 rounded-xl border border-zinc-200/60 bg-zinc-50 p-3 transition-all duration-200 hover:border-violet-300 hover:bg-violet-50 hover:shadow-sm active:scale-[0.97] dark:border-zinc-700/60 dark:bg-zinc-800/50 dark:hover:border-violet-700 dark:hover:bg-violet-900/20"
                >
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{room.name}</span>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-zinc-400" />
                    <span className="text-xs text-zinc-400">{room.capacity}</span>
                  </div>
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
