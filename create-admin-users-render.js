// Create admin users in Render database
// Run: node create-admin-users-render.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { generateUuid } = require('./src/utils/id');

// Render database URL
const DATABASE_URL = 'postgresql://online_saathi_db_user:yY0uu26Zcx6j75Zv1gQuHBRoHPBE1g3I@dpg-d7c8kpl7vvec73b2heag-a/online_saathi_db';

const prisma = new PrismaClient({
  datasources: {
    db: { url: DATABASE_URL }
  }
});

async function main() {
  console.log('🔧 Connecting to Render database...\n');

  // Get tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error('❌ No tenant found in Render database!');
    console.error('Please create a tenant first using: POST /api/setup/create-default-tenant');
    return;
  }
  console.log('✅ Using tenant:', tenant.id, '-', tenant.name, '\n');

  // Get roles
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });

  if (!adminRole || !superAdminRole) {
    console.error('❌ Roles not found. Please run seed.js first.');
    return;
  }

  // Create SUPER_ADMIN
  const superAdminMobile = '9999999999';
  const superAdminPassword = 'admin123';
  
  const existingSuperAdmin = await prisma.user.findUnique({ where: { mobile: superAdminMobile } });
  
  if (existingSuperAdmin) {
    console.log('✅ Super Admin already exists');
  } else {
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
    
    await prisma.user.create({
      data: {
        id: generateUuid(),
        mobile: superAdminMobile,
        fullName: 'Super Admin',
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-01'),
        password: hashedPassword,
        tenantId: tenant.id,
        identity: 'SUPER_ADMIN',
        roles: {
          create: {
            id: generateUuid(),
            roleId: superAdminRole.id
          }
        }
      }
    });
    console.log('✅ Super Admin created');
  }

  // Create ADMIN
  const adminMobile = '8888888888';
  const adminPassword = 'admin123';
  
  const existingAdmin = await prisma.user.findUnique({ where: { mobile: adminMobile } });
  
  if (existingAdmin) {
    console.log('✅ Admin already exists');
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    await prisma.user.create({
      data: {
        id: generateUuid(),
        mobile: adminMobile,
        fullName: 'Admin User',
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-01'),
        password: hashedPassword,
        tenantId: tenant.id,
        identity: 'ADMIN',
        roles: {
          create: {
            id: generateUuid(),
            roleId: adminRole.id
          }
        }
      }
    });
    console.log('✅ Admin created');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📝 ADMIN CREDENTIALS:\n');
  console.log('Super Admin:');
  console.log('   Mobile: 9999999999');
  console.log('   Password: admin123\n');
  console.log('Admin:');
  console.log('   Mobile: 8888888888');
  console.log('   Password: admin123\n');
  console.log('🔐 Login API:');
  console.log('   POST https://online-saathi-backend.onrender.com/api/auth/login');
  console.log('   Body: { "mobile": "9999999999", "password": "admin123" }');
  console.log('\n⚠️  IMPORTANT: Change these passwords in production!\n');
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
