function requireViewAccess(allowedRoles) {
  return function(req, res, next) {
    console.log('🔒 Middleware requireViewAccess ejecutado');
    console.log('   📍 URL solicitada:', req.url);
    console.log('   � Ruta original:', req.originalUrl);
    console.log('   �👤 Sesión:', {
      cedula: req.session?.cedula,
      rol: req.session?.rol,
      existeSesion: !!req.session
    });
    console.log('   🎭 Roles permitidos:', allowedRoles);

    // Verificar si hay sesión activa
    if (!req.session || !req.session.cedula || !req.session.rol) {
      console.log('   ❌ Sin sesión activa, redirigiendo al login');
      return res.redirect('/views/vista_general/loginRegistrarse.html');
    }

    // Verificar si el rol tiene acceso a esta vista
    if (!allowedRoles.includes(req.session.rol)) {
      console.log('   ❌ Rol no autorizado. Rol actual:', req.session.rol, 'Roles permitidos:', allowedRoles);
      
      // Redirigir al dashboard correspondiente según su rol
      switch(req.session.rol) {
        case 'paciente':
          console.log('   🔄 Redirigiendo médico/admin a dashboard de paciente');
          return res.redirect('/views/vista_paciente/dashboardPaciente.html');
        case 'medico':
          console.log('   🔄 Redirigiendo paciente/admin a dashboard de médico');
          return res.redirect('/views/vista_medico/vistaMedico.html');
        case 'administrativo':
          console.log('   🔄 Redirigiendo paciente/médico a dashboard administrativo');
          return res.redirect('/views/vista_administrativo/dashboardAdministrativo.html');
        default:
          console.log('   🔄 Rol desconocido, redirigiendo al login');
          return res.redirect('/views/vista_general/loginRegistrarse.html');
      }
    }

    console.log('   ✅ Acceso autorizado para rol:', req.session.rol);
    next();
  };
}

module.exports = requireViewAccess;
