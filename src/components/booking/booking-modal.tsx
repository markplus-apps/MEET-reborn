"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createBooking } from "@/actions/booking";
import { formatWIB } from "@/lib/timezone";
import { toast } from "sonner";
import { Clock, MapPin, Users } from "lucide-react";

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
  onSuccess: () => void;
}

export function BookingModal({ open, onClose, room, startTime, endTime, onSuccess }: BookingModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

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
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Booking confirmed!", {
          description: `${room.name} - ${formatWIB(startTime, "HH:mm")} to ${formatWIB(endTime, "HH:mm")} WIB`,
        });
        setTitle("");
        setDescription("");
        onClose();
        onSuccess();
      }
    });
  };

  if (!room || !startTime || !endTime) return null;

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <DialogTitle>Book Meeting Room</DialogTitle>
          <DialogDescription>Create a new booking for {room.name}</DialogDescription>
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
              {formatWIB(startTime, "EEEE, dd MMM yyyy")} • {formatWIB(startTime, "HH:mm")} - {formatWIB(endTime, "HH:mm")} WIB
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-500" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Capacity: {room.capacity} people</span>
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
    </Dialog>
  );
}
