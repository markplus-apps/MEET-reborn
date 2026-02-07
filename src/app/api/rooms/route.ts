import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role: string }).role;

  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const roomsWithAccess = rooms.map((room) => ({
    ...room,
    canBook: room.category === "PUBLIC" || userRole !== "EMPLOYEE",
  }));

  return NextResponse.json(roomsWithAccess);
}
