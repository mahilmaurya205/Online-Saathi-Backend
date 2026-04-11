// seed-tenant.js
// Run this once to create the default tenant in your Render database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking for existing tenants...');
  
  const existingTenant = await prisma.tenant.findFirst();
  
  if (existingTenant) {
    console.log('✅ Tenant already exists:', existingTenant);
    return;
  }
  
  console.log('No tenant found. Creating default tenant...');
  
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Online Saathi',
      domain: 'os.dpinfoserver.co.in',
      status: 'ACTIVE',
    },
  });
  
  console.log('✅ Tenant created successfully!');
  console.log('Tenant ID:', tenant.id);
  console.log('Tenant Name:', tenant.name);
  console.log('Tenant Domain:', tenant.domain);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
