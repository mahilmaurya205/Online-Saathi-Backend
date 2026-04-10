const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  try {
    // Get first tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.error("No tenant found");
      return;
    }
    console.log("Using tenant:", tenant.id);

    // Check if super admin exists
    const existing = await prisma.user.findUnique({
      where: { mobile: "9999999999" }
    });

    if (existing) {
      console.log("Super admin already exists:", existing.id);
      return;
    }

    // Create super admin
    const hashedPassword = await bcrypt.hash("superadmin123", 10);
    const user = await prisma.user.create({
      data: {
        mobile: "9999999999",
        password: hashedPassword,
        fullName: "Super Admin",
        gender: "MALE",
        dateOfBirth: new Date("1990-01-01"),
        identity: "SUPER_ADMIN",
        approvalStatus: "APPROVED",
        tenantId: tenant.id,
        referralCode: "SUPER001"
      }
    });

    console.log("Super Admin created successfully!");
    console.log("ID:", user.id);
    console.log("Mobile:", user.mobile);
    console.log("Password: superadmin123");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
