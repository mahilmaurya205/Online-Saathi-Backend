const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
  try {
    const host = req.get("host");
    console.log("Tenant middleware - host:", host);

    if (!host) {
      return res.status(400).json({
        success: false,
        message: "Host header missing"
      });
    }

    // ✅ STEP 1: Allow Render domain (IMPORTANT FIX)
    if (host.includes("onrender.com")) {
      console.log("Bypassing tenant check for Render domain");

      const fallbackTenant =
        await prisma.tenant.findFirst({
          where: { domain: "os.dpinfoserver.co.in" }
        }) || await prisma.tenant.findFirst();

      if (fallbackTenant) {
        req.tenant_id = fallbackTenant.id;
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
      const fallbackTenant =
        await prisma.tenant.findFirst({
          where: { domain: "os.dpinfoserver.co.in" }
        }) || await prisma.tenant.findFirst();

      if (fallbackTenant) {
        console.log("Using fallback tenant:", fallbackTenant.id);
        req.tenant_id = fallbackTenant.id;
        return next();
      }

      console.warn(`Tenant not found for: ${host}`);
      return res.status(403).json({
        success: false,
        message: "Invalid domain"
      });
    }

    // ✅ STEP 4: Valid tenant
    req.tenant_id = tenant.id;
    console.log("Tenant found:", tenant.id);

    next();
  } catch (err) {
    console.error("Tenant middleware error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message
    });
  }
};