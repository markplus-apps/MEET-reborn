import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { TIMEZONE, formatWIB } from "@/lib/timezone";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const wibNow = toZonedTime(now, TIMEZONE);
  const thirtyDaysAgo = fromZonedTime(startOfDay(subDays(wibNow, 30)), TIMEZONE);

  const [bookings, rooms] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: { not: "CANCELLED" },
        startTime: { gte: thirtyDaysAgo },
      },
      include: {
        room: { select: { name: true, category: true } },
        user: { select: { name: true } },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.room.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true },
    }),
  ]);

  const roomUsage = rooms.map((room) => {
    const roomBookings = bookings.filter((b) => b.roomId === room.id);
    const totalHours = roomBookings.reduce((acc, b) => {
      return acc + (b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60 * 60);
    }, 0);
    return {
      name: room.name,
      category: room.category,
      bookings: roomBookings.length,
      hours: Math.round(totalHours * 10) / 10,
    };
  });

  const dailyBookings: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const day = subDays(wibNow, i);
    const key = formatWIB(fromZonedTime(day, TIMEZONE), "MM/dd");
    dailyBookings[key] = 0;
  }
  bookings.forEach((b) => {
    const key = formatWIB(b.startTime, "MM/dd");
    if (dailyBookings[key] !== undefined) {
      dailyBookings[key]++;
    }
  });

  const dailyData = Object.entries(dailyBookings).map(([date, count]) => ({
    date,
    bookings: count,
  }));

  const hourlyDistribution: Record<number, number> = {};
  for (let h = 7; h <= 20; h++) {
    hourlyDistribution[h] = 0;
  }
  bookings.forEach((b) => {
    const hour = parseInt(formatWIB(b.startTime, "H"));
    if (hourlyDistribution[hour] !== undefined) {
      hourlyDistribution[hour]++;
    }
  });

  const hourlyData = Object.entries(hourlyDistribution).map(([hour, count]) => ({
    hour: `${hour}:00`,
    bookings: count,
  }));

  const checkInStats = {
    total: bookings.length,
    checkedIn: bookings.filter((b) => b.checkInStatus === "CHECKED_IN").length,
    missed: bookings.filter((b) => b.checkInStatus === "MISSED").length,
    pending: bookings.filter((b) => b.checkInStatus === "PENDING").length,
  };

  return NextResponse.json({
    roomUsage,
    dailyData,
    hourlyData,
    checkInStats,
    totalBookings: bookings.length,
  });
}
