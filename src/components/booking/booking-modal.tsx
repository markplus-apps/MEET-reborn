"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createBooking } from "@/actions/booking";
import { formatWIB } from "@/lib/timezone";
import { toast } from "sonner";
import { Clock, MapPin, Users, UserPlus, X } from "lucide-react";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { useIsMobile } from "@/hooks/use-media-query";
import { Drawer } from "vaul";
import { motion, AnimatePresence } from "framer-motion";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  room: {
    id: string;
    name: string;
    category: string;
    capacity: number;
    facilities: string[];
  } | null;
  startTime: Date | null;
  endTime: Date | null;
  onStartTimeChange?: (date: Date) => void;
  onEndTimeChange?: (date: Date) => void;
  onSuccess: () => void;
}

function BookingFormContent({ room, startTime, endTime, onStartTimeChange, onEndTimeChange, onClose, onSuccess }: Omit<BookingModalProps, "open">) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [participantCount, setParticipantCount] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");

  useEffect(() => {
    if (startTime) {
      setStartTimeStr(formatWIB(startTime, "HH:mm"));
    }
    if (endTime) {
      setEndTimeStr(formatWIB(endTime, "HH:mm"));
    }
  }, [startTime, endTime]);

  const handleTimeChange = (type: "start" | "end", value: string) => {
    if (!startTime) return;
    const [hours, minutes] = value.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;

    const zonedBase = toZonedTime(startTime, "Asia/Jakarta");
    zonedBase.setHours(hours, minutes, 0, 0);
    const utcDate = fromZonedTime(zonedBase, "Asia/Jakarta");

    if (type === "start") {
      setStartTimeStr(value);
      onStartTimeChange?.(utcDate);
    } else {
      setEndTimeStr(value);
      onEndTimeChange?.(utcDate);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !startTime || !endTime || !title) return;

    startTransition(async () => {
      const result = await createBooking({
        roomId: room.id,
        title,
        description: description || undefined,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        participantCount,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Booking confirmed!", {
          description: `${room.name} - ${formatWIB(startTime, "HH:mm")} to ${formatWIB(endTime, "HH:mm")} WIB`,
        });
        setTitle("");
        setDescription("");
        setParticipantCount(1);
        onClose();
        onSuccess();
      }
    });
  };

  if (!room || !startTime || !endTime) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Book Meeting Room</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Create a new booking for {room.name}</p>
      </div>

      <div className="space-y-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{room.name}</span>
          <Badge variant={room.category === "SPECIAL" ? "default" : "secondary"} className="ml-auto">
            {room.category}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-violet-500" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {formatWIB(startTime, "EEEE, dd MMM yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-500" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Capacity: {room.capacity} people</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Start Time (WIB)</label>
          <input
            type="time"
            value={startTimeStr}
            onChange={(e) => handleTimeChange("start", e.target.value)}
            min="07:00"
            max="21:00"
            step="300"
            className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">End Time (WIB)</label>
          <input
            type="time"
            value={endTimeStr}
            onChange={(e) => handleTimeChange("end", e.target.value)}
            min="07:00"
            max="21:00"
            step="300"
            className="flex h-11 w-full rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Input
          label="Meeting Title"
          placeholder="e.g. Product Review Q1 2025"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Participants</label>
          <div className="flex items-center gap-3">
            <UserPlus className="h-4 w-4 text-violet-500" />
            <input
              type="number"
              min={1}
              max={room.capacity}
              value={participantCount}
              onChange={(e) => setParticipantCount(Math.min(room.capacity, Math.max(1, parseInt(e.target.value) || 1)))}
              className="flex h-11 w-24 rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-center backdrop-blur-sm transition-all duration-200 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
            />
            <span className="text-xs text-zinc-400">/ {room.capacity} max</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description (Optional)</label>
          <textarea
            className="flex min-h-[80px] w-full rounded-xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm backdrop-blur-sm transition-all duration-200 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
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
        <Button type="submit" disabled={isPending || !title} className="flex-1">
          {isPending ? "Booking..." : "Confirm Booking"}
        </Button>
      </div>
    </form>
  );
}

function DesktopDialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-2xl dark:border-zinc-700/60 dark:bg-zinc-900 max-h-[85vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MobileDrawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Drawer.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex flex-col rounded-t-2xl border-t border-zinc-200/60 bg-white dark:border-zinc-700/60 dark:bg-zinc-900">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          <div className="max-h-[85vh] overflow-y-auto p-6">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function BookingModal(props: BookingModalProps) {
  const isMobile = useIsMobile();
  const { open, onClose, room, startTime, endTime } = props;

  if (!room || !startTime || !endTime) return null;

  const formContent = <BookingFormContent {...props} />;

  if (isMobile) {
    return <MobileDrawer open={open} onClose={onClose}>{formContent}</MobileDrawer>;
  }

  return <DesktopDialog open={open} onClose={onClose}>{formContent}</DesktopDialog>;
}
