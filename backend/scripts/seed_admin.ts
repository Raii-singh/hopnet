import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  // Check if admin already exists
  const existing = await prisma.systemUser.findUnique({
    where: { username },
  });

  if (existing) {
    console.log('Admin user already exists. Seed skipped.');
    return;
  }

  const defaultPassword = process.env.ADMIN_PASSPHRASE || 'hopnet-admin-2026';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  await prisma.systemUser.create({
    data: {
      username,
      password: hashedPassword,
    },
  });

  console.log(`Successfully seeded admin account '${username}'.`);
  console.log('Ensure you change this or use a secure password in production.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });