"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Clock,
  MapPin,
  Radio,
  CalendarCheck,
  Check,
  X,
  Monitor,
  Mic,
  Presentation,
} from "lucide-react";
import { format, addDays, subDays, isToday, isSameDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatWIB } from "@/lib/timezone";

interface Booking {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  participantCount: number;
  status: string;
  checkInStatus: string;
  room: {
    id: string;
    name: string;
    capacity: number;
    category: string;
    facilities: string[];
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  category: string;
  facilities: string[];
}

function getFacilityIcon(facility: string) {
  const f = facility.toLowerCase();
  if (f.includes("projector") || f.includes("presentation")) return Presentation;
  if (f.includes("monitor") || f.includes("screen")) return Monitor;
  if (f.includes("sound") || f.includes("mic") || f.includes("audio")) return Mic;
  return null;
}

function isCurrentlyActive(startTime: string, endTime: string): boolean {
  const now = new Date();
  return new Date(startTime) <= now && new Date(endTime) > now;
}

function getTimeProgress(startTime: string, endTime: string): number {
  const now = new Date().getTime();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (now < start) return 0;
  if (now > end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

export default function RoomSchedulesPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await fetch("/api/rooms");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["allBookings", dateStr],
    queryFn: async () => {
      const res = await fetch(`/api/bookings?date=${dateStr}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (rooms.length > 0 && selectedRooms.size === 0) {
      setSelectedRooms(new Set(rooms.map((r) => r.id)));
    }
  }, [rooms, selectedRooms.size]);

  const roomsWithBookings = useMemo(() => {
    const sortOrder = [
      "Philip Kotler Classroom",
      "MarkPlus Gallery",
      "Museum of Marketing",
      "Meet 1",
      "Meet 2",
      "Meet 3",
      "Meet 4",
      "Meet 5",
      "Meet 6",
      "Meet 7",
    ];

    return rooms
      .filter((room) => selectedRooms.has(room.id))
      .sort((a, b) => {
        const aIdx = sortOrder.findIndex((n) => a.name.toLowerCase().includes(n.toLowerCase()));
        const bIdx = sortOrder.findIndex((n) => b.name.toLowerCase().includes(n.toLowerCase()));
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
      })
      .map((room) => ({
        ...room,
        bookings: bookings
          .filter((b) => b.room.id === room.id)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
      }));
  }, [rooms, bookings, selectedRooms]);

  const activeCount = useMemo(() => {
    if (!mounted) return 0;
    return bookings.filter((b) => isCurrentlyActive(b.startTime, b.endTime)).length;
  }, [bookings, mounted]);

  const toggleRoom = (id: string) => {
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedRooms(new Set(rooms.map((r) => r.id)));
  const clearAll = () => setSelectedRooms(new Set());

  const todayActive = isToday(selectedDate);

  return (
    <div className="space-y-4 p-4 md:space-y-6 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Room Schedules
          </h1>
          <p className="text-sm text-zinc-500">
            Jadwal real-time semua ruang meeting
          </p>
        </motion.div>

        <div className="flex items-center gap-2">
          {todayActive && activeCount > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 dark:bg-emerald-900/20">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {activeCount} meeting aktif
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 rounded-xl border border-zinc-200/80 bg-white/80 p-1 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-800/80">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate((d) => subDays(d, 1))}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>{format(selectedDate, "d MMM", { locale: localeId })}</span>
            </button>
            {!todayActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="h-8 text-xs text-violet-600 dark:text-violet-400"
              >
                Today
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card glass className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Rooms:
          </span>
          <button
            onClick={selectAll}
            className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-600 transition-colors hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400"
          >
            All ({rooms.length})
          </button>
          <button
            onClick={clearAll}
            className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
          >
            Clear
          </button>
          <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => toggleRoom(room.id)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                selectedRooms.has(room.id)
                  ? "bg-violet-100 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-700"
                  : "bg-zinc-50 text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:text-zinc-500 dark:hover:bg-zinc-800"
              }`}
            >
              <div
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm ${
                  selectedRooms.has(room.id)
                    ? "bg-violet-500 text-white"
                    : "border border-zinc-300 dark:border-zinc-600"
                }`}
              >
                {selectedRooms.has(room.id) && <Check className="h-2.5 w-2.5" />}
              </div>
              {room.name}
              <span className="text-[10px] opacity-60">({room.capacity})</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="text-center">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {format(selectedDate, "EEEE, d MMMM yyyy", { locale: localeId })}
        </p>
        {mounted && todayActive && (
          <p className="text-xs text-zinc-400">
            {format(new Date(), "HH:mm")} WIB
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800/50"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {roomsWithBookings.map((room, idx) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.05 }}
              >
                <RoomCard room={room} isToday={todayActive} mounted={mounted} />
              </motion.div>
            ))}
          </AnimatePresence>

          {roomsWithBookings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarCheck className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm font-medium text-zinc-500">Tidak ada ruangan dipilih</p>
              <p className="mt-1 text-xs text-zinc-400">Pilih ruangan di atas untuk melihat jadwal</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RoomCard({
  room,
  isToday: isTodayView,
  mounted,
}: {
  room: Room & { bookings: Booking[] };
  isToday: boolean;
  mounted: boolean;
}) {
  const hasActiveBooking = mounted && isTodayView && room.bookings.some((b) => isCurrentlyActive(b.startTime, b.endTime));

  return (
    <Card
      glass
      className={`overflow-hidden transition-all duration-300 ${
        hasActiveBooking
          ? "ring-2 ring-emerald-400/50 dark:ring-emerald-500/30"
          : ""
      }`}
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              hasActiveBooking
                ? "bg-emerald-100 dark:bg-emerald-900/30"
                : "bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            {hasActiveBooking ? (
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
            ) : (
              <MapPin className="h-4 w-4 text-zinc-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{room.name}</h3>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {room.capacity} orang
              </span>
              {room.facilities.slice(0, 3).map((f) => {
                const Icon = getFacilityIcon(f);
                return Icon ? (
                  <span key={f} className="flex items-center gap-0.5" title={f}>
                    <Icon className="h-3 w-3" />
                  </span>
                ) : null;
              })}
            </div>
          </div>
        </div>
        <Badge
          variant={room.bookings.length > 0 ? "default" : "outline"}
          className="text-[11px]"
        >
          {room.bookings.length} booking{room.bookings.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="p-4">
        {room.bookings.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CalendarCheck className="mb-2 h-8 w-8 text-emerald-300 dark:text-emerald-700" />
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Available All Day
            </p>
            <p className="text-[11px] text-zinc-400">Ruangan tersedia untuk booking</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {room.bookings.map((booking) => (
              <BookingRow key={booking.id} booking={booking} isTodayView={isTodayView} mounted={mounted} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function BookingRow({ booking, isTodayView, mounted }: { booking: Booking; isTodayView: boolean; mounted: boolean }) {
  const active = mounted && isTodayView && isCurrentlyActive(booking.startTime, booking.endTime);
  const progress = active ? getTimeProgress(booking.startTime, booking.endTime) : 0;
  const isPast = mounted && new Date(booking.endTime) < new Date();

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border p-3 transition-all duration-300 ${
        active
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-900/10"
          : isPast
          ? "border-zinc-100 bg-zinc-50/50 opacity-60 dark:border-zinc-800 dark:bg-zinc-800/30"
          : "border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900/50"
      }`}
    >
      {active && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex-shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${
              active
                ? "bg-emerald-500 text-white"
                : isPast
                ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
            }`}
          >
            {formatWIB(new Date(booking.startTime), "HH:mm")} - {formatWIB(new Date(booking.endTime), "HH:mm")}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {active && (
                <span className="relative mr-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              )}
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {booking.user.name}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {booking.title}
            </p>
            {booking.description && (
              <p className="mt-0.5 truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                {booking.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            <Users className="mr-1 h-3 w-3" />
            {booking.participantCount}
          </Badge>
          <Badge
            variant={
              active ? "success" : booking.status === "CONFIRMED" ? "secondary" : "warning"
            }
            className="text-[10px]"
          >
            {active ? (
              <>
                <Radio className="mr-1 h-3 w-3" />
                Live
              </>
            ) : (
              booking.status.toLowerCase()
            )}
          </Badge>
        </div>
      </div>
    </div>
  );
}
