"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, X, CalendarCheck, CheckCircle, Timer, ArrowRight, Pencil } from "lucide-react";
import { formatWIB } from "@/lib/timezone";
import { cancelBooking, checkInBooking, endBookingEarly, extendBooking, modifyBooking } from "@/actions/booking";
import { toast } from "sonner";
import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export default function MyBookingsPage() {
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["myBookings"],
    queryFn: async () => {
      const res = await fetch("/api/bookings?my=true");
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await fetch("/api/rooms");
      if (!res.ok) throw new Error("Failed to fetch rooms");
      return res.json();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Booking cancelled");
        queryClient.invalidateQueries({ queryKey: ["myBookings"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
      }
    },
  });

  const checkInMutation = useMutation({
    mutationFn: checkInBooking,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Checked in successfully!");
        queryClient.invalidateQueries({ queryKey: ["myBookings"] });
      }
    },
  });

  const endEarlyMutation = useMutation({
    mutationFn: endBookingEarly,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Meeting ended early");
        queryClient.invalidateQueries({ queryKey: ["myBookings"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
      }
    },
  });

  const upcoming = bookings.filter(
    (b: { endTime: string; status: string }) => new Date(b.endTime) > new Date() && b.status !== "CANCELLED"
  );
  const past = bookings.filter(
    (b: { endTime: string; status: string }) => new Date(b.endTime) <= new Date() || b.status === "CANCELLED"
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">My Bookings</h1>
        <p className="text-sm text-zinc-500">View and manage your meeting room bookings</p>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      ) : (
        <>
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              <CalendarCheck className="h-4 w-4 text-emerald-500" />
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <Card glass className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="mb-3 h-12 w-12 text-zinc-300" />
                <p className="text-sm text-zinc-400">No upcoming bookings</p>
              </Card>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {upcoming.map((booking: BookingData, i: number) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      index={i}
                      rooms={rooms}
                      onCancel={() => cancelMutation.mutate(booking.id)}
                      onCheckIn={() => checkInMutation.mutate(booking.id)}
                      onEndEarly={() => endEarlyMutation.mutate(booking.id)}
                      isCancelling={cancelMutation.isPending}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                <Clock className="h-4 w-4 text-zinc-400" />
                Past & Cancelled ({past.length})
              </h2>
              <div className="space-y-3">
                {past.slice(0, 10).map((booking: BookingData, i: number) => (
                  <BookingCard key={booking.id} booking={booking} index={i} rooms={rooms} isPast />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface BookingData {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: string;
  participantCount: number;
  checkInStatus: string;
  roomId: string;
  room: { id: string; name: string; category: string; capacity: number };
}

interface RoomData {
  id: string;
  name: string;
  category: string;
  capacity: number;
  canBook: boolean;
}

function BookingCard({
  booking,
  index,
  rooms,
  onCancel,
  onCheckIn,
  onEndEarly,
  isCancelling,
  isPast,
}: {
  booking: BookingData;
  index: number;
  rooms: RoomData[];
  onCancel?: () => void;
  onCheckIn?: () => void;
  onEndEarly?: () => void;
  isCancelling?: boolean;
  isPast?: boolean;
}) {
  const [extendOpen, setExtendOpen] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const queryClient = useQueryClient();
  const now = new Date();
  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  const isInProgress = now >= startTime && now < endTime && booking.status !== "CANCELLED";
  const fifteenMinBefore = new Date(startTime.getTime() - 15 * 60 * 1000);
  const fifteenMinAfter = new Date(startTime.getTime() + 15 * 60 * 1000);
  const canCheckIn = booking.checkInStatus === "PENDING" && now >= fifteenMinBefore && now <= fifteenMinAfter && booking.status !== "CANCELLED";

  const extendMutation = useMutation({
    mutationFn: ({ id, endTime }: { id: string; endTime: string }) => extendBooking(id, endTime),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Booking extended!");
        queryClient.invalidateQueries({ queryKey: ["myBookings"] });
        setExtendOpen(false);
      }
    },
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card glass className={`${isPast ? "opacity-60" : ""} ${isInProgress ? "border-l-4 border-l-emerald-500" : ""}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{booking.title}</h3>
                <Badge
                  variant={
                    booking.status === "CONFIRMED" ? "success" :
                    booking.status === "CANCELLED" ? "destructive" : "warning"
                  }
                >
                  {booking.status}
                </Badge>
                {booking.checkInStatus === "CHECKED_IN" && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Checked In
                  </Badge>
                )}
                {booking.checkInStatus === "MISSED" && (
                  <Badge variant="destructive" className="gap-1">Missed</Badge>
                )}
                {isInProgress && (
                  <Badge variant="default" className="gap-1 animate-pulse">
                    <Timer className="h-3 w-3" />
                    In Progress
                  </Badge>
                )}
              </div>
              {booking.description && (
                <p className="text-xs text-zinc-500 line-clamp-1">{booking.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-violet-500" />
                  {booking.room.name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-violet-500" />
                  {formatWIB(new Date(booking.startTime), "dd MMM yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-violet-500" />
                  {formatWIB(new Date(booking.startTime), "HH:mm")} - {formatWIB(new Date(booking.endTime), "HH:mm")} WIB
                </span>
                {booking.participantCount > 1 && (
                  <span className="text-zinc-400">{booking.participantCount} participants</span>
                )}
              </div>

              {!isPast && booking.status !== "CANCELLED" && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {canCheckIn && onCheckIn && (
                    <Button size="sm" variant="outline" onClick={onCheckIn} className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20">
                      <CheckCircle className="h-3 w-3" />
                      Check In
                    </Button>
                  )}
                  {isInProgress && onEndEarly && (
                    <Button size="sm" variant="outline" onClick={onEndEarly} className="h-7 text-xs gap-1 text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20">
                      <Timer className="h-3 w-3" />
                      End Early
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setModifyOpen(true)} className="h-7 text-xs gap-1 text-violet-600 border-violet-200 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-900/20">
                    <Pencil className="h-3 w-3" />
                    Modify
                  </Button>
                  {!isPast && (
                    <Button size="sm" variant="outline" onClick={() => setExtendOpen(true)} className="h-7 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20">
                      <ArrowRight className="h-3 w-3" />
                      Extend
                    </Button>
                  )}
                </div>
              )}
            </div>
            {!isPast && booking.status !== "CANCELLED" && onCancel && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                disabled={isCancelling}
                className="flex-shrink-0 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      </motion.div>

      <ExtendDialog
        open={extendOpen}
        onClose={() => setExtendOpen(false)}
        booking={booking}
        onExtend={(newEndTime) => extendMutation.mutate({ id: booking.id, endTime: newEndTime })}
        isPending={extendMutation.isPending}
      />

      <ModifyDialog
        open={modifyOpen}
        onClose={() => setModifyOpen(false)}
        booking={booking}
        rooms={rooms}
      />
    </>
  );
}

function ExtendDialog({ open, onClose, booking, onExtend, isPending }: {
  open: boolean;
  onClose: () => void;
  booking: BookingData;
  onExtend: (newEndTime: string) => void;
  isPending: boolean;
}) {
  const [extendMinutes, setExtendMinutes] = useState(30);

  const handleExtend = () => {
    const currentEnd = new Date(booking.endTime);
    const newEnd = new Date(currentEnd.getTime() + extendMinutes * 60 * 1000);
    onExtend(newEnd.toISOString());
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <DialogTitle>Extend Meeting</DialogTitle>
          <DialogDescription>Extend &quot;{booking.title}&quot; at {booking.room.name}</DialogDescription>
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
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                extendMinutes === min
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              +{min}m
            </button>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleExtend} disabled={isPending} className="flex-1">
            {isPending ? "Extending..." : "Confirm Extension"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function ModifyDialog({ open, onClose, booking, rooms }: {
  open: boolean;
  onClose: () => void;
  booking: BookingData;
  rooms: RoomData[];
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(booking.title);
  const [description, setDescription] = useState(booking.description || "");
  const [selectedRoomId, setSelectedRoomId] = useState(booking.roomId || booking.room.id);
  const [participantCount, setParticipantCount] = useState(booking.participantCount);
  const [dateStr, setDateStr] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(booking.title);
      setDescription(booking.description || "");
      setSelectedRoomId(booking.roomId || booking.room.id);
      setParticipantCount(booking.participantCount);
      const wibStart = toZonedTime(new Date(booking.startTime), "Asia/Jakarta");
      const wibEnd = toZonedTime(new Date(booking.endTime), "Asia/Jakarta");
      setDateStr(format(wibStart, "yyyy-MM-dd"));
      setStartTimeStr(format(wibStart, "HH:mm"));
      setEndTimeStr(format(wibEnd, "HH:mm"));
    }
  }, [open, booking]);

  const modifyMutation = useMutation({
    mutationFn: (data: { bookingId: string; payload: Parameters<typeof modifyBooking>[1] }) =>
      modifyBooking(data.bookingId, data.payload),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Booking modified successfully!");
        queryClient.invalidateQueries({ queryKey: ["myBookings"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        onClose();
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
      payload: {
        title,
        description,
        roomId: selectedRoomId,
        startTime: startUtc.toISOString(),
        endTime: endUtc.toISOString(),
        participantCount,
      },
    });
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <Dialog open={open} onClose={onClose} preventBackdropClose>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <DialogTitle>Modify Booking</DialogTitle>
          <DialogDescription>Reschedule or change details for this booking</DialogDescription>
        </div>

        <div className="space-y-3">
          <Input
            label="Meeting Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Room</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white/80 px-4 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
            >
              {rooms.filter((r) => r.canBook).map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.capacity} people) {room.category === "SPECIAL" ? "★" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Date</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white/80 px-4 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Start (WIB)</label>
              <input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                min="07:00"
                max="21:00"
                step="300"
                className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">End (WIB)</label>
              <input
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                min="07:00"
                max="21:00"
                step="300"
                className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Participants</label>
            <input
              type="number"
              min={1}
              max={selectedRoom?.capacity || 50}
              value={participantCount}
              onChange={(e) => setParticipantCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex h-11 w-24 rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-center backdrop-blur-sm transition-all duration-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description (Optional)</label>
            <textarea
              className="flex min-h-[60px] w-full rounded-xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm backdrop-blur-sm transition-all duration-200 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
              placeholder="Meeting agenda or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={modifyMutation.isPending || !title} className="flex-1">
            {modifyMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
