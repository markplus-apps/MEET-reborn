"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-media-query";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";
import { formatWIB } from "@/lib/timezone";
import { cancelBooking, checkInBooking, endBookingEarly, extendBooking, modifyBooking } from "@/actions/booking";
import { toast } from "sonner";
import { format, addDays, subDays, isToday, isSameDay, startOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2, Users, Wifi, Monitor, Mic, ChevronRight, Lock, Radio,
  Search, ChevronLeft, Calendar as CalendarIcon, Clock, MapPin,
  CalendarCheck, Check, X, Presentation, Timer, CheckCircle,
  ArrowRight, Pencil,
} from "lucide-react";

const facilityIcons: Record<string, React.ReactNode> = {
  WiFi: <Wifi className="h-3 w-3" />,
  Projector: <Monitor className="h-3 w-3" />,
  "Video Conference": <Monitor className="h-3 w-3" />,
  "Sound System": <Mic className="h-3 w-3" />,
};

interface RoomData {
  id: string;
  name: string;
  category: string;
  capacity: number;
  facilities: string[];
  canBook: boolean;
  isOccupied: boolean;
  currentMeeting: { title: string; user: string; endTime: string } | null;
}

interface Booking {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  participantCount: number;
  status: string;
  checkInStatus: string;
  room: { id: string; name: string; capacity: number; category: string; facilities: string[] };
  user: { id: string; name: string; email: string };
}

interface RoomBasic {
  id: string;
  name: string;
  capacity: number;
  category: string;
  facilities: string[];
  canBook?: boolean;
}

function getFacilityIcon(facility: string) {
  const f = facility.toLowerCase();
  if (f.includes("projector") || f.includes("presentation")) return Presentation;
  if (f.includes("monitor") || f.includes("screen")) return Monitor;
  if (f.includes("sound") || f.includes("mic") || f.includes("audio")) return Mic;
  return null;
}

