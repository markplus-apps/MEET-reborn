"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, X, CalendarCheck } from "lucide-react";
import { formatWIB } from "@/lib/timezone";
import { cancelBooking } from "@/actions/booking";
import { toast } from "sonner";

export default function SchedulePage() {
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["myBookings"],
    queryFn: async () => {
      const res = await fetch("/api/bookings?my=true");
      return res.json();
    },
    refetchInterval: 60000,
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
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">My Schedule</h1>
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
                  {upcoming.map((booking: { id: string; title: string; description?: string; startTime: string; endTime: string; status: string; room: { name: string; category: string } }, i: number) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      index={i}
                      onCancel={() => cancelMutation.mutate(booking.id)}
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
                {past.slice(0, 10).map((booking: { id: string; title: string; description?: string; startTime: string; endTime: string; status: string; room: { name: string; category: string } }, i: number) => (
                  <BookingCard key={booking.id} booking={booking} index={i} isPast />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  index,
  onCancel,
  isCancelling,
  isPast,
}: {
  booking: { id: string; title: string; description?: string; startTime: string; endTime: string; status: string; room: { name: string; category: string } };
  index: number;
  onCancel?: () => void;
  isCancelling?: boolean;
  isPast?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card glass className={isPast ? "opacity-60" : ""}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{booking.title}</h3>
              <Badge
                variant={
                  booking.status === "CONFIRMED" ? "success" :
                  booking.status === "CANCELLED" ? "destructive" : "warning"
                }
              >
                {booking.status}
              </Badge>
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
            </div>
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
  );
}
