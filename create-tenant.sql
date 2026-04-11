-- Check existing tenants
SELECT * FROM "Tenant";

-- If no tenants exist, run this INSERT:
INSERT INTO "Tenant" (id, name, domain, status, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Default Tenant',
  'os.dpinfoserver.co.in',
  'ACTIVE',
  NOW(),
  NOW()
);
