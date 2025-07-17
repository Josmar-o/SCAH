const express = require('express');
const router = express.Router();
const perfilController = require('../controllers/perfilController');
const requireLogin = require('../middlewares/requireLogin');

module.exports = (connection) => {
  // Todas las rutas del perfil requieren autenticación
router.use(requireLogin);

  // Obtener perfil del usuario
router.post('/obtener-perfil', (req, res) => {
    perfilController.getPerfilUsuario(req, res, connection);
});

  // Subir foto de perfil
router.post('/subir-foto', (req, res) => {
    perfilController.subirFoto(req, res, connection);
});

  // Eliminar foto de perfil
router.post('/eliminar-foto', (req, res) => {
    perfilController.eliminarFoto(req, res, connection);
});

  // Actualizar datos del perfil
router.post('/actualizar-perfil', (req, res) => {
    perfilController.actualizarPerfil(req, res, connection);
});

  // Cambiar contraseña
router.post('/cambiar-contrasena', (req, res) => {
    perfilController.cambiarContrasena(req, res, connection);
});

return router;
};