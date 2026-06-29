import bcrypt from "bcryptjs";
import { PrismaClient, LeadPhase, Role } from "@prisma/client";

const prisma = new PrismaClient();

const today = new Date();
today.setHours(0, 0, 0, 0);

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@etcrm.local" },
    update: {},
    create: { name: "Avery Admin", email: "admin@etcrm.local", passwordHash, role: Role.ADMIN }
  });

  const sales = await prisma.user.upsert({
    where: { email: "sales@etcrm.local" },
    update: {},
    create: { name: "Sam Sales", email: "sales@etcrm.local", passwordHash, role: Role.SALES }
  });

  const maria = await prisma.user.upsert({
    where: { email: "maria@etcrm.local" },
    update: {},
    create: { name: "Maria Lopez", email: "maria@etcrm.local", passwordHash, role: Role.SALES }
  });

  await prisma.quota.upsert({
    where: { salesUserId_date: { salesUserId: sales.id, date: today } },
    update: { callsTarget: 12, leadsTarget: 8 },
    create: { salesUserId: sales.id, date: today, callsTarget: 12, leadsTarget: 8 }
  });

  await prisma.quota.upsert({
    where: { salesUserId_date: { salesUserId: maria.id, date: today } },
    update: { callsTarget: 10, leadsTarget: 7 },
    create: { salesUserId: maria.id, date: today, callsTarget: 10, leadsTarget: 7 }
  });

  const count = await prisma.lead.count();
  if (count === 0) {
    await prisma.lead.createMany({
      data: [
        { fullName: "Jordan Kim", phoneNumber: "+1 555 0101", email: "jordan@example.com", phase: LeadPhase.NEW, assignedToId: sales.id, followUpDate: today },
        { fullName: "Priya Shah", phoneNumber: "+1 555 0102", email: "priya@example.com", phase: LeadPhase.FOLLOW_UP, assignedToId: sales.id, followUpDate: today },
        { fullName: "Noah Carter", phoneNumber: "+1 555 0103", email: "noah@example.com", phase: LeadPhase.CONTACTED, assignedToId: maria.id, followUpDate: today },
        { fullName: "Elena Brooks", phoneNumber: "+1 555 0104", email: "elena@example.com", phase: LeadPhase.NEW, assignedToId: maria.id }
      ]
    });
  }

  console.log(`Seeded users. Admin id: ${admin.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
