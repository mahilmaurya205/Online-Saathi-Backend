const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// Emergency endpoint to create default tenant
// DELETE THIS AFTER USE - Security Risk!
router.post('/create-default-tenant', async (req, res) => {
  try {
    console.log('Creating default tenant...');
    
    // Check if tenant already exists
    const existing = await prisma.tenant.findFirst();
    
    if (existing) {
      return res.json({
        success: true,
        message: 'Tenant already exists',
        tenant: {
          id: existing.id,
          name: existing.name,
          domain: existing.domain,
        },
      });
    }
    
    // Create default tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Online Saathi',
        domain: 'online-saathi-backend.onrender.com',
      },
    });
    
    console.log('Default tenant created:', tenant.id);
    
    res.status(201).json({
      success: true,
      message: 'Default tenant created successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
      },
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tenant',
      error: error.message,
    });
  }
});

// Check tenant status
router.get('/check-tenant', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany();
    
    res.json({
      success: true,
      count: tenants.length,
      tenants: tenants.map(t => ({
        id: t.id,
        name: t.name,
        domain: t.domain,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error checking tenants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check tenants',
      error: error.message,
    });
  }
});

module.exports = router;
