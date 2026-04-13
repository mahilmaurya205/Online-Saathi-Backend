const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// Fix Job table - add missing postedById column
router.post('/fix-job-table', async (req, res) => {
  try {
    console.log('🔧 Fixing Job table...');

    // Get all existing columns
    const columnsResult = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Job'
    `;
    
    const existingColumns = columnsResult.map(row => row.column_name);
    console.log('Existing columns:', existingColumns);

    // Add postedById if missing
    if (!existingColumns.includes('postedById')) {
      console.log('  Adding postedById column...');
      await prisma.$executeRawUnsafe(`ALTER TABLE "Job" ADD COLUMN "postedById" TEXT`);
    }
    
    // Add postedByRole if missing
    if (!existingColumns.includes('postedByRole')) {
      console.log('  Adding postedByRole column...');
      await prisma.$executeRawUnsafe(`ALTER TABLE "Job" ADD COLUMN "postedByRole" TEXT`);
    }
    
    // Add foreign key constraint only if it doesn't exist
    const constraintCheck = await prisma.$queryRaw`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'Job' AND constraint_name = 'Job_postedById_fkey'
    `;
    
    if (constraintCheck.length === 0) {
      console.log('  Adding foreign key constraint...');
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Job" ADD CONSTRAINT "Job_postedById_fkey" 
          FOREIGN KEY ("postedById") REFERENCES "User"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE
        `);
      } catch (e) {
        console.log('  Foreign key constraint already exists or error:', e.message);
      }
    }

    // Check and add missing columns
    const columnsToAdd = [
      { name: 'businessId', type: 'TEXT' },
      { name: 'paymentId', type: 'TEXT' },
      { name: 'paymentStatus', type: 'TEXT', default: 'PENDING' },
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
      { name: 'status', type: 'TEXT', default: 'ACTIVE' },
      { name: 'approvalStatus', type: 'TEXT', default: 'APPROVED' },
      { name: 'appliedCount', type: 'INTEGER', default: '0' },
      { name: 'postedAt', type: 'TIMESTAMP(3)', default: 'CURRENT_TIMESTAMP' },
      { name: 'updatedAt', type: 'TIMESTAMP(3)', default: 'CURRENT_TIMESTAMP' },
      { name: 'expiresAt', type: 'TIMESTAMP(3)' },
    ];

    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`  Adding column: ${col.name}`);
        const defaultValue = col.default ? ` DEFAULT ${col.type === 'TEXT' ? `'${col.default}'` : col.default}` : '';
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Job" ADD COLUMN "${col.name}" ${col.type}${defaultValue}
        `);
      }
    }

    console.log('✅ All Job table columns verified');

    res.json({
      success: true,
      message: 'Job table fixed successfully',
      existingColumns: existingColumns.length,
      totalColumns: columnsToAdd.length + 2
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
