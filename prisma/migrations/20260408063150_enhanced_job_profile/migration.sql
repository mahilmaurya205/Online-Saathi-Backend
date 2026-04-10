-- DropIndex
DROP INDEX "UserProfile_city_idx";

-- DropIndex
DROP INDEX "UserProfile_experience_idx";

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "currentAddress" TEXT,
ADD COLUMN     "currentCountry" TEXT,
ADD COLUMN     "currentDistrict" TEXT,
ADD COLUMN     "currentPincode" TEXT,
ADD COLUMN     "currentState" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "documentBack" TEXT,
ADD COLUMN     "documentFront" TEXT,
ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "jobDescription" TEXT,
ADD COLUMN     "jobRole" TEXT,
ADD COLUMN     "jobRoleCategory" TEXT,
ADD COLUMN     "jobType" TEXT,
ADD COLUMN     "languages" TEXT[],
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "permanentAddress" TEXT,
ADD COLUMN     "permanentCountry" TEXT,
ADD COLUMN     "permanentDistrict" TEXT,
ADD COLUMN     "permanentPincode" TEXT,
ADD COLUMN     "permanentState" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "profileFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "profileStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "totalExperience" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "transactionType" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" TEXT,
ADD COLUMN     "workExperience" JSONB;

-- CreateTable
CREATE TABLE "JobCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "transactionType" TEXT NOT NULL,
    "feeAmount" DOUBLE PRECISION NOT NULL,
    "paymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobCategory_name_key" ON "JobCategory"("name");

-- CreateIndex
CREATE INDEX "JobCategory_tenantId_idx" ON "JobCategory"("tenantId");

-- CreateIndex
CREATE INDEX "JobCategory_isActive_idx" ON "JobCategory"("isActive");

-- CreateIndex
CREATE INDEX "JobRole_categoryId_idx" ON "JobRole"("categoryId");

-- CreateIndex
CREATE INDEX "JobRole_tenantId_idx" ON "JobRole"("tenantId");

-- CreateIndex
CREATE INDEX "JobRole_isActive_idx" ON "JobRole"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "JobRole_name_categoryId_key" ON "JobRole"("name", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE INDEX "Skill_tenantId_idx" ON "Skill"("tenantId");

-- CreateIndex
CREATE INDEX "Skill_isActive_idx" ON "Skill"("isActive");

-- CreateIndex
CREATE INDEX "ProfileVerification_userId_idx" ON "ProfileVerification"("userId");

-- CreateIndex
CREATE INDEX "ProfileVerification_status_idx" ON "ProfileVerification"("status");

-- CreateIndex
CREATE INDEX "ProfileVerification_transactionType_idx" ON "ProfileVerification"("transactionType");

-- CreateIndex
CREATE INDEX "UserProfile_currentState_idx" ON "UserProfile"("currentState");

-- CreateIndex
CREATE INDEX "UserProfile_currentDistrict_idx" ON "UserProfile"("currentDistrict");

-- CreateIndex
CREATE INDEX "UserProfile_jobRole_idx" ON "UserProfile"("jobRole");

-- CreateIndex
CREATE INDEX "UserProfile_jobType_idx" ON "UserProfile"("jobType");

-- CreateIndex
CREATE INDEX "UserProfile_profileStatus_idx" ON "UserProfile"("profileStatus");

-- AddForeignKey
ALTER TABLE "JobRole" ADD CONSTRAINT "JobRole_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "JobCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileVerification" ADD CONSTRAINT "ProfileVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
