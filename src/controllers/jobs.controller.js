const { PrismaClient } = require("@prisma/client");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const prisma = new PrismaClient();

const jobsController = {
  // Search and list jobs with filters
  searchJobs: async (req, res) => {
    console.log("searchJobs called with query:", req.query);
    const { user_id: userId, tenant_id: tenantId } = req.user || {};
    const {
      keyword,
      city,
      state,
      skills,
      minSalary,
      maxSalary,
      experience,
      employmentType,
      page = 1,
      limit = 10,
    } = req.query;

    try {
      const where = {
        status: "ACTIVE",
        OR: [
          { business: { isVerified: true } },
          { businessId: null } // Jobs posted by admin without business
        ]
      };

      // Keyword search (jobRole or jobDescription)
      if (keyword) {
        where.OR = [
          { jobRole: { contains: keyword, mode: "insensitive" } },
          { jobDescription: { contains: keyword, mode: "insensitive" } },
        ];
      }

      // Location filters
      if (city) {
        where.district = { contains: city, mode: "insensitive" };
      }
      if (state) {
        where.state = { contains: state, mode: "insensitive" };
      }

      // Skills filter (requiredSkills should overlap with provided skills)
      if (skills) {
        const skillArray = skills.split(",").map((s) => s.trim());
        where.requiredSkills = {
          hasSome: skillArray,
        };
      }

      // Salary range (offeredAmount)
      if (minSalary || maxSalary) {
        where.AND = where.AND || [];
        if (minSalary) {
          where.AND.push({
            offeredAmount: { gte: parseFloat(minSalary) }
          });
        }
        if (maxSalary) {
          where.AND.push({
            offeredAmount: { lte: parseFloat(maxSalary) }
          });
        }
      }

      // Experience filter
      if (experience) {
        const exp = parseInt(experience);
        where.experience = { lte: exp };
      }

      // Employment type (jobType)
      if (employmentType) {
        where.jobType = employmentType;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where,
          include: {
            business: {
              select: {
                id: true,
                companyName: true,
                industry: true,
                city: true,
                isVerified: true,
              },
            },
            _count: {
              select: { applications: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit),
        }),
        prisma.job.count({ where }),
      ]);

      // Check if user has applied to each job
      let jobsWithApplicationStatus = jobs;
      if (userId) {
        const userApplications = await prisma.jobApplication.findMany({
          where: { userId },
          select: { jobId: true, status: true },
        });
        const appliedJobIds = new Map(userApplications.map((a) => [a.jobId, a.status]));

        jobsWithApplicationStatus = jobs.map((job) => ({
          ...job,
          hasApplied: appliedJobIds.has(job.id),
          applicationStatus: appliedJobIds.get(job.id) || null,
        }));
      }

      return res.json({
        success: true,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        jobs: jobsWithApplicationStatus,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get job details
  getJobDetails: async (req, res) => {
    const { id } = req.params;
    const { user_id: userId } = req.user || {};

    try {
      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          business: {
            select: {
              id: true,
              companyName: true,
              industry: true,
              companySize: true,
              city: true,
              state: true,
              website: true,
              isVerified: true,
            },
          },
          _count: {
            select: { applications: true },
          },
        },
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      // Check if user has applied
      let hasApplied = false;
      let applicationStatus = null;
      if (userId) {
        const application = await prisma.jobApplication.findFirst({
          where: { jobId: id, userId },
        });
        if (application) {
          hasApplied = true;
          applicationStatus = application.status;
        }
      }

      return res.json({
        success: true,
        job: {
          ...job,
          hasApplied,
          applicationStatus,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Apply to a job
  applyToJob: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { id } = req.params;
    const { coverLetter, resumeUrl } = req.body;

    try {
      // Check if job exists and is active
      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          _count: { select: { applications: true } },
        },
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      if (job.status !== "ACTIVE") {
        return res.status(400).json({
          success: false,
          message: "This job is no longer accepting applications",
        });
      }

      // Check if max applicants reached
      if (job._count.applications >= job.maxApplicants) {
        return res.status(400).json({
          success: false,
          message: "Maximum number of applications reached for this job",
        });
      }

      // Check if user already applied
      const existingApplication = await prisma.jobApplication.findFirst({
        where: { jobId: id, userId },
      });

      if (existingApplication) {
        return res.status(400).json({
          success: false,
          message: "You have already applied to this job",
          application: existingApplication,
        });
      }

      // Create application
      const application = await prisma.jobApplication.create({
        data: {
          id: generateUuid(),
          jobId: id,
          userId,
          coverLetter: coverLetter || null,
          resumeUrl: resumeUrl || null,
          status: "PENDING",
        },
      });

      await logAction({
        userId,
        action: "JOB_APPLIED",
        targetId: id,
        tenantId,
        metadata: { jobTitle: job.title },
      });

      return res.status(201).json({
        success: true,
        message: "Application submitted successfully",
        application,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get my applications
  getMyApplications: async (req, res) => {
    const { user_id: userId } = req.user;
    const { status } = req.query;

    try {
      const applications = await prisma.jobApplication.findMany({
        where: {
          userId,
          status: status || undefined,
        },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              location: true,
              city: true,
              salaryMin: true,
              salaryMax: true,
              employmentType: true,
              business: {
                select: {
                  companyName: true,
                },
              },
            },
          },
        },
        orderBy: { appliedAt: "desc" },
      });

      return res.json({
        success: true,
        count: applications.length,
        applications,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Withdraw application
  withdrawApplication: async (req, res) => {
    const { user_id: userId } = req.user;
    const { id } = req.params;

    try {
      const application = await prisma.jobApplication.findFirst({
        where: { id, userId },
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      if (application.status !== "PENDING") {
        return res.status(400).json({
          success: false,
          message: "Cannot withdraw application that is already being processed",
        });
      }

      await prisma.jobApplication.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: "Application withdrawn successfully",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get recommended jobs based on user profile
  getRecommendedJobs: async (req, res) => {
    const { user_id: userId } = req.user;
    const { limit = 10 } = req.query;

    try {
      // Get user profile
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!userProfile) {
        return res.status(400).json({
          success: false,
          message: "Please create a profile first to get job recommendations",
        });
      }

      // Build recommendation query based on user profile
      const where = {
        status: "ACTIVE",
        business: { isVerified: true },
      };

      // Match by skills
      if (userProfile.skills && userProfile.skills.length > 0) {
        where.requirements = {
          hasSome: userProfile.skills,
        };
      }

      // Match by location preference
      if (userProfile.preferredLocation && userProfile.preferredLocation.length > 0) {
        where.OR = [
          { city: { in: userProfile.preferredLocation, mode: "insensitive" } },
          { state: { in: userProfile.preferredLocation, mode: "insensitive" } },
        ];
      }

      // Match by experience
      if (userProfile.experience !== undefined) {
        where.experienceMin = { lte: userProfile.experience };
      }

      // Match by salary preference
      if (userProfile.preferredSalary) {
        where.salaryMax = { gte: userProfile.preferredSalary * 0.8 };
      }

      const jobs = await prisma.job.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              companyName: true,
              industry: true,
              city: true,
              isVerified: true,
            },
          },
          _count: {
            select: { applications: true },
          },
        },
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      });

      // Calculate match score for each job
      const jobsWithScore = jobs.map((job) => {
        let score = 0;
        const reasons = [];

        // Skills match
        if (userProfile.skills && job.requirements) {
          const matchingSkills = job.requirements.filter((req) =>
            userProfile.skills.includes(req)
          );
          const skillMatchRatio = matchingSkills.length / job.requirements.length;
          score += skillMatchRatio * 40; // 40% weight for skills
          if (matchingSkills.length > 0) {
            reasons.push(`Matches ${matchingSkills.length} skills`);
          }
        }

        // Location match
        if (
          userProfile.preferredLocation &&
          (userProfile.preferredLocation.includes(job.city) ||
            userProfile.preferredLocation.includes(job.state))
        ) {
          score += 25; // 25% weight for location
          reasons.push("Preferred location");
        }

        // Experience match
        if (
          userProfile.experience >= job.experienceMin &&
          (!job.experienceMax || userProfile.experience <= job.experienceMax)
        ) {
          score += 20; // 20% weight for experience
          reasons.push("Experience matches");
        }

        // Salary match
        if (userProfile.preferredSalary && job.salaryMax) {
          if (job.salaryMax >= userProfile.preferredSalary) {
            score += 15; // 15% weight for salary
            reasons.push("Salary in range");
          }
        }

        return {
          ...job,
          matchScore: Math.round(score),
          matchReasons: reasons,
        };
      });

      // Sort by match score
      jobsWithScore.sort((a, b) => b.matchScore - a.matchScore);

      return res.json({
        success: true,
        count: jobsWithScore.length,
        jobs: jobsWithScore,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};

module.exports = jobsController;