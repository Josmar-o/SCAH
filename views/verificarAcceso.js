// Función para verificar acceso a vistas específicas por rol
async function verificarAccesoVista(rolRequerido) {
  try {
    const response = await fetch('/scah/api/auth/verificar-sesion');
    const data = await response.json();
    
    if (!response.ok || !data.autenticado) {
      // No está autenticado, redirigir al login
      window.location.replace('/views/vista_general/loginRegistrarse.html');
      return false;
    }
    
    if (data.rol !== rolRequerido) {
      // Tiene un rol diferente, redirigir a su dashboard correspondiente
      switch(data.rol) {
        case 'paciente':
          window.location.replace('/views/vista_paciente/dashboardPaciente.html');
          break;
        case 'medico':
          window.location.replace('/views/vista_medico/vistaMedico.html');
          break;
        case 'administrativo':
          window.location.replace('/views/vista_administrativo/dashboardAdministrativo.html');
          break;
        default:
          window.location.replace('/views/vista_general/loginRegistrarse.html');
      }
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al verificar acceso:', error);
    window.location.replace('/views/vista_general/loginRegistrarse.html');
    return false;
  }
}

// Función para verificar acceso al cargar la página
function initVerificacionAcceso(rolRequerido) {
  document.addEventListener('DOMContentLoaded', async () => {
    await verificarAccesoVista(rolRequerido);
  });
}

// Exportar funciones para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { verificarAccesoVista, initVerificacionAcceso };
}
