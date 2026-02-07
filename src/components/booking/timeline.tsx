"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatWIB } from "@/lib/timezone";

interface TimeSlot {
  start: Date;
  end: Date;
  label: string;
}

interface Booking {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  user: { name: string };
  status: string;
}

interface TimelineProps {
  slots: TimeSlot[];
  bookings: Booking[];
  onSlotClick: (start: Date, end: Date) => void;
  selectedStart?: Date | null;
  selectedEnd?: Date | null;
}

export function Timeline({ slots, bookings, onSlotClick, selectedStart, selectedEnd }: TimelineProps) {
  const slotStatuses = useMemo(() => {
    return slots.map((slot) => {
      const booked = bookings.find((b) => {
        if (b.status === "CANCELLED") return false;
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        return bStart < slot.end && bEnd > slot.start;
      });

      const isSelected =
        selectedStart && selectedEnd
          ? slot.start >= selectedStart && slot.end <= selectedEnd
          : selectedStart
            ? slot.start.getTime() === selectedStart.getTime()
            : false;

      return {
        ...slot,
        booked,
        isSelected,
        isPast: slot.end < new Date(),
      };
    });
  }, [slots, bookings, selectedStart, selectedEnd]);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-emerald-400" />
          <span className="text-zinc-500">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-red-400" />
          <span className="text-zinc-500">Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-violet-400" />
          <span className="text-zinc-500">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-zinc-200" />
          <span className="text-zinc-500">Past</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200/60 bg-white dark:border-zinc-700/60 dark:bg-zinc-900">
        <div className="flex min-w-max">
          {slotStatuses.map((slot, i) => (
            <motion.button
              key={i}
              whileHover={!slot.booked && !slot.isPast ? { scale: 1.05, y: -2 } : {}}
              whileTap={!slot.booked && !slot.isPast ? { scale: 0.95 } : {}}
              onClick={() => {
                if (!slot.booked && !slot.isPast) {
                  onSlotClick(slot.start, slot.end);
                }
              }}
              disabled={!!slot.booked || slot.isPast}
              className={cn(
                "group relative flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center border-r border-zinc-100 transition-all duration-200 last:border-r-0 dark:border-zinc-800",
                slot.isPast && "bg-zinc-100 dark:bg-zinc-800/50",
                slot.booked && "bg-red-50 dark:bg-red-900/20",
                !slot.booked && !slot.isPast && "cursor-pointer bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20",
                slot.isSelected && "!bg-violet-100 ring-2 ring-inset ring-violet-500 dark:!bg-violet-900/30"
              )}
            >
              <span className={cn(
                "text-xs font-semibold",
                slot.isPast && "text-zinc-300 dark:text-zinc-600",
                slot.booked && "text-red-400",
                !slot.booked && !slot.isPast && "text-emerald-600 dark:text-emerald-400",
                slot.isSelected && "!text-violet-600 dark:!text-violet-400"
              )}>
                {slot.label}
              </span>
              {slot.booked && (
                <span className="mt-1 max-w-[72px] truncate text-[10px] text-red-400">
                  {slot.booked.user.name}
                </span>
              )}
              {!slot.booked && !slot.isPast && !slot.isSelected && (
                <span className="mt-1 text-[10px] text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100">
                  Click to book
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
