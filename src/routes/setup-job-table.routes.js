const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// Fix Job table - add missing postedById column
router.post('/fix-job-table', async (req, res) => {
  try {
    console.log('🔧 Fixing Job table...');

    // Check if postedById column exists
    try {
      await prisma.$queryRaw`SELECT postedById FROM "Job" LIMIT 1`;
      console.log('✅ postedById column already exists');
    } catch (e) {
      console.log('❌ postedById column missing. Adding it...');
      
      // Add postedById column
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "postedById" TEXT
      `);
      
      // Add postedByRole column
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "postedByRole" TEXT
      `);
      
      // Add foreign key constraint
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Job" ADD CONSTRAINT "Job_postedById_fkey" 
        FOREIGN KEY ("postedById") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      
      console.log('✅ Job table fixed successfully');
    }

    // Check if other columns exist and add if missing
    const columnsToAdd = [
      { name: 'businessId', type: 'TEXT' },
      { name: 'paymentId', type: 'TEXT' },
      { name: 'paymentStatus', type: 'TEXT', default: "'PENDING'" },
      { name: 'paymentAmount', type: 'DOUBLE PRECISION' },
      { name: 'jobRole', type: 'TEXT' },
      { name: 'jobDescription', type: 'TEXT' },
      { name: 'requiredSkills', type: 'TEXT[]' },
      { name: 'jobType', type: 'TEXT' },
      { name: 'payStructure', type: 'TEXT' },
      { name: 'offeredAmount', type: 'DOUBLE PRECISION' },
      { name: 'openings', type: 'INTEGER', default: '1' },
      { name: 'shift', type: 'TEXT' },
      { name: 'urgentHiring', type: 'BOOLEAN', default: 'false' },
      { name: 'education', type: 'TEXT' },
      { name: 'experience', type: 'INTEGER', default: '0' },
      { name: 'gender', type: 'TEXT' },
      { name: 'minAge', type: 'INTEGER' },
      { name: 'maxAge', type: 'INTEGER' },
      { name: 'country', type: 'TEXT' },
      { name: 'state', type: 'TEXT' },
      { name: 'district', type: 'TEXT' },
      { name: 'pincode', type: 'TEXT' },
      { name: 'fullAddress', type: 'TEXT' },
      { name: 'weekOffDays', type: 'TEXT[]' },
      { name: 'facilities', type: 'TEXT[]' },
      { name: 'joiningFees', type: 'BOOLEAN', default: 'false' },
      { name: 'contactName', type: 'TEXT' },
      { name: 'contactNumber', type: 'TEXT' },
      { name: 'status', type: 'TEXT', default: "'ACTIVE'" },
      { name: 'approvalStatus', type: 'TEXT', default: "'APPROVED'" },
      { name: 'appliedCount', type: 'INTEGER', default: '0' },
      { name: 'postedAt', type: 'TIMESTAMP(3)', default: 'CURRENT_TIMESTAMP' },
      { name: 'updatedAt', type: 'TIMESTAMP(3)', default: 'CURRENT_TIMESTAMP' },
      { name: 'expiresAt', type: 'TIMESTAMP(3)' },
    ];

    for (const col of columnsToAdd) {
      try {
        await prisma.$queryRaw`SELECT ${prisma.raw(col.name)} FROM "Job" LIMIT 1`;
      } catch (e) {
        console.log(`  Adding column: ${col.name}`);
        const defaultValue = col.default ? ` DEFAULT ${col.default}` : '';
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}${defaultValue}
        `);
      }
    }

    console.log('✅ All Job table columns verified');

    res.json({
      success: true,
      message: 'Job table fixed successfully'
    });
  } catch (error) {
    console.error('Error fixing Job table:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix Job table',
      error: error.message
    });
  }
});

module.exports = router;
