const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Public paths that don't need tenant check
const PUBLIC_PATHS = [
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/api/auth/login',
  '/api/auth/register',
  '/api/health',
  '/api-docs'
];

module.exports = async (req, res, next) => {
  try {
    const host = req.get("host");
    console.log("Tenant middleware - host:", host);
    console.log("Tenant middleware - path:", req.path);

    // Skip tenant check for public paths
    if (PUBLIC_PATHS.some(path => req.path.startsWith(path))) {
      console.log("Skipping tenant check for public path:", req.path);
      // Use default tenant
      try {
        const defaultTenant = await prisma.tenant.findFirst();
        if (defaultTenant) {
          req.tenant_id = defaultTenant.id;
        }
      } catch (e) {
        console.log("Could not fetch default tenant, continuing anyway");
      }
      return next();
    }

    if (!host) {
      return res.status(400).json({
        success: false,
        message: "Host header missing"
      });
    }

    // ✅ STEP 1: Allow Render domain (IMPORTANT FIX)
    if (host.includes("onrender.com") || host.includes("render.com")) {
      console.log("Bypassing tenant check for Render domain");

      try {
        const fallbackTenant =
          await prisma.tenant.findFirst({
            where: { domain: "os.dpinfoserver.co.in" }
          }) || await prisma.tenant.findFirst();

        if (fallbackTenant) {
          console.log("Using fallback tenant for Render:", fallbackTenant.id);
          req.tenant_id = fallbackTenant.id;
          return next();
        }
      } catch (dbError) {
        console.error("Database error in tenant middleware:", dbError.message);
        // If database fails, still allow request (temporary)
        console.log("Database unavailable, allowing request to proceed");
        req.tenant_id = null;
        return next();
      }
    }

    // ✅ STEP 2: Normal domain check
    let domain = host;

    let tenant = await prisma.tenant.findUnique({
      where: { domain }
    });

    // Try without port (for localhost)
    if (!tenant && domain.includes(":")) {
      domain = domain.split(":")[0];
      tenant = await prisma.tenant.findUnique({
        where: { domain }
      });
    }

    // ✅ STEP 3: Fallback (even in production)
    if (!tenant) {
      try {
        const fallbackTenant =
          await prisma.tenant.findFirst({
            where: { domain: "os.dpinfoserver.co.in" }
          }) || await prisma.tenant.findFirst();

        if (fallbackTenant) {
          console.log("Using fallback tenant:", fallbackTenant.id);
          req.tenant_id = fallbackTenant.id;
          return next();
        }
      } catch (dbError) {
        console.error("Database error in fallback:", dbError.message);
      }

      console.warn(`Tenant not found for: ${host}`);
      
      // TEMPORARY: Allow request if no tenant found (for testing)
      // Remove this in production once tenant is properly configured
      console.log("No tenant found but allowing request for testing");
      req.tenant_id = null;
      return next();
      
      // Uncomment below for strict tenant checking:
      // return res.status(403).json({
      //   success: false,
      //   message: "Invalid domain"
      // });
    }

    // ✅ STEP 4: Valid tenant
    req.tenant_id = tenant.id;
    console.log("Tenant found:", tenant.id);

    next();
  } catch (err) {
    console.error("Tenant middleware error:", err);
    // TEMPORARY: Allow request on error (for testing)
    req.tenant_id = null;
    return next();
    
    // Uncomment below for strict error handling:
    // res.status(500).json({
    //   success: false,
    //   message: "Internal server error",
    //   error: err.message
    // });
  }
};