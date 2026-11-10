/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts route access to specific roles ('admin', 'trainer', 'member').
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This action requires one of the following roles: [${roles.join(', ')}]. Your current role is '${req.user.role}'.`
      });
    }

    next();
  };
}

module.exports = {
  requireRole
};
