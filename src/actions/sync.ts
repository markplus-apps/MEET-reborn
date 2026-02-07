"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function syncFromGoogleSheet() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const userRole = (session.user as { role: string }).role;
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    return { error: "Only admins can sync from Google Sheets" };
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!sheetId || !clientEmail || !privateKey) {
    return { error: "Google Sheets credentials not configured. Please add GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY to your secrets." };
  }

  let rows: string[][] = [];

  try {
    const { google } = await import("googleapis");

    const authClient = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth: authClient });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Sheet1!A2:O",
    });

    rows = (response.data.values || []) as string[][];
  } catch (error: unknown) {
    console.error("Google Sheets API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: `Failed to connect to Google Sheets: ${message}` };
  }

  if (rows.length === 0) {
    return { success: true, synced: 0, skipped: 0, errors: 0, totalRows: 0 };
  }

  const allRooms = await prisma.room.findMany();

  function findRoom(name: string) {
    if (!name) return null;
    const normalized = name.trim().toLowerCase();
    return allRooms.find((r) => {
      const rName = r.name.toLowerCase();
      return rName === normalized || rName.includes(normalized) || normalized.includes(rName);
    }) || null;
  }

  let synced = 0;
  let skipped = 0;
  let errors = 0;
  const CHUNK_SIZE = 50;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    try {
      await prisma.$transaction(async (tx) => {
        for (const row of chunk) {
          const rowId = row[0];
          const roomName = row[1];
          const userEmail = row[3];
          const startTimeUtc = row[5];
          const endTimeUtc = row[6];
          const participantsStr = row[7];
          const statusStr = row[8];

          if (!roomName || !startTimeUtc || !endTimeUtc) {
            skipped++;
            continue;
          }

          const room = findRoom(roomName);
          if (!room) {
            skipped++;
            continue;
          }

          const email = (userEmail || "").trim().toLowerCase();
          if (!email) {
            skipped++;
            continue;
          }

          let user = await tx.user.findFirst({
            where: { email },
          });

          if (!user) {
            skipped++;
            continue;
          }

          const sheetRowId = rowId ? `sheet_${rowId}` : `sheet_${roomName}_${startTimeUtc}`.replace(/[^a-zA-Z0-9_-]/g, "_");

          const existing = await tx.booking.findFirst({
            where: { googleSheetRowId: sheetRowId },
          });

          if (existing) {
            skipped++;
            continue;
          }

          const parsedStart = new Date(startTimeUtc);
          const parsedEnd = new Date(endTimeUtc);

          if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
            errors++;
            continue;
          }

          let status: "CONFIRMED" | "CANCELLED" = "CONFIRMED";
          if (statusStr) {
            const s = statusStr.trim().toLowerCase();
            if (s === "cancelled" || s === "canceled") {
              status = "CANCELLED";
            }
          }

          const participants = parseInt(participantsStr) || 1;

          await tx.booking.create({
            data: {
              title: `Meeting - ${room.name}`,
              startTime: parsedStart,
              endTime: parsedEnd,
              roomId: room.id,
              userId: user.id,
              status,
              participantCount: Math.min(participants, room.capacity),
              googleSheetRowId: sheetRowId,
            },
          });

          synced++;
        }
      }, { timeout: 30000 });
    } catch (err: unknown) {
      console.error(`Chunk sync error (rows ${i}-${i + chunk.length}):`, err);
      errors += chunk.length;
    }
  }

  return {
    success: true,
    synced,
    skipped,
    errors,
    totalRows: rows.length,
  };
}
