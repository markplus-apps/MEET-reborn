import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const filename = `avatar-${session.user.id}-${Date.now()}.${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  const avatarUrl = `/uploads/avatars/${filename}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatar: avatarUrl },
  });

  return NextResponse.json({ url: avatarUrl });
}
