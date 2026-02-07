"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getGoogleSheetsClient(): Promise<{
  sheets: any;
  sheetId: string;
} | { error: string }> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!sheetId || !clientEmail || !privateKey) {
    return { error: "Google Sheets credentials not configured. Please add GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY to your secrets." };
  }

  const { google } = await import("googleapis");
  const authClient = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth: authClient });
  return { sheets, sheetId };
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userRole = (session.user as { role: string }).role;
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    return { error: "Only admins can sync" };
  }
  return { userId: session.user.id };
}

export async function syncUsersFromGoogleSheet() {
  const adminCheck = await requireAdmin();
  if ("error" in adminCheck) return adminCheck;

  const clientResult = await getGoogleSheetsClient();
  if ("error" in clientResult) return clientResult;
  const { sheets, sheetId } = clientResult;

  let sheetRows: string[][] = [];
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "user!B2:F",
    });
    sheetRows = (response.data.values || []) as string[][];
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: `Failed to connect to Google Sheets: ${message}` };
  }

  const sheetEmails = new Set<string>();
  let created = 0, updated = 0, skipped = 0, errors = 0;
  let pushedToSheet = 0;

  for (const row of sheetRows) {
    try {
      const name = (row[0] || "").trim();
      const email = (row[1] || "").trim().toLowerCase();
      const roleStr = (row[2] || "").trim().toUpperCase();
      const password = (row[3] || "").trim();

      if (!name || !email) { skipped++; continue; }
      sheetEmails.add(email);

      let role: "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN" = "EMPLOYEE";
      if (roleStr === "ADMIN") role = "ADMIN";
      else if (roleStr === "SUPER_ADMIN") role = "SUPER_ADMIN";

      const hashedPassword = password ? await bcrypt.hash(password, 8) : undefined;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        await prisma.user.update({
          where: { email },
          data: { name, role, ...(hashedPassword ? { password: hashedPassword } : {}) },
        });
        updated++;
      } else {
        if (!hashedPassword) { skipped++; continue; }
        await prisma.user.create({ data: { name, email, role, password: hashedPassword } });
        created++;
      }
    } catch (err: unknown) {
      console.error("User sync error:", err);
      errors++;
    }
  }

  try {
    const dbUsers = await prisma.user.findMany({
      select: { name: true, email: true, role: true, createdAt: true },
    });

    const newUsers = dbUsers.filter((u) => !sheetEmails.has(u.email.toLowerCase()));

    if (newUsers.length > 0) {
      const rowsToAppend = newUsers.map((u) => [
        u.name,
        u.email,
        u.role.toLowerCase(),
        "",
        u.createdAt.toISOString(),
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "user!B:F",
        valueInputOption: "RAW",
        requestBody: { values: rowsToAppend },
      });
      pushedToSheet = newUsers.length;
    }
  } catch (err: unknown) {
    console.error("Push users to sheet error:", err);
  }

  return {
    success: true,
    created,
    updated,
    skipped,
    errors,
    pushedToSheet,
    totalRows: sheetRows.length,
  };
}

