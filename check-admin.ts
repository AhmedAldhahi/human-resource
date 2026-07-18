import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    console.log('Connecting to database...');
    const user = await prisma.user.findUnique({
      where: { email: 'admin@hrms.com' }
    });

    if (!user) {
      console.log('❌ admin@hrms.com NOT FOUND in database!');
      return;
    }

    console.log('✅ admin@hrms.com exists in database!');
    console.log('ID:', user.id);
    console.log('Role:', user.role);

    const isMatch = await bcrypt.compare('a@D@M@I@N%a', user.password);
    console.log('Password match for a@D@M@I@N%a:', isMatch ? '✅ YES' : '❌ NO');

  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
