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
      range: "Sheet1!A2:H",
    });

    const rows = response.data.values || [];
    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
      const [title, roomName, startTime, endTime, userName, userEmail, description, participantCount] = row;

      if (!title || !roomName || !startTime || !endTime) {
        skipped++;
        continue;
      }

      try {
        const room = await prisma.room.findFirst({
          where: { name: { contains: roomName, mode: "insensitive" } },
        });

        if (!room) {
          skipped++;
          continue;
        }

        let user = await prisma.user.findFirst({
          where: { email: userEmail?.toLowerCase() || "" },
        });

        if (!user) {
          skipped++;
          continue;
        }

        const rowId = `sheet_${title}_${startTime}_${roomName}`.replace(/[^a-zA-Z0-9_-]/g, "_");

        const existing = await prisma.booking.findFirst({
          where: { googleSheetRowId: rowId },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.booking.create({
          data: {
            title,
            description: description || undefined,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            roomId: room.id,
            userId: user.id,
            status: "CONFIRMED",
            participantCount: parseInt(participantCount) || 1,
            googleSheetRowId: rowId,
          },
        });

        synced++;
      } catch (err) {
        errors++;
        console.error("Row sync error:", err);
      }
    }

    return {
      success: true,
      synced,
      skipped,
      errors,
      totalRows: rows.length,
    };
  } catch (error) {
    console.error("Google Sheets sync error:", error);
    return { error: "Failed to connect to Google Sheets. Please check your credentials." };
  }
}
