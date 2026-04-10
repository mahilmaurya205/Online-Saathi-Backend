-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Identity" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "Identity" ADD VALUE 'SUB_ADMIN';
ALTER TYPE "Identity" ADD VALUE 'COUNTRY_HEAD';
ALTER TYPE "Identity" ADD VALUE 'STATE_HEAD';
