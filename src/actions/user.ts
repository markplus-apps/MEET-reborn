"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userRole = (session.user as { role: string }).role;
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    return { error: "Only admins can manage users" };
  }
  return { userId: session.user.id, role: userRole };
}

export async function getUsers() {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

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

  return { users };
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN";
}) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  if (!data.name || !data.email || !data.password) {
    return { error: "All fields are required" };
  }
  if (data.password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return { error: "Email already registered" };

  if (data.role === "SUPER_ADMIN" && check.role !== "SUPER_ADMIN") {
    return { error: "Only Super Admin can create Super Admin users" };
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);
  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
    },
  });

  return { success: true };
}

export async function updateUser(
  userId: string,
  data: { name?: string; email?: string; role?: "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN"; password?: string }
) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  if (data.role === "SUPER_ADMIN" && check.role !== "SUPER_ADMIN") {
    return { error: "Only Super Admin can assign Super Admin role" };
  }
  if (user.role === "SUPER_ADMIN" && check.role !== "SUPER_ADMIN") {
    return { error: "Only Super Admin can edit Super Admin users" };
  }

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return { error: "Email already in use" };
  }

  const updateData: Record<string, unknown> = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.role) updateData.role = data.role;
  if (data.password && data.password.length >= 6) {
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  await prisma.user.update({ where: { id: userId }, data: updateData });
  return { success: true };
}

export async function deleteUser(userId: string) {
  const check = await requireAdmin();
  if ("error" in check) return { error: check.error };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  if (user.role === "SUPER_ADMIN") {
    return { error: "Cannot delete Super Admin users" };
  }

  if (userId === check.userId) {
    return { error: "Cannot delete your own account" };
  }

  await prisma.user.delete({ where: { id: userId } });
  return { success: true };
}

export async function updateProfile(data: {
  name?: string;
  avatar?: string;
  status?: string;
  bio?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const allowedGradients = [
    "bg-gradient-to-br from-violet-500 to-purple-600",
    "bg-gradient-to-br from-blue-500 to-cyan-500",
    "bg-gradient-to-br from-emerald-500 to-teal-500",
    "bg-gradient-to-br from-orange-500 to-amber-500",
    "bg-gradient-to-br from-pink-500 to-rose-500",
    "bg-gradient-to-br from-indigo-500 to-blue-600",
  ];

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.slice(0, 100);
  if (data.avatar !== undefined) {
    if (data.avatar === "" || data.avatar.startsWith("/uploads/avatars/") || allowedGradients.includes(data.avatar)) {
      updateData.avatar = data.avatar;
    }
  }
  if (data.status !== undefined) updateData.status = data.status.slice(0, 60);
  if (data.bio !== undefined) updateData.bio = data.bio.slice(0, 200);

  await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  });

  return { success: true };
}

export async function getProfile() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      status: true,
      bio: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
  });

  return { user };
}