function getShortRoomName(name: string): string {
  if (/^Meet\s*(\d+)$/i.test(name)) return name.replace(/^Meet\s*/i, "M");
  if (name.toLowerCase().includes("markplus gallery")) return "MP Gallery";
  if (name.toLowerCase().includes("philip kotler")) return "PK Classroom";
  if (name.toLowerCase().includes("museum of marketing")) return "Museum";
  return name;
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

export default function RoomsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") === "schedule" ? "schedule" : "rooms";
  const [activeTab, setActiveTab] = useState<"rooms" | "schedule">(tabParam);
  const [desktopSearch, setDesktopSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateStripVisible, setDateStripVisible] = useState(true);

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const todayActive = mounted && isToday(selectedDate);

  return (
    <div className="space-y-4 p-4 md:space-y-6 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden items-center justify-between gap-4 md:flex"
      >
        {activeTab === "rooms" ? (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search rooms, facilities..."
              value={desktopSearch}
              onChange={(e) => setDesktopSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-zinc-200/80 bg-white/80 p-1 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-800/80">
              <Button variant="ghost" size="icon" onClick={() => setSelectedDate((d) => subDays(d, 1))} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span suppressHydrationWarning>{mounted ? format(selectedDate, "EEEE, d MMMM yyyy", { locale: localeId }) : "\u00A0"}</span>
              </button>
              {!todayActive && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())} className="h-8 text-xs text-violet-600 dark:text-violet-400">
                  Hari ini
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setSelectedDate((d) => addDays(d, 1))} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <div className="flex rounded-xl border border-zinc-200/80 bg-white/80 p-1 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-800/80">
          {(["rooms", "schedule"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                activeTab === tab
                  ? "text-violet-700 dark:text-violet-300"
                  : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              )}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="roomsTab"
                  className="absolute inset-0 rounded-lg bg-violet-100/80 dark:bg-violet-900/30"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{tab === "rooms" ? "Rooms" : "Schedule"}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === "rooms" ? (
          <motion.div
            key="rooms"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <RoomsTab desktopSearch={desktopSearch} />
          </motion.div>
        ) : (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ScheduleTab mounted={mounted} selectedDate={selectedDate} setSelectedDate={setSelectedDate} dateStripVisible={dateStripVisible} setDateStripVisible={setDateStripVisible} />
            {mounted && <MobileDateStrip selectedDate={selectedDate} setSelectedDate={setSelectedDate} visible={dateStripVisible} setVisible={setDateStripVisible} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoomsTab({ desktopSearch }: { desktopSearch: string }) {
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await fetch("/api/rooms");
      if (!res.ok) throw new Error("Failed to fetch rooms");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const effectiveSearch = isMobile ? search : desktopSearch;

  const filtered = useMemo(() => {
    if (!rooms) return [];
    if (!effectiveSearch.trim()) return rooms;
    const q = effectiveSearch.toLowerCase();
    return rooms.filter((r: RoomData) =>
      r.name.toLowerCase().includes(q) ||
      r.facilities.some((f: string) => f.toLowerCase().includes(q))
    );
  }, [rooms, effectiveSearch]);

  const publicRooms = filtered.filter((r: RoomData) => r.category === "PUBLIC");
  const specialRooms = filtered.filter((r: RoomData) => r.category === "SPECIAL");

  return (
    <div className="space-y-6">
      <div className="relative md:hidden">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Search rooms, facilities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      ) : (
        <>
          {publicRooms.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-violet-500" />
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Public Rooms</h2>
                <Badge variant="secondary">{publicRooms.length}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {publicRooms.map((room: RoomData, i: number) => (
                  <RoomCard key={room.id} room={room} index={i} />
                ))}
              </div>
            </div>
          )}

          {specialRooms.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Special Rooms</h2>
                <Badge variant="warning">{specialRooms.length}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {specialRooms.map((room: RoomData, i: number) => (
                  <RoomCard key={room.id} room={room} index={i} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm font-medium text-zinc-500">No rooms found</p>
              <p className="mt-1 text-xs text-zinc-400">Try a different search term</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RoomCard({ room, index }: { room: RoomData; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card glass className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-xl",
        !room.canBook && "opacity-75",
      )}>
        <div className={cn(
          "absolute inset-x-0 top-0 h-1",
          room.isOccupied
            ? "bg-gradient-to-r from-red-400 to-red-600"
            : room.category === "SPECIAL"
            ? "bg-gradient-to-r from-amber-400 to-orange-500"
            : "bg-gradient-to-r from-emerald-400 to-emerald-600"
        )} />

        <div className="absolute right-3 top-3">
          {room.isOccupied ? (
            <Badge variant="destructive" className="gap-1 animate-pulse">
              <Radio className="h-3 w-3" />
              Occupied
            </Badge>
          ) : (
            <Badge variant="success" className="gap-1">
              <Check className="h-3 w-3" />
              Available
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{room.name}</h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
              <Users className="h-3.5 w-3.5" />
              <span>{room.capacity} people</span>
              <span className="mx-1 text-zinc-300">•</span>
              <Badge variant={room.category === "SPECIAL" ? "warning" : "default"} className="text-[10px]">
                {room.category}
              </Badge>
            </div>
          </div>

          {room.isOccupied && room.currentMeeting && (
            <div className="rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/20">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 truncate">{room.currentMeeting.title}</p>
              <p className="text-[10px] text-red-500 dark:text-red-400/70">
                by {room.currentMeeting.user} • until {formatWIB(new Date(room.currentMeeting.endTime), "HH:mm")} WIB
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {room.facilities.slice(0, 4).map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {facilityIcons[f] || null}
                {f}
              </span>
            ))}
            {room.facilities.length > 4 && (
              <span className="text-[10px] text-zinc-400">+{room.facilities.length - 4} more</span>
            )}
          </div>

          {room.canBook ? (
            <Link href={`/rooms/${room.id}`}>
              <Button size="sm" className="w-full mt-2">
                View Timeline
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          ) : (
            <Button size="sm" variant="secondary" disabled className="w-full mt-2">
              Admin Only
              <Lock className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function MobileDateStrip({ selectedDate, setSelectedDate, visible, setVisible }: { selectedDate: Date; setSelectedDate: React.Dispatch<React.SetStateAction<Date>>; visible: boolean; setVisible: React.Dispatch<React.SetStateAction<boolean>> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 15 }, (_, i) => addDays(today, i - 7));
  });

  const todayActive = isToday(selectedDate);
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  useEffect(() => {
    if (!visible) return;
    let startPos = { x: 0, y: 0 };
    let isTap = true;

    const onDown = (e: PointerEvent) => {
      startPos = { x: e.clientX, y: e.clientY };
      isTap = true;
    };
    const onMove = (e: PointerEvent) => {
      const dx = Math.abs(e.clientX - startPos.x);
      const dy = Math.abs(e.clientY - startPos.y);
      if (dx > 10 || dy > 10) isTap = false;
    };
    const onUp = (e: PointerEvent) => {
      if (isTap && stripRef.current && !stripRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [visible, setVisible]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !visible) return;
    const selectedIdx = dateRange.findIndex((d) => isSameDay(d, selectedDate));
    if (selectedIdx === -1) return;
    const itemWidth = 48;
    const containerWidth = el.clientWidth;
    const scrollTo = selectedIdx * itemWidth - containerWidth / 2 + itemWidth / 2;
    el.scrollTo({ left: Math.max(0, scrollTo), behavior: "smooth" });
  }, [selectedDate, dateRange, visible]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollLeft < 40) {
      const firstDate = dateRange[0];
      const newDates = Array.from({ length: 7 }, (_, i) => addDays(firstDate, -(7 - i)));
      setDateRange((prev) => [...newDates, ...prev]);
      requestAnimationFrame(() => {
        el.scrollLeft += 7 * 48;
      });
    }
    if (el.scrollLeft + el.clientWidth > el.scrollWidth - 40) {
      const lastDate = dateRange[dateRange.length - 1];
      const newDates = Array.from({ length: 7 }, (_, i) => addDays(lastDate, i + 1));
      setDateRange((prev) => [...prev, ...newDates]);
    }
  }, [dateRange]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
          className="fixed bottom-[72px] left-0 right-0 z-35 md:hidden"
          ref={stripRef}
        >
          <div className="mx-3 rounded-2xl border border-white/20 bg-white/55 px-2 py-2 shadow-lg shadow-black/5 backdrop-blur-2xl dark:border-zinc-700/30 dark:bg-zinc-900/55">
            <div className="mb-1.5 flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                {format(selectedDate, "MMMM yyyy", { locale: localeId })}
              </span>
              {!todayActive && (
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold text-violet-600 transition-colors active:bg-violet-500/25 dark:text-violet-400"
                >
                  Hari ini
                </button>
              )}
            </div>
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex gap-0.5 overflow-x-auto"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
            >
              {dateRange.map((date) => {
                const isSelected = isSameDay(date, selectedDate);
                const isCurrentDay = isToday(date);
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl px-2 py-1.5 transition-all duration-200 min-w-[44px]",
                      isSelected
                        ? "bg-violet-600 text-white shadow-md shadow-violet-500/30 scale-105"
                        : isCurrentDay
                        ? "bg-violet-100/50 text-violet-700 dark:bg-violet-800/25 dark:text-violet-400"
                        : "text-zinc-500 active:bg-zinc-200/40 dark:text-zinc-400 dark:active:bg-zinc-700/40"
                    )}
                  >
                    <span className={cn(
                      "text-[9px] font-semibold uppercase leading-tight",
                      isSelected ? "text-violet-200" : isCurrentDay ? "text-violet-500 dark:text-violet-400" : "text-zinc-400 dark:text-zinc-500"
                    )}>
                      {dayNames[date.getDay()]}
                    </span>
                    <span className={cn(
                      "text-base font-bold leading-tight",
                      isSelected ? "text-white" : ""
                    )}>
                      {format(date, "d")}
                    </span>
                    {isCurrentDay && !isSelected && (
                      <div className="mt-0.5 h-1 w-1 rounded-full bg-violet-500" />
                    )}
                    {isSelected && (
                      <div className="mt-0.5 h-1 w-1 rounded-full bg-white/80" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ScheduleTab({ mounted, selectedDate, setSelectedDate, dateStripVisible, setDateStripVisible }: { mounted: boolean; selectedDate: Date; setSelectedDate: React.Dispatch<React.SetStateAction<Date>>; dateStripVisible: boolean; setDateStripVisible: React.Dispatch<React.SetStateAction<boolean>> }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const currentUserId = (session?.user as { id?: string })?.id;
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: rooms = [] } = useQuery<RoomBasic[]>({
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

  const visibleRooms = useMemo(() => {
    if (isAdmin) return rooms;
    return rooms.filter((r) => r.category !== "SPECIAL");
  }, [rooms, isAdmin]);

  const publicRoomsSchedule = useMemo(() => {
    const meetOrder = ["Meet 1", "Meet 2", "Meet 3", "Meet 4", "Meet 5", "Meet 6", "Meet 7"];
    return visibleRooms
      .filter((r) => r.category === "PUBLIC")
      .sort((a, b) => {
        const aIdx = meetOrder.indexOf(a.name);
        const bIdx = meetOrder.indexOf(b.name);
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
      });
  }, [visibleRooms]);

  const specialRoomsSchedule = useMemo(() => {
    return visibleRooms.filter((r) => r.category === "SPECIAL");
  }, [visibleRooms]);

  useEffect(() => {
    if (visibleRooms.length > 0 && selectedRooms.size === 0) {
      setSelectedRooms(new Set(visibleRooms.map((r) => r.id)));
    }
  }, [visibleRooms, selectedRooms.size]);

  const roomsWithBookings = useMemo(() => {
    const sortOrder = [
      "Meet 1", "Meet 2", "Meet 3", "Meet 4", "Meet 5", "Meet 6", "Meet 7",
      "Philip Kotler Classroom", "MarkPlus Gallery", "Museum of Marketing",
    ];
    return visibleRooms
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
  }, [visibleRooms, bookings, selectedRooms]);

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

  const selectAll = () => setSelectedRooms(new Set(visibleRooms.map((r) => r.id)));
  const clearAll = () => setSelectedRooms(new Set());
  const todayActive = isToday(selectedDate);

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setActionSheetOpen(true);
  };

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); }
      else {
        toast.success("Booking cancelled");
        queryClient.invalidateQueries({ queryKey: ["allBookings"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        setActionSheetOpen(false);
      }
    },
  });

  const checkInMutation = useMutation({
    mutationFn: checkInBooking,
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); }
      else {
        toast.success("Checked in successfully!");
        queryClient.invalidateQueries({ queryKey: ["allBookings"] });
        setActionSheetOpen(false);
      }
    },
  });

  const endEarlyMutation = useMutation({
    mutationFn: endBookingEarly,
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); }
      else {
        toast.success("Meeting ended early");
        queryClient.invalidateQueries({ queryKey: ["allBookings"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        setActionSheetOpen(false);
      }
    },
  });

  return (
    <div className="space-y-4">
      {isMobile && !dateStripVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setDateStripVisible(true)}
          className="flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-violet-50/80 px-3 py-1.5 text-xs font-semibold text-violet-600 shadow-sm backdrop-blur-sm transition-all active:scale-95 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-400"
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {format(selectedDate, "d MMM", { locale: localeId })}
        </motion.button>
      )}

      {todayActive && activeCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 dark:bg-emerald-900/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {activeCount} meeting aktif
            </span>
          </div>
        </div>
      )}

      <Card glass className="p-3 sm:p-4">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Filter:</span>
            <button onClick={selectAll} className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-600 transition-colors hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400">
              All ({visibleRooms.length})
            </button>
            <button onClick={clearAll} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400">
              Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {publicRoomsSchedule.map((room) => (
              <button
                key={room.id}
                onClick={() => toggleRoom(room.id)}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all duration-200",
                  selectedRooms.has(room.id)
                    ? "bg-violet-100 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-700"
                    : "bg-zinc-50 text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:text-zinc-500 dark:hover:bg-zinc-800"
                )}
              >
                <div className={cn(
                  "flex h-3 w-3 items-center justify-center rounded-sm",
                  selectedRooms.has(room.id)
                    ? "bg-violet-500 text-white"
                    : "border border-zinc-300 dark:border-zinc-600"
                )}>
                  {selectedRooms.has(room.id) && <Check className="h-2 w-2" />}
                </div>
                {getShortRoomName(room.name)}
              </button>
            ))}
          </div>

          {specialRoomsSchedule.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Lock className="h-3 w-3" /> Special
                </span>
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {specialRoomsSchedule.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => toggleRoom(room.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all duration-200",
                      selectedRooms.has(room.id)
                        ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-700"
                        : "bg-zinc-50 text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:text-zinc-500 dark:hover:bg-zinc-800"
                    )}
                  >
                    <div className={cn(
                      "flex h-3 w-3 items-center justify-center rounded-sm",
                      selectedRooms.has(room.id)
                        ? "bg-amber-500 text-white"
                        : "border border-zinc-300 dark:border-zinc-600"
                    )}>
                      {selectedRooms.has(room.id) && <Check className="h-2 w-2" />}
                    </div>
                    {getShortRoomName(room.name)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>

      <div className="text-center">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" suppressHydrationWarning>
          {mounted ? format(selectedDate, "EEEE, d MMMM yyyy", { locale: localeId }) : "\u00A0"}
        </p>
        {mounted && todayActive && (
          <p className="text-xs text-zinc-400" suppressHydrationWarning>{format(new Date(), "HH:mm")} WIB</p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800/50" />
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
                <ScheduleRoomCard room={room} isToday={todayActive} mounted={mounted} onBookingClick={handleBookingClick} />
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

      {selectedBooking && (
        <BookingActionSheet
          open={actionSheetOpen}
          onClose={() => { setActionSheetOpen(false); setSelectedBooking(null); }}
          booking={selectedBooking}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isMobile={isMobile}
          rooms={rooms}
          onCancel={() => cancelMutation.mutate(selectedBooking.id)}
          onCheckIn={() => checkInMutation.mutate(selectedBooking.id)}
          onEndEarly={() => endEarlyMutation.mutate(selectedBooking.id)}
          isCancelling={cancelMutation.isPending}
        />
      )}
    </div>
  );
}

function ScheduleRoomCard({
  room,
  isToday: isTodayView,
  mounted,
  onBookingClick,
}: {
  room: RoomBasic & { bookings: Booking[] };
  isToday: boolean;
  mounted: boolean;
  onBookingClick: (b: Booking) => void;
}) {
  const hasActiveBooking = mounted && isTodayView && room.bookings.some((b) => isCurrentlyActive(b.startTime, b.endTime));

  return (
    <Card
      glass
      className={cn(
        "overflow-hidden transition-all duration-300",
        hasActiveBooking && "ring-2 ring-emerald-400/50 dark:ring-emerald-500/30"
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            hasActiveBooking ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-zinc-100 dark:bg-zinc-800"
          )}>
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
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{room.capacity}</span>
              {room.facilities.slice(0, 3).map((f) => {
                const Icon = getFacilityIcon(f);
                return Icon ? <span key={f} className="flex items-center gap-0.5" title={f}><Icon className="h-3 w-3" /></span> : null;
              })}
            </div>
          </div>
        </div>
        <Badge variant={room.bookings.length > 0 ? "default" : "outline"} className="text-[11px]">
          {room.bookings.length} booking{room.bookings.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="p-4">
        {room.bookings.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CalendarCheck className="mb-2 h-8 w-8 text-emerald-300 dark:text-emerald-700" />
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Available All Day</p>
            <p className="text-[11px] text-zinc-400">Ruangan tersedia untuk booking</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {room.bookings.map((booking) => (
              <ScheduleBookingRow
                key={booking.id}
                booking={booking}
                isTodayView={isTodayView}
                mounted={mounted}
                onClick={() => onBookingClick(booking)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function ScheduleBookingRow({
  booking,
  isTodayView,
  mounted,
  onClick,
}: {
  booking: Booking;
  isTodayView: boolean;
  mounted: boolean;
  onClick: () => void;
}) {
  const active = mounted && isTodayView && isCurrentlyActive(booking.startTime, booking.endTime);
  const progress = active ? getTimeProgress(booking.startTime, booking.endTime) : 0;
  const isPast = mounted && new Date(booking.endTime) < new Date();

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border p-3 text-left transition-all duration-300 hover:shadow-md",
        active
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-900/10"
          : isPast
          ? "border-zinc-100 bg-zinc-50/50 opacity-60 dark:border-zinc-800 dark:bg-zinc-800/30"
          : "border-zinc-100 bg-white hover:border-violet-200 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-violet-800"
      )}
    >
      {active && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={cn(
            "mt-0.5 flex-shrink-0 rounded-lg px-2 py-1 text-xs font-bold",
            active
              ? "bg-emerald-500 text-white"
              : isPast
              ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
              : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
          )}>
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
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{booking.user.name}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{booking.title}</p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            <Users className="mr-1 h-3 w-3" />{booking.participantCount}
          </Badge>
          <Badge
            variant={active ? "success" : booking.status === "CONFIRMED" ? "secondary" : "warning"}
            className="text-[10px]"
          >
            {active ? (<><Radio className="mr-1 h-3 w-3" />Live</>) : booking.status.toLowerCase()}
          </Badge>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600" />
        </div>
      </div>
    </button>
  );
}

function BookingActionSheet({
  open,
  onClose,
  booking,
  currentUserId,
  isAdmin,
  isMobile,
  rooms,
  onCancel,
  onCheckIn,
  onEndEarly,
  isCancelling,
}: {
  open: boolean;
  onClose: () => void;
  booking: Booking;
  currentUserId?: string;
  isAdmin: boolean;
  isMobile: boolean;
  rooms: RoomBasic[];
  onCancel: () => void;
  onCheckIn: () => void;
  onEndEarly: () => void;
  isCancelling: boolean;
}) {
  const [view, setView] = useState<"details" | "modify" | "extend">("details");
  const isOwn = booking.user.id === currentUserId;
  const canAct = isOwn || isAdmin;

  const now = new Date();
  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  const isInProgress = now >= startTime && now < endTime && booking.status !== "CANCELLED";
  const fifteenMinBefore = new Date(startTime.getTime() - 15 * 60 * 1000);
  const fifteenMinAfter = new Date(startTime.getTime() + 15 * 60 * 1000);
  const canCheckIn = booking.checkInStatus === "PENDING" && now >= fifteenMinBefore && now <= fifteenMinAfter && booking.status !== "CANCELLED";
  const isUpcoming = endTime > now && booking.status !== "CANCELLED";

  useEffect(() => {
    if (open) setView("details");
  }, [open]);

  const content = (
    <div className="space-y-4">
      {view === "details" && (
        <>
          <div>
            <DialogTitle>{booking.title}</DialogTitle>
            <DialogDescription>{booking.room.name}</DialogDescription>
          </div>

          <div className="space-y-2 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <MapPin className="h-4 w-4 text-violet-500" />
              <span>{booking.room.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <CalendarIcon className="h-4 w-4 text-violet-500" />
              <span>{formatWIB(startTime, "dd MMM yyyy")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Clock className="h-4 w-4 text-violet-500" />
              <span>{formatWIB(startTime, "HH:mm")} - {formatWIB(endTime, "HH:mm")} WIB</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Users className="h-4 w-4 text-violet-500" />
              <span>{booking.participantCount} participant{booking.participantCount !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium">Booked by:</span>
              <span>{booking.user.name}</span>
            </div>
            {booking.description && (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{booking.description}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Badge variant={booking.status === "CONFIRMED" ? "success" : booking.status === "CANCELLED" ? "destructive" : "warning"}>
                {booking.status}
              </Badge>
              {booking.checkInStatus === "CHECKED_IN" && (
                <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Checked In</Badge>
              )}
              {isInProgress && (
                <Badge variant="default" className="gap-1 animate-pulse"><Timer className="h-3 w-3" />In Progress</Badge>
              )}
            </div>
          </div>

          {canAct && isUpcoming && (
            <div className="grid grid-cols-2 gap-2">
              {canCheckIn && (
                <Button size="sm" variant="outline" onClick={onCheckIn} className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20">
                  <CheckCircle className="h-3.5 w-3.5" />Check In
                </Button>
              )}
              {isInProgress && (
                <Button size="sm" variant="outline" onClick={onEndEarly} className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20">
                  <Timer className="h-3.5 w-3.5" />End Early
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setView("modify")} className="gap-1 text-violet-600 border-violet-200 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-900/20">
                <Pencil className="h-3.5 w-3.5" />Modify
              </Button>
              <Button size="sm" variant="outline" onClick={() => setView("extend")} className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20">
                <ArrowRight className="h-3.5 w-3.5" />Extend
              </Button>
              <Button size="sm" variant="outline" onClick={onCancel} disabled={isCancelling} className="col-span-2 gap-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                <X className="h-3.5 w-3.5" />{isCancelling ? "Cancelling..." : "Cancel Booking"}
              </Button>
            </div>
          )}
        </>
      )}

      {view === "modify" && (
        <ModifyForm
          booking={booking}
          rooms={rooms}
          onBack={() => setView("details")}
          onSuccess={onClose}
        />
      )}

      {view === "extend" && (
        <ExtendForm
          booking={booking}
          onBack={() => setView("details")}
          onSuccess={onClose}
        />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-zinc-200/60 bg-white p-6 dark:border-zinc-700/60 dark:bg-zinc-900">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <Drawer.Title className="sr-only">Booking Details</Drawer.Title>
            {content}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog open={open} onClose={onClose}>
      {content}
    </Dialog>
  );
}

function ModifyForm({
  booking,
  rooms,
  onBack,
  onSuccess,
}: {
  booking: Booking;
  rooms: RoomBasic[];
  onBack: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(booking.title);
  const [description, setDescription] = useState(booking.description || "");
  const [selectedRoomId, setSelectedRoomId] = useState(booking.room.id);
  const [participantCount, setParticipantCount] = useState(booking.participantCount);
  const [dateStr, setDateStr] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");

  useEffect(() => {
    const wibStart = toZonedTime(new Date(booking.startTime), "Asia/Jakarta");
    const wibEnd = toZonedTime(new Date(booking.endTime), "Asia/Jakarta");
    setDateStr(format(wibStart, "yyyy-MM-dd"));
    setStartTimeStr(format(wibStart, "HH:mm"));
    setEndTimeStr(format(wibEnd, "HH:mm"));
  }, [booking]);

  const modifyMutation = useMutation({
    mutationFn: (data: { bookingId: string; payload: Parameters<typeof modifyBooking>[1] }) =>
      modifyBooking(data.bookingId, data.payload),
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); }
      else {
        toast.success("Booking modified successfully!");
        queryClient.invalidateQueries({ queryKey: ["allBookings"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        onSuccess();
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dateStr || !startTimeStr || !endTimeStr) return;
    const [sh, sm] = startTimeStr.split(":").map(Number);
    const [eh, em] = endTimeStr.split(":").map(Number);
    const startDate = new Date(`${dateStr}T00:00:00`);
    startDate.setHours(sh, sm, 0, 0);
    const startUtc = fromZonedTime(startDate, "Asia/Jakarta");
    const endDate = new Date(`${dateStr}T00:00:00`);
    endDate.setHours(eh, em, 0, 0);
    const endUtc = fromZonedTime(endDate, "Asia/Jakarta");

    modifyMutation.mutate({
      bookingId: booking.id,
      payload: { title, description, roomId: selectedRoomId, startTime: startUtc.toISOString(), endTime: endUtc.toISOString(), participantCount },
    });
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="h-4 w-4" /></Button>
        <div>
          <DialogTitle>Modify Booking</DialogTitle>
          <DialogDescription>Reschedule or change details</DialogDescription>
        </div>
      </div>

      <div className="space-y-3">
        <Input label="Meeting Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Room</label>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white/80 px-4 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
          >
            {rooms.filter((r) => r.canBook !== false).map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} ({room.capacity} people) {room.category === "SPECIAL" ? "★" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Date</label>
          <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white/80 px-4 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Start (WIB)</label>
            <input type="time" value={startTimeStr} onChange={(e) => setStartTimeStr(e.target.value)} min="07:00" max="21:00" step="300" className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">End (WIB)</label>
            <input type="time" value={endTimeStr} onChange={(e) => setEndTimeStr(e.target.value)} min="07:00" max="21:00" step="300" className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Participants</label>
          <input type="number" min={1} max={selectedRoom?.capacity || 50} value={participantCount} onChange={(e) => setParticipantCount(Math.max(1, parseInt(e.target.value) || 1))} className="flex h-11 w-24 rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-center backdrop-blur-sm transition-all duration-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description (Optional)</label>
          <textarea className="flex min-h-[60px] w-full rounded-xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm backdrop-blur-sm transition-all duration-200 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100" placeholder="Meeting agenda or notes..." value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button type="submit" disabled={modifyMutation.isPending || !title} className="flex-1">
          {modifyMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

function ExtendForm({
  booking,
  onBack,
  onSuccess,
}: {
  booking: Booking;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [extendMinutes, setExtendMinutes] = useState(30);

  const extendMutation = useMutation({
    mutationFn: ({ id, endTime }: { id: string; endTime: string }) => extendBooking(id, endTime),
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); }
      else {
        toast.success("Booking extended!");
        queryClient.invalidateQueries({ queryKey: ["allBookings"] });
        onSuccess();
      }
    },
  });

  const handleExtend = () => {
    const currentEnd = new Date(booking.endTime);
    const newEnd = new Date(currentEnd.getTime() + extendMinutes * 60 * 1000);
    extendMutation.mutate({ id: booking.id, endTime: newEnd.toISOString() });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="h-4 w-4" /></Button>
        <div>
          <DialogTitle>Extend Meeting</DialogTitle>
          <DialogDescription>Extend &quot;{booking.title}&quot; at {booking.room.name}</DialogDescription>
        </div>
      </div>

      <div className="space-y-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Current end: <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatWIB(new Date(booking.endTime), "HH:mm")} WIB</span>
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          New end: <span className="font-medium text-violet-600 dark:text-violet-400">
            {formatWIB(new Date(new Date(booking.endTime).getTime() + extendMinutes * 60 * 1000), "HH:mm")} WIB
          </span>
        </p>
      </div>

      <div className="flex gap-2">
        {[15, 30, 45, 60].map((min) => (
          <button
            key={min}
            onClick={() => setExtendMinutes(min)}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all",
              extendMinutes === min
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            )}
          >
            +{min}m
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={handleExtend} disabled={extendMutation.isPending} className="flex-1">
          {extendMutation.isPending ? "Extending..." : "Confirm Extension"}
        </Button>
      </div>
    </div>
  );
}
