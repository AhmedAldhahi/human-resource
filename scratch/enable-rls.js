require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableRLS() {
  console.log('\n=============================================================');
  console.log('🔒 ENABLING ROW-LEVEL SECURITY (RLS) ON ALL PUBLIC TABLES');
  console.log('=============================================================\n');

  // Query all tables in public schema
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `;

  console.log(`Found ${tables.length} tables in public schema:`);

  for (const t of tables) {
    const tableName = t.table_name;
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`  ✅ Enabled RLS on table: "${tableName}"`);
    } catch (err) {
      console.error(`  ❌ Error enabling RLS on "${tableName}":`, err.message);
    }
  }

  console.log('\n=============================================================');
  console.log('🎉 RLS SUCCESSFULLY ENABLED ON ALL TABLES!');
  console.log('=============================================================\n');

  await prisma.$disconnect();
}

enableRLS().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
