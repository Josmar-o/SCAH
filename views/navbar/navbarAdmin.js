export async function cargarNavbar() {
  const contenedor = document.getElementById('navbar-container');
  if (!contenedor) return;
  const res = await fetch('/scah/navbar/navbarAdmin.html');
  const html = await res.text();
  contenedor.innerHTML = html;

  const cerrarSesion = document.getElementById('cerrarSesion');
  if (cerrarSesion) {
    cerrarSesion.addEventListener('click', async function(e) {
      e.preventDefault();
      try {
        await fetch('/scah/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
      window.location.replace('/scah/vista_general/loginRegistrarse.html');
    });
  }
}