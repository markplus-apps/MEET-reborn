import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const employeePassword = await bcrypt.hash("employee123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@markplus.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@markplus.com",
      password: adminPassword,
      role: "SUPER_ADMIN",
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "manager@markplus.com" },
    update: {},
    create: {
      name: "Admin Manager",
      email: "manager@markplus.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@markplus.com" },
    update: {},
    create: {
      name: "John Employee",
      email: "employee@markplus.com",
      password: employeePassword,
      role: "EMPLOYEE",
    },
  });

  console.log("Users created:", { admin: admin.email, adminUser: adminUser.email, employee: employee.email });

  const publicRooms = [
    { name: "Meet 1", capacity: 30, facilities: ["Projector", "Whiteboard"] },
    { name: "Meet 2", capacity: 6, facilities: ["Whiteboard"] },
    { name: "Meet 3", capacity: 6, facilities: ["Monitor", "Whiteboard"] },
    { name: "Meet 4", capacity: 8, facilities: ["Monitor", "Whiteboard"] },
    { name: "Meet 5", capacity: 8, facilities: ["Whiteboard"] },
    { name: "Meet 6", capacity: 8, facilities: ["Whiteboard"] },
    { name: "Meet 7", capacity: 8, facilities: ["Monitor", "Whiteboard"] },
  ];

  const specialRooms = [
    { name: "Philip Kotler Classroom", capacity: 150, facilities: ["Projector", "Large Whiteboard", "Sound System"] },
    { name: "MarkPlus Gallery", capacity: 100, facilities: ["Projector", "Whiteboard", "Sound System"] },
    { name: "Museum of Marketing", capacity: 50, facilities: ["Projector", "Large Whiteboard", "Sound System"] },
  ];

  for (const room of publicRooms) {
    const id = `public-${room.name.toLowerCase().replace(/\s+/g, "-")}`;
    await prisma.room.upsert({
      where: { id },
      update: {
        capacity: room.capacity,
        facilities: room.facilities,
      },
      create: {
        id,
        name: room.name,
        category: "PUBLIC",
        capacity: room.capacity,
        facilities: room.facilities,
        isActive: true,
      },
    });
  }

  for (const room of specialRooms) {
    const id = `special-${room.name.toLowerCase().replace(/\s+/g, "-")}`;
    await prisma.room.upsert({
      where: { id },
      update: {
        capacity: room.capacity,
        facilities: room.facilities,
      },
      create: {
        id,
        name: room.name,
        category: "SPECIAL",
        capacity: room.capacity,
        facilities: room.facilities,
        isActive: true,
      },
    });
  }

  console.log("Created/Updated 7 PUBLIC rooms and 3 SPECIAL rooms");
  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
