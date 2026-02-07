"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendBookingEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/book");
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function createBooking(data: {
  roomId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  participantCount?: number;
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

  const participantCount = data.participantCount || 1;
  if (participantCount > room.capacity) {
    return { error: `Participant count (${participantCount}) exceeds room capacity (${room.capacity})` };
  }

  const booking = await prisma.booking.create({
    data: {
      title: data.title,
      description: data.description,
      startTime,
      endTime,
      participantCount,
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

  revalidateAll();
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

  revalidateAll();
  return { success: true };
}

export async function extendBooking(bookingId: string, newEndTime: string) {
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

  if (booking.userId !== session.user.id) {
    const userRole = (session.user as { role: string }).role;
    if (userRole === "EMPLOYEE") {
      return { error: "You can only modify your own bookings" };
    }
  }

  if (booking.status === "CANCELLED") {
    return { error: "Cannot modify a cancelled booking" };
  }

  const endTime = new Date(newEndTime);
  if (endTime <= booking.endTime) {
    return { error: "New end time must be after current end time" };
  }

  const conflicting = await prisma.booking.findFirst({
    where: {
      id: { not: bookingId },
      roomId: booking.roomId,
      status: { not: "CANCELLED" },
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: booking.endTime } },
      ],
    },
  });

  if (conflicting) {
    return { error: "Cannot extend - the time slot is already booked by someone else." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { endTime },
  });

  revalidateAll();
  return { success: true };
}

export async function endBookingEarly(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    return { error: "Booking not found" };
  }

  if (booking.userId !== session.user.id) {
    const userRole = (session.user as { role: string }).role;
    if (userRole === "EMPLOYEE") {
      return { error: "You can only modify your own bookings" };
    }
  }

  const now = new Date();
  if (now < booking.startTime || now >= booking.endTime) {
    return { error: "Can only end a meeting early while it is in progress" };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { endTime: now },
  });

  revalidateAll();
  return { success: true };
}

export async function checkInBooking(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    return { error: "Booking not found" };
  }

  if (booking.userId !== session.user.id) {
    return { error: "You can only check in to your own bookings" };
  }

  if (booking.checkInStatus !== "PENDING") {
    return { error: "Already checked in or missed" };
  }

  const now = new Date();
  const fifteenMinBefore = new Date(booking.startTime.getTime() - 15 * 60 * 1000);
  const fifteenMinAfter = new Date(booking.startTime.getTime() + 15 * 60 * 1000);

  if (now < fifteenMinBefore || now > fifteenMinAfter) {
    return { error: "Check-in is only available 15 minutes before/after the meeting start time" };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { checkInStatus: "CHECKED_IN" },
  });

  revalidateAll();
  return { success: true };
}
