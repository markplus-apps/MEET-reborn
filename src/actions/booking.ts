"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendBookingEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

export async function createBooking(data: {
  roomId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const room = await prisma.room.findUnique({
    where: { id: data.roomId },
  });

  if (!room || !room.isActive) {
    return { error: "Room not found or inactive" };
  }

  const userRole = (session.user as { role: string }).role;
  if (room.category === "SPECIAL" && userRole === "EMPLOYEE") {
    return { error: "You don't have permission to book special rooms. Contact an admin." };
  }

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (startTime >= endTime) {
    return { error: "End time must be after start time" };
  }

  if (startTime < new Date()) {
    return { error: "Cannot book in the past" };
  }

  const conflicting = await prisma.booking.findFirst({
    where: {
      roomId: data.roomId,
      status: { not: "CANCELLED" },
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
  });

  if (conflicting) {
    return { error: "This time slot is already booked. Please choose another time." };
  }

  const booking = await prisma.booking.create({
    data: {
      title: data.title,
      description: data.description,
      startTime,
      endTime,
      roomId: data.roomId,
      userId: session.user.id,
      status: "CONFIRMED",
    },
    include: {
      room: true,
      user: true,
    },
  });

  sendBookingEmail({
    userName: booking.user.name,
    userEmail: booking.user.email,
    roomName: booking.room.name,
    title: booking.title,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: "CONFIRMED",
  }).catch(console.error);

  revalidatePath("/book");
  revalidatePath("/schedule");
  revalidatePath("/dashboard");

  return { success: true, booking };
}

export async function cancelBooking(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true, user: true },
  });

  if (!booking) {
    return { error: "Booking not found" };
  }

  const userRole = (session.user as { role: string }).role;
  if (booking.userId !== session.user.id && userRole === "EMPLOYEE") {
    return { error: "You can only cancel your own bookings" };
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
    include: { room: true, user: true },
  });

  sendBookingEmail({
    userName: updated.user.name,
    userEmail: updated.user.email,
    roomName: updated.room.name,
    title: updated.title,
    startTime: updated.startTime,
    endTime: updated.endTime,
    status: "CANCELLED",
  }).catch(console.error);

  revalidatePath("/book");
  revalidatePath("/schedule");
  revalidatePath("/dashboard");

  return { success: true };
}
