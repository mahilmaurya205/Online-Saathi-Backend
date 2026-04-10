const { PrismaClient } = require("@prisma/client");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const prisma = new PrismaClient();

// Valid document types
const VALID_DOCUMENT_TYPES = ["Aadhar", "Passport", "Driving License", "Voter Id"];
const VALID_JOB_TYPES = ["Daily wages", "Part time", "Full Time"];
const VALID_MARITAL_STATUS = ["Married", "Unmarried"];
const VALID_GENDERS = ["Male", "Female"];
const VALID_TRANSACTION_TYPES = ["ONLY_PROFILE", "PROFILE_WITH_RESUME"];

const jobProfileController = {
  // Get user's job profile
  getJobProfile: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;

    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Job profile not found. Please create one.",
        });
      }

      return res.json({
        success: true,
        profile,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Create or update comprehensive job profile
  saveJobProfile: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const {
      // Personal Info
      fullName,
      phoneNumber,
      email,
      maritalStatus,
      gender,
      dateOfBirth,
      languages,
      
      // Current Address
      currentCountry,
      currentState,
      currentDistrict,
      currentAddress,
      currentPincode,
      
      // Permanent Address
      permanentCountry,
      permanentState,
      permanentDistrict,
      permanentAddress,
      permanentPincode,
      
      // Job Preferences
      jobType,
      jobRole,
      jobRoleCategory,
      skills,
      jobDescription,
      
      // Education
      education,
      
      // Work Experience
      totalExperience,
      workExperience,
      
      // Document
      documentType,
      documentFront,
      documentBack,
      documentNumber,
      
      // Transaction Type
      transactionType,
    } = req.body;

    try {
      // Validate required fields
      const requiredFields = [
        fullName, phoneNumber, maritalStatus, gender, dateOfBirth, languages,
        currentCountry, currentState, currentDistrict, currentAddress, currentPincode,
        permanentCountry, permanentState, permanentDistrict, permanentAddress, permanentPincode,
        jobType, jobRole, skills, transactionType
      ];
      
      const missingFields = requiredFields.filter(f => 
        f === undefined || f === null || (Array.isArray(f) && f.length === 0)
      );
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
          missingFields: [
            !fullName && "fullName",
            !phoneNumber && "phoneNumber",
            !maritalStatus && "maritalStatus",
            !gender && "gender",
            !dateOfBirth && "dateOfBirth",
            !languages && "languages",
            !currentCountry && "currentCountry",
            !currentState && "currentState",
            !currentDistrict && "currentDistrict",
            !currentAddress && "currentAddress",
            !currentPincode && "currentPincode",
            !permanentCountry && "permanentCountry",
            !permanentState && "permanentState",
            !permanentDistrict && "permanentDistrict",
            !permanentAddress && "permanentAddress",
            !permanentPincode && "permanentPincode",
            !jobType && "jobType",
            !jobRole && "jobRole",
            !skills && "skills",
            !transactionType && "transactionType",
          ].filter(Boolean)
        });
      }

      // Validate enums
      if (!VALID_MARITAL_STATUS.includes(maritalStatus)) {
        return res.status(400).json({ success: false, message: "Invalid maritalStatus" });
      }
      if (!VALID_GENDERS.includes(gender)) {
        return res.status(400).json({ success: false, message: "Invalid gender" });
      }
      if (!VALID_JOB_TYPES.includes(jobType)) {
        return res.status(400).json({ success: false, message: "Invalid jobType" });
      }
      if (!VALID_TRANSACTION_TYPES.includes(transactionType)) {
        return res.status(400).json({ success: false, message: "Invalid transactionType" });
      }
      if (documentType && !VALID_DOCUMENT_TYPES.includes(documentType)) {
        return res.status(400).json({ success: false, message: "Invalid documentType" });
      }

      // Get profile fee based on transaction type
      const pricingKey = transactionType === "ONLY_PROFILE" ? "JOB_PROFILE_FEE" : "JOB_PROFILE_WITH_RESUME_FEE";
      const pricing = await prisma.pricingSetting.findFirst({
        where: { key: pricingKey, tenantId, isActive: true }
      });
      const profileFee = pricing?.amount || 0;

      // Prepare profile data
      const profileData = {
        fullName,
        phoneNumber,
        email: email || null,
        maritalStatus,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        languages: Array.isArray(languages) ? languages : [languages],
        
        currentCountry,
        currentState,
        currentDistrict,
        currentAddress,
        currentPincode,
        
        permanentCountry,
        permanentState,
        permanentDistrict,
        permanentAddress,
        permanentPincode,
        
        jobType,
        jobRole,
        jobRoleCategory: jobRoleCategory || null,
        skills: Array.isArray(skills) ? skills : [skills],
        jobDescription: jobDescription || null,
        
        education: education || null,
        
        totalExperience: totalExperience || 0,
        workExperience: workExperience || null,
        
        documentType: documentType || null,
        documentFront: documentFront || null,
        documentBack: documentBack || null,
        documentNumber: documentNumber || null,
        
        transactionType,
        profileFee,
        profileStatus: profileFee > 0 ? "PENDING" : "VERIFIED",
      };

      // Upsert profile
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: profileData,
        create: {
          id: generateUuid(),
          userId,
          ...profileData,
        },
      });

      // Create verification record if fee is required
      if (profileFee > 0) {
        await prisma.profileVerification.create({
          data: {
            id: generateUuid(),
            userId,
            profileId: profile.id,
            transactionType,
            feeAmount: profileFee,
            status: "PENDING",
          },
        });
      }

      await logAction({
        userId,
        action: "JOB_PROFILE_CREATED",
        tenantId,
        metadata: { 
          transactionType, 
          profileFee,
          requiresVerification: profileFee > 0 
        },
      });

      return res.json({
        success: true,
        message: profileFee > 0 
          ? "Profile created. Payment required for verification."
          : "Profile created successfully.",
        profile,
        requiresPayment: profileFee > 0,
        feeAmount: profileFee,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get admin-configured job categories
  getJobCategories: async (req, res) => {
    const { tenant_id: tenantId } = req.user;

    try {
      const categories = await prisma.jobCategory.findMany({
        where: { 
          OR: [{ tenantId: null }, { tenantId }],
          isActive: true 
        },
        include: {
          roles: {
            where: { isActive: true },
            select: { id: true, name: true, description: true }
          }
        }
      });

      return res.json({ success: true, categories });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get admin-configured skills
  getSkills: async (req, res) => {
    const { tenant_id: tenantId } = req.user;

    try {
      const skills = await prisma.skill.findMany({
        where: { 
          OR: [{ tenantId: null }, { tenantId }],
          isActive: true 
        },
        orderBy: { name: "asc" }
      });

      return res.json({ success: true, skills });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Admin: Create job category
  createJobCategory: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    try {
      const category = await prisma.jobCategory.create({
        data: {
          id: generateUuid(),
          name,
          description: description || null,
          tenantId,
          createdBy: userId,
        },
      });

      return res.status(201).json({ success: true, category });
    } catch (err) {
      if (err.code === "P2002") {
        return res.status(409).json({ success: false, message: "Category already exists" });
      }
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Admin: Create job role
  createJobRole: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { categoryId, name, description } = req.body;

    if (!categoryId || !name) {
      return res.status(400).json({ success: false, message: "Category ID and role name are required" });
    }

    try {
      const role = await prisma.jobRole.create({
        data: {
          id: generateUuid(),
          categoryId,
          name,
          description: description || null,
          tenantId,
          createdBy: userId,
        },
      });

      return res.status(201).json({ success: true, role });
    } catch (err) {
      if (err.code === "P2002") {
        return res.status(409).json({ success: false, message: "Role already exists in this category" });
      }
      console.error("createJobRole error:", err);
      return res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  // Admin: Create skill
  createSkill: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { name, category } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Skill name is required" });
    }

    try {
      const skill = await prisma.skill.create({
        data: {
          id: generateUuid(),
          name,
          category: category || null,
          tenantId,
          createdBy: userId,
        },
      });

      return res.status(201).json({ success: true, skill });
    } catch (err) {
      if (err.code === "P2002") {
        return res.status(409).json({ success: false, message: "Skill already exists" });
      }
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Admin: Get pending profile verifications
  getPendingVerifications: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [verifications, total] = await Promise.all([
        prisma.profileVerification.findMany({
          where: { status: "PENDING" },
          include: {
            user: {
              select: { id: true, fullName: true, mobile: true }
            }
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit)
        }),
        prisma.profileVerification.count({ where: { status: "PENDING" } })
      ]);

      return res.json({
        success: true,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        verifications
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Admin: Verify or reject profile
  processVerification: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId } = req.user;
    const { verificationId } = req.params;
    const { action, rejectionReason } = req.body;

    if (!action || !["VERIFY", "REJECT"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be VERIFY or REJECT" });
    }

    try {
      const verification = await prisma.profileVerification.findUnique({
        where: { id: verificationId },
        include: { user: true }
      });

      if (!verification) {
        return res.status(404).json({ success: false, message: "Verification not found" });
      }

      if (verification.status !== "PENDING") {
        return res.status(400).json({ success: false, message: "Verification already processed" });
      }

      if (action === "VERIFY") {
        // Update verification
        await prisma.profileVerification.update({
          where: { id: verificationId },
          data: {
            status: "VERIFIED",
            verifiedBy: adminId,
            verifiedAt: new Date()
          }
        });

        // Update profile
        await prisma.userProfile.update({
          where: { id: verification.profileId },
          data: {
            profileStatus: "VERIFIED",
            verifiedBy: adminId,
            verifiedAt: new Date()
          }
        });

        return res.json({ success: true, message: "Profile verified successfully" });
      } else {
        // Reject
        await prisma.profileVerification.update({
          where: { id: verificationId },
          data: {
            status: "REJECTED",
            verifiedBy: adminId,
            verifiedAt: new Date(),
            rejectionReason: rejectionReason || null
          }
        });

        await prisma.userProfile.update({
          where: { id: verification.profileId },
          data: {
            profileStatus: "REJECTED",
            rejectionReason: rejectionReason || null
          }
        });

        return res.json({ success: true, message: "Profile rejected" });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Check if user can view jobs (profile must be verified)
  canViewJobs: async (req, res) => {
    const { user_id: userId } = req.user;

    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
        select: { profileStatus: true, transactionType: true }
      });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Job profile not found. Please create one.",
          canViewJobs: false
        });
      }

      const canView = profile.profileStatus === "VERIFIED";
      const withResume = profile.transactionType === "PROFILE_WITH_RESUME";

      return res.json({
        success: true,
        canViewJobs: canView,
        transactionType: profile.transactionType,
        withResume: withResume,
        message: canView 
          ? (withResume ? "You can view detailed jobs" : "You can view jobs")
          : "Your profile is pending verification"
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = jobProfileController;
