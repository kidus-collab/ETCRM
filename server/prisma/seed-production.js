import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const required = ["ADMIN_NAME", "ADMIN_EMAIL", "ADMIN_PASSWORD"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (process.env.ADMIN_PASSWORD.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters for production.");
  process.exit(1);
}

async function main() {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL },
    update: {
      name: process.env.ADMIN_NAME,
      passwordHash,
      role: Role.ADMIN
    },
    create: {
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      passwordHash,
      role: Role.ADMIN
    },
    select: { id: true, email: true, role: true }
  });

  console.log(`Production admin ready: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
