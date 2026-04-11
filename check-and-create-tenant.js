// Direct database check and tenant creation
// This connects directly to the database and checks/creates tenant
const { PrismaClient } = require('@prisma/client');

async function checkAndCreateTenant() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking database connection...');
    await prisma.$connect();
    console.log('✅ Connected to database\n');
    
    console.log('📋 Checking Tenant table...');
    const tenantCount = await prisma.tenant.count();
    console.log(`Found ${tenantCount} tenant(s)\n`);
    
    if (tenantCount === 0) {
      console.log('❌ No tenants found! Creating default tenant...\n');
      
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Online Saathi',
          domain: 'online-saathi-backend.onrender.com',
        },
      });
      
      console.log('✅ Tenant created successfully!\n');
      console.log('📝 Tenant Details:');
      console.log('   ID:', tenant.id);
      console.log('   Name:', tenant.name);
      console.log('   Domain:', tenant.domain);
      console.log('   Created:', tenant.createdAt);
    } else {
      console.log('✅ Tenants exist. Listing all:\n');
      const tenants = await prisma.tenant.findMany();
      tenants.forEach((t, i) => {
        console.log(`Tenant ${i + 1}:`);
        console.log('   ID:', t.id);
        console.log('   Name:', t.name);
        console.log('   Domain:', t.domain);
        console.log('   Created:', t.createdAt);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Meta:', error.meta);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Disconnected from database');
  }
}

checkAndCreateTenant();
