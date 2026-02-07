"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Wifi, Monitor, Mic, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const facilityIcons: Record<string, React.ReactNode> = {
  WiFi: <Wifi className="h-3 w-3" />,
  Projector: <Monitor className="h-3 w-3" />,
  "Video Conference": <Monitor className="h-3 w-3" />,
  "Sound System": <Mic className="h-3 w-3" />,
};

export default function BookPage() {
  const { data: rooms, isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await fetch("/api/rooms");
      return res.json();
    },
  });

  const publicRooms = (rooms || []).filter((r: { category: string }) => r.category === "PUBLIC");
  const specialRooms = (rooms || []).filter((r: { category: string }) => r.category === "SPECIAL");

  return (
    <div className="space-y-6 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Book a Room</h1>
        <p className="text-sm text-zinc-500">Select a room to view availability and make a booking</p>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      ) : (
        <>
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-violet-500" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Public Rooms</h2>
              <Badge variant="secondary">{publicRooms.length}</Badge>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publicRooms.map((room: { id: string; name: string; category: string; capacity: number; facilities: string[]; canBook: boolean }, i: number) => (
                <RoomCard key={room.id} room={room} index={i} />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Special Rooms</h2>
              <Badge variant="warning">{specialRooms.length}</Badge>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {specialRooms.map((room: { id: string; name: string; category: string; capacity: number; facilities: string[]; canBook: boolean }, i: number) => (
                <RoomCard key={room.id} room={room} index={i} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RoomCard({ room, index }: { room: { id: string; name: string; category: string; capacity: number; facilities: string[]; canBook: boolean }; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card glass className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-xl",
        !room.canBook && "opacity-75"
      )}>
        <div className={cn(
          "absolute inset-x-0 top-0 h-1",
          room.category === "SPECIAL"
            ? "bg-gradient-to-r from-amber-400 to-orange-500"
            : "bg-gradient-to-r from-violet-500 to-purple-500"
        )} />

        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{room.name}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                <Users className="h-3.5 w-3.5" />
                <span>{room.capacity} people</span>
              </div>
            </div>
            <Badge variant={room.category === "SPECIAL" ? "warning" : "default"}>
              {room.category}
            </Badge>
          </div>

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
            <Link href={`/book/${room.id}`}>
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
