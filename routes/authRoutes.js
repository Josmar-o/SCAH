const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const medicoController = require('../controllers/medicoController');
const requireLogin = require('../middlewares/requireLogin');

module.exports = (connection) => {
    // Rutas públicas (sin protección)
    router.post('/login', (req, res) => authController.login(req, res, connection));
    router.post('/register', (req, res) => authController.register(req, res, connection));
    router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res, connection)); 
    router.post('/reset-password', (req, res) => authController.resetPassword(req, res, connection));
    router.post('/verificar-paciente', (req, res) => authController.verificarPaciente(req, res, connection));
    router.post('/verificar-paciente-cedula', (req, res) => authController.verificarPacienteCedula(req, res, connection));

    // Rutas protegidas (requieren autenticación)
    router.post('/datos-usuario', requireLogin, (req, res) => authController.getDatosUsuario(req, res, connection));
    router.post('/citas-paciente', requireLogin, (req, res) => authController.getCitasPaciente(req, res, connection));
    router.post('/historial-citas', requireLogin, (req, res) => authController.getHistorialCitas(req, res, connection));
    router.post('/detalle-atencion-tiquete', requireLogin, (req, res) => authController.getDetalleAtencionPorTiquete(req, res, connection));


    //RUTA PROTEGIDA PARA PERFIL:
    router.post('/perfil-usuario', requireLogin, (req, res) => authController.getPerfilUsuario(req, res, connection));
    
    // Ruta para actualizar perfil
    router.put('/actualizar-perfil', requireLogin, (req, res) => authController.actualizarPerfil(req, res, connection));

    // Agregar estas nuevas rutas

    // Rutas para fotos
    router.post('/subir-foto', requireLogin, (req, res) => authController.subirFoto(req, res, connection));
    router.post('/eliminar-foto', requireLogin, (req, res) => authController.eliminarFoto(req, res, connection));
    
    // Ruta para verificar sesión
    router.get('/verificar-sesion', (req, res) => authController.verificarSesion(req, res));
        
    // Ruta de logout (MOVER DENTRO DEL MÓDULO)
    router.post('/logout', (req, res) => authController.logout(req, res));

    return router;
};

