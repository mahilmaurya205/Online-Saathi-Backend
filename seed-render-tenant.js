// Run this locally to seed the Render database
// Usage: node seed-render-tenant.js
const { PrismaClient } = require('@prisma/client');

// Use Render's DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://online_saathi_db_user:yY0uu26Zcx6j75Zv1gQuHBRoHPBE1g3I@dpg-d7c8kpl7vvec73b2heag-a/online_saathi_db';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🔌 Connecting to Render database...');
  console.log('Database URL:', DATABASE_URL.split('@')[1]);
  
  console.log('\n📋 Checking for existing tenants...');
  const existingTenant = await prisma.tenant.findFirst();
  
  if (existingTenant) {
    console.log('✅ Tenant already exists in Render database:');
    console.log('   ID:', existingTenant.id);
    console.log('   Name:', existingTenant.name);
    console.log('   Domain:', existingTenant.domain);
    console.log('   Status:', existingTenant.status);
    return;
  }
  
  console.log('❌ No tenant found. Creating default tenant...\n');
  
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Online Saathi',
      domain: 'os.dpinfoserver.co.in',
      status: 'ACTIVE',
    },
  });
  
  console.log('✅ Tenant created successfully in Render database!');
  console.log('\n📝 Tenant Details:');
  console.log('   ID:', tenant.id);
  console.log('   Name:', tenant.name);
  console.log('   Domain:', tenant.domain);
  console.log('   Status:', tenant.status);
  console.log('\n🎉 You can now test registration!');
}

main()
  .catch((e) => {
    console.error('\n❌ Error:', e.message);
    if (e.code) {
      console.error('   Error Code:', e.code);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed.');
  });
