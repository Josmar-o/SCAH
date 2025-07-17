function requireLogin(req, res, next) {

  if (!req.session.cedula) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  next();
}

module.exports = requireLogin;