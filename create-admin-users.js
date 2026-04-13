// Create admin users for testing
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { generateUuid } = require('./src/utils/id');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Creating admin users...\n');

  // Get tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error('❌ No tenant found. Please create a tenant first.');
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
    console.log('✅ Super Admin already exists:');
    console.log('   Mobile:', superAdminMobile);
    console.log('   Password:', superAdminPassword);
    console.log('   Identity:', existingSuperAdmin.identity);
  } else {
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
    
    const superAdmin = await prisma.user.create({
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

    console.log('✅ Super Admin created successfully!');
    console.log('   Mobile:', superAdminMobile);
    console.log('   Password:', superAdminPassword);
    console.log('   User ID:', superAdmin.id);
    console.log('   Identity:', superAdmin.identity);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Create ADMIN
  const adminMobile = '8888888888';
  const adminPassword = 'admin123';
  
  const existingAdmin = await prisma.user.findUnique({ where: { mobile: adminMobile } });
  
  if (existingAdmin) {
    console.log('✅ Admin already exists:');
    console.log('   Mobile:', adminMobile);
    console.log('   Password:', adminPassword);
    console.log('   Identity:', existingAdmin.identity);
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const admin = await prisma.user.create({
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

    console.log('✅ Admin created successfully!');
    console.log('   Mobile:', adminMobile);
    console.log('   Password:', adminPassword);
    console.log('   User ID:', admin.id);
    console.log('   Identity:', admin.identity);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📝 Login Credentials:');
  console.log('\nSuper Admin:');
  console.log('   Mobile:', superAdminMobile);
  console.log('   Password:', superAdminPassword);
  console.log('\nAdmin:');
  console.log('   Mobile:', adminMobile);
  console.log('   Password:', adminPassword);
  console.log('\n🔐 Login API:');
  console.log('   POST /api/auth/login');
  console.log('   { "mobile": "9999999999", "password": "admin123" }');
  console.log('\n⚠️  IMPORTANT: Change these passwords in production!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