export async function syncFromGoogleSheet() {
  const adminCheck = await requireAdmin();
  if ("error" in adminCheck) return adminCheck;

  const clientResult = await getGoogleSheetsClient();
  if ("error" in clientResult) return clientResult;
  const { sheets, sheetId } = clientResult;

  let sheetRows: string[][] = [];
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "meets!A2:O",
    });
    sheetRows = (response.data.values || []) as string[][];
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: `Failed to connect to Google Sheets: ${message}` };
  }

  if (sheetRows.length === 0) {
    return { success: true, synced: 0, skipped: 0, errors: 0, totalRows: 0, pushedToSheet: 0 };
  }

  const allRooms = await prisma.room.findMany();
  const roomMap = new Map<string, typeof allRooms[0]>();
  for (const room of allRooms) {
    roomMap.set(room.name.toLowerCase(), room);
  }

  function findRoom(name: string) {
    if (!name) return null;
    const normalized = name.trim().toLowerCase();
    const exact = roomMap.get(normalized);
    if (exact) return exact;
    for (const room of allRooms) {
      const rName = room.name.toLowerCase();
      if (rName.includes(normalized) || normalized.includes(rName)) return room;
    }
    return null;
  }

  const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });
  const userEmailMap = new Map<string, string>();
  for (const u of allUsers) {
    userEmailMap.set(u.email.toLowerCase(), u.id);
  }

  const existingSheetIds = await prisma.booking.findMany({
    where: { googleSheetRowId: { not: null } },
    select: { googleSheetRowId: true },
  });
  const existingIdSet = new Set(existingSheetIds.map((b) => b.googleSheetRowId));

  let synced = 0, skipped = 0, errors = 0;
  let pushedToSheet = 0;

  const CHUNK_SIZE = 200;
  for (let i = 0; i < sheetRows.length; i += CHUNK_SIZE) {
    const chunk = sheetRows.slice(i, i + CHUNK_SIZE);
    const bookingsToCreate: {
      title: string;
      startTime: Date;
      endTime: Date;
      roomId: string;
      userId: string;
      status: "CONFIRMED" | "CANCELLED";
      participantCount: number;
      googleSheetRowId: string;
      description?: string;
    }[] = [];

    for (const row of chunk) {
      const rowId = (row[0] || "").trim();
      const roomName = (row[1] || "").trim();
      const userEmail = (row[3] || "").trim().toLowerCase();
      const title = (row[4] || "").trim();
      const startTimeUtc = (row[5] || "").trim();
      const endTimeUtc = (row[6] || "").trim();
      const participantsStr = (row[7] || "").trim();
      const statusStr = (row[8] || "").trim();
      const notes = (row[9] || "").trim();

      if (!roomName || !startTimeUtc || !endTimeUtc) { skipped++; continue; }

      const room = findRoom(roomName);
      if (!room) { skipped++; continue; }

      const userId = userEmailMap.get(userEmail);
      if (!userId) { skipped++; continue; }

      const sheetRowId = rowId ? `sheet_${rowId}` : `sheet_${roomName}_${startTimeUtc}`.replace(/[^a-zA-Z0-9_-]/g, "_");

      if (existingIdSet.has(sheetRowId)) { skipped++; continue; }

      const parsedStart = new Date(startTimeUtc);
      const parsedEnd = new Date(endTimeUtc);
      if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) { errors++; continue; }

      let status: "CONFIRMED" | "CANCELLED" = "CONFIRMED";
      if (statusStr) {
        const s = statusStr.toLowerCase();
        if (s === "cancelled" || s === "canceled") status = "CANCELLED";
      }

      const participants = parseInt(participantsStr) || 1;

      bookingsToCreate.push({
        title: title || `Meeting - ${room.name}`,
        startTime: parsedStart,
        endTime: parsedEnd,
        roomId: room.id,
        userId,
        status,
        participantCount: Math.min(participants, room.capacity),
        googleSheetRowId: sheetRowId,
        description: notes || undefined,
      });
    }

    if (bookingsToCreate.length > 0) {
      try {
        const result = await prisma.booking.createMany({
          data: bookingsToCreate,
          skipDuplicates: true,
        });
        synced += result.count;
      } catch (err: unknown) {
        console.error(`Chunk error (rows ${i}-${i + chunk.length}):`, err);
        errors += bookingsToCreate.length;
      }
    }
  }

  try {
    const newBookings = await prisma.booking.findMany({
      where: { googleSheetRowId: null },
      include: { room: true, user: true },
      orderBy: { createdAt: "asc" },
    });

    if (newBookings.length > 0) {
      const roomNameMap = new Map<string, string>();
      for (const room of allRooms) {
        roomNameMap.set(room.id, room.name);
      }

      const allUsersForPush = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
      const userIdMap = new Map<string, { name: string; email: string }>();
      for (const u of allUsersForPush) {
        userIdMap.set(u.id, { name: u.name, email: u.email });
      }

      const rowsToAppend = newBookings.map((b) => {
        const user = userIdMap.get(b.userId);
        const uniqueId = b.id.slice(-8) + Date.now().toString().slice(-6);
        return [
          uniqueId,
          roomNameMap.get(b.roomId) || "",
          user?.name || "",
          user?.email || "",
          b.title,
          b.startTime.toISOString(),
          b.endTime.toISOString(),
          String(b.participantCount),
          b.status.toLowerCase(),
          b.description || "",
          b.createdAt.toISOString(),
        ];
      });

      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "meets!A:K",
        valueInputOption: "RAW",
        requestBody: { values: rowsToAppend },
      });

      for (let idx = 0; idx < newBookings.length; idx++) {
        await prisma.booking.update({
          where: { id: newBookings[idx].id },
          data: { googleSheetRowId: `sheet_${rowsToAppend[idx][0]}` },
        });
      }

      pushedToSheet = newBookings.length;
    }
  } catch (err: unknown) {
    console.error("Push bookings to sheet error:", err);
  }

  return {
    success: true,
    synced,
    skipped,
    errors,
    totalRows: sheetRows.length,
    pushedToSheet,
  };
}
