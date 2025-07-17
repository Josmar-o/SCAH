function requireRole(roles) {
  return function(req, res, next) {
    if (!req.session.rol || !roles.includes(req.session.rol)) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    next();
  };
}

module.exports = requireRole;