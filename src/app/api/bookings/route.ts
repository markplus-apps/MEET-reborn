import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { TIMEZONE } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const dateStr = searchParams.get("date");
  const roomId = searchParams.get("roomId");
  const myBookings = searchParams.get("my");

  const where: Record<string, unknown> = {
    status: { not: "CANCELLED" },
  };

  if (myBookings === "true") {
    where.userId = session.user.id;
  }

  if (roomId) {
    where.roomId = roomId;
  }

  if (dateStr) {
    const date = new Date(dateStr);
    const wibDate = toZonedTime(date, TIMEZONE);
    const dayStart = fromZonedTime(startOfDay(wibDate), TIMEZONE);
    const dayEnd = fromZonedTime(endOfDay(wibDate), TIMEZONE);
    where.startTime = { lt: dayEnd };
    where.endTime = { gt: dayStart };
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      room: true,
      user: { select: { id: true, name: true, email: true, role: true } },
      lastModifiedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(bookings);
}
