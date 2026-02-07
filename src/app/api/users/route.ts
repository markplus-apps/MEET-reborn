import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role: string }).role;
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      status: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}
