function requireViewAccess(allowedRoles) {
  return function(req, res, next) {
    // Verificar si hay sesión activa
    if (!req.session || !req.session.cedula || !req.session.rol) {
      console.log('❌ Sin sesión activa, redirigiendo al login');
      return res.redirect('/scah/vista_general/loginRegistrarse.html');
    }

    // Verificar si el rol tiene acceso a esta vista
    if (!allowedRoles.includes(req.session.rol)) {
      console.log('❌ Rol no autorizado:', req.session.rol, '- Permitidos:', allowedRoles);
      
      // Redirigir al dashboard correspondiente según su rol
      switch(req.session.rol) {
        case 'paciente':
          return res.redirect('/scah/vista_paciente/dashboardPaciente.html');
        case 'medico':
          return res.redirect('/scah/vista_medico/vistaMedico.html');
        case 'administrativo':
          return res.redirect('/scah/vista_administrativo/dashboardAdministrativo.html');
        default:
          return res.redirect('/scah/vista_general/loginRegistrarse.html');
      }
    }

    console.log('✅ Acceso autorizado:', req.session.rol, '→', req.url);
    next();
  };
}

module.exports = requireViewAccess;
