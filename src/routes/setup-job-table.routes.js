const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// Fix Job table array columns properly
router.post('/fix-job-table', async (req, res) => {
  try {
    console.log('🔧 Fixing Job table...');

    // Get all existing columns
    const columnsResult = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'Job'
      ORDER BY ordinal_position
    `;
    
    const existingColumns = columnsResult.map(row => row.column_name);
    console.log(`Found ${existingColumns.length} columns`);

    // Drop problematic array columns if they exist with wrong type
    const arrayColumns = ['requiredSkills', 'facilities'];
    
    for (const col of arrayColumns) {
      if (existingColumns.includes(col)) {
        console.log(`  Dropping ${col} to recreate as proper array...`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Job" DROP COLUMN IF EXISTS "${col}"`);
      }
    }

    // Re-add array columns with correct type
    for (const col of arrayColumns) {
      console.log(`  Adding ${col} as TEXT[]...`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Job" ADD COLUMN "${col}" TEXT[] DEFAULT ARRAY[]::TEXT[]`);
    }

    // Add any missing non-array columns
    const columnsToAdd = [
      { name: 'id', type: 'TEXT', default: 'gen_random_uuid()' },
      { name: 'businessId', type: 'TEXT' },
      { name: 'postedById', type: 'TEXT' },
      { name: 'postedByRole', type: 'TEXT' },
      { name: 'jobRole', type: 'TEXT' },
      { name: 'jobDescription', type: 'TEXT' },
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
      { name: 'weekOffDays', type: 'TEXT' },
      { name: 'joiningFees', type: 'BOOLEAN', default: 'false' },
      { name: 'contactName', type: 'TEXT' },
      { name: 'contactNumber', type: 'TEXT' },
      { name: 'status', type: 'TEXT', default: "'ACTIVE'" },
      { name: 'paymentId', type: 'TEXT' },
      { name: 'postingFee', type: 'DOUBLE PRECISION', default: '0' },
      { name: 'createdAt', type: 'TIMESTAMP(3)', default: 'CURRENT_TIMESTAMP' },
      { name: 'updatedAt', type: 'TIMESTAMP(3)', default: 'CURRENT_TIMESTAMP' },
    ];

    let addedCount = 0;
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name) && !arrayColumns.includes(col.name)) {
        console.log(`  Adding: ${col.name}`);
        const defaultClause = col.default ? ` DEFAULT ${col.default}` : '';
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Job" ADD COLUMN "${col.name}" ${col.type}${defaultClause}
        `);
        addedCount++;
      }
    }

    // Add foreign keys
    const foreignKeys = [
      {
        name: 'Job_postedById_fkey',
        sql: `ALTER TABLE "Job" ADD CONSTRAINT "Job_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
      },
      {
        name: 'Job_businessId_fkey',
        sql: `ALTER TABLE "Job" ADD CONSTRAINT "Job_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE`
      }
    ];

    for (const fk of foreignKeys) {
      try {
        const exists = await prisma.$queryRaw`
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = 'Job' AND constraint_name = ${fk.name}
        `;
        
        if (exists.length === 0) {
          await prisma.$executeRawUnsafe(fk.sql);
          console.log(`  ✓ Added FK: ${fk.name}`);
        }
      } catch (e) {
        console.log(`  FK ${fk.name} error:`, e.message);
      }
    }

    console.log('✅ Job table fixed!');

    res.json({
      success: true,
      message: 'Job table fixed successfully',
      columnsAdded: addedCount,
      arrayColumnsFixed: arrayColumns
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
