import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const publisherPasswordHash = await bcrypt.hash("buildappdemo", 10);
  const viewerPasswordHash = await bcrypt.hash("buildappdemo", 10);

  const team = [
    { name: "Rian Prakoso", email: "rian@northline.io" },
    { name: "Budi Hartono", email: "budi@northline.io" },
    { name: "Dimas Wirawan", email: "dimas@northline.io" },
    { name: "Agoy Santika", email: "agoy@northline.io" },
    { name: "Sari Ningrum", email: "sari@northline.io" },
  ];

  for (const member of team) {
    await prisma.user.upsert({
      where: { email: member.email },
      update: {},
      create: {
        name: member.name,
        email: member.email,
        passwordHash: publisherPasswordHash,
        role: "PUBLISHER",
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "viewer@northline.io" },
    update: {},
    create: {
      name: "Bisdev Viewer",
      email: "viewer@northline.io",
      passwordHash: viewerPasswordHash,
      role: "VIEWER",
    },
  });

  // GO Expert is the only seeded application, and starts with no builds —
  // real builds are published through the app to verify the actual
  // upload/download path (including the connected Google Drive storage).
  await prisma.application.upsert({
    where: { slug: "go-expert" },
    update: {},
    create: {
      slug: "go-expert",
      name: "GO Expert",
      platform: "Android, APK",
      initials: "GO",
    },
  });

  console.log("Seed complete.");
  console.log("Publisher login: rian@northline.io / buildappdemo");
  console.log("Viewer login: viewer@northline.io / buildappdemo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
