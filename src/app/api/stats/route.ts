import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { TIMEZONE } from "@/lib/timezone";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const wibNow = toZonedTime(now, TIMEZONE);
  const todayStart = fromZonedTime(startOfDay(wibNow), TIMEZONE);
  const todayEnd = fromZonedTime(endOfDay(wibNow), TIMEZONE);

  const [totalRooms, todayBookings, myBookings, activeBookings] = await Promise.all([
    prisma.room.count({ where: { isActive: true } }),
    prisma.booking.count({
      where: {
        status: { not: "CANCELLED" },
        startTime: { gte: todayStart },
        endTime: { lte: todayEnd },
      },
    }),
    prisma.booking.count({
      where: {
        userId: session.user.id,
        status: { not: "CANCELLED" },
        endTime: { gte: now },
      },
    }),
    prisma.booking.count({
      where: {
        status: { not: "CANCELLED" },
        startTime: { lte: now },
        endTime: { gte: now },
      },
    }),
  ]);

  return NextResponse.json({
    totalRooms,
    todayBookings,
    myBookings,
    activeBookings,
    availableRooms: totalRooms - activeBookings,
  });
}
