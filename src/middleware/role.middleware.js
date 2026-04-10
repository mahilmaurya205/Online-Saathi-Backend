const checkRole = (allowed) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "unauthorized" });

    // Check if user has any of the allowed roles
    // Use roles array if it has items, otherwise fall back to single role
    const userRoles = (req.user.roles && req.user.roles.length > 0) 
      ? req.user.roles 
      : [req.user.role];
    const hasAllowedRole = userRoles.some(role => allowed.includes(role));

    if (!hasAllowedRole) {
      return res.status(403).json({ message: "forbidden" });
    }

    next();
  };
};

module.exports = { checkRole };
