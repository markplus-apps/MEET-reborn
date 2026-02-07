import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role: string }).role;
  const now = new Date();

  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      bookings: {
        where: {
          status: { not: "CANCELLED" },
          startTime: { lte: now },
          endTime: { gte: now },
        },
        include: {
          user: { select: { name: true } },
        },
        take: 1,
      },
    },
  });

  const roomsWithAccess = rooms.map((room) => {
    const currentBooking = room.bookings[0] || null;
    return {
      id: room.id,
      name: room.name,
      category: room.category,
      capacity: room.capacity,
      facilities: room.facilities,
      imageUrl: room.imageUrl,
      isActive: room.isActive,
      canBook: room.category === "PUBLIC" || userRole !== "EMPLOYEE",
      isOccupied: !!currentBooking,
      currentMeeting: currentBooking ? {
        title: currentBooking.title,
        user: currentBooking.user.name,
        endTime: currentBooking.endTime.toISOString(),
      } : null,
    };
  });

  return NextResponse.json(roomsWithAccess);
}
