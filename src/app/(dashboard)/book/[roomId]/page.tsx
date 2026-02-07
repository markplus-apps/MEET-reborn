"use client";

import { useState, use } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Timeline } from "@/components/booking/timeline";
import { BookingModal } from "@/components/booking/booking-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { generateTimeSlots, formatWIB } from "@/lib/timezone";
import { ChevronLeft, ChevronRight, Users, MapPin, Calendar } from "lucide-react";
import Link from "next/link";
import { format, addDays, subDays } from "date-fns";

export default function RoomBookingPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: room } = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const res = await fetch("/api/rooms");
      const rooms = await res.json();
      return rooms.find((r: { id: string }) => r.id === roomId);
    },
  });

  const { data: bookings = [], refetch } = useQuery({
    queryKey: ["bookings", roomId, dateStr],
    queryFn: async () => {
      const res = await fetch(`/api/bookings?roomId=${roomId}&date=${dateStr}`);
      return res.json();
    },
    refetchInterval: 60000,
  });

  const slots = generateTimeSlots(selectedDate);

  const handleSlotClick = (start: Date, end: Date) => {
    if (selectedStart && !selectedEnd && start > selectedStart) {
      setSelectedEnd(end);
      setModalOpen(true);
    } else {
      setSelectedStart(start);
      setSelectedEnd(end);
      setModalOpen(true);
    }
  };

  const handleBookingSuccess = () => {
    setSelectedStart(null);
    setSelectedEnd(null);
    refetch();
  };

  if (!room) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Link href="/book">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1"
        >
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{room.name}</h1>
            <Badge variant={room.category === "SPECIAL" ? "warning" : "default"}>{room.category}</Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{room.capacity} people</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{room.facilities.slice(0, 3).join(", ")}</span>
          </div>
        </motion.div>
      </div>

      <Card glass>
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {formatWIB(selectedDate, "EEEE, dd MMMM yyyy")}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Office hours: 07:00 - 21:00 WIB</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            className="text-xs"
          >
            Today
          </Button>
        </div>

        <Timeline
          slots={slots}
          bookings={bookings}
          onSlotClick={handleSlotClick}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
        />
      </Card>

      <BookingModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedStart(null);
          setSelectedEnd(null);
        }}
        room={room}
        startTime={selectedStart}
        endTime={selectedEnd}
        onSuccess={handleBookingSuccess}
      />
    </div>
  );
}
