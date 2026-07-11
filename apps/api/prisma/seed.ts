import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@hrms.com';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('a@D@M@I@N%a', 10);

    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'System Admin',
        role: Role.ADMIN,
      },
    });

    console.log('✅ Default admin account created: admin@hrms.com');
  } else {
    console.log('ℹ️  Admin account already exists, skipping seed.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
