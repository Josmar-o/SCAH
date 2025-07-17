const express = require('express');
const citaController = require('../controllers/citaController');
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');

module.exports = (connection) => {
    const router = express.Router();

    // Ruta para crear cita
    router.post('/crear-cita', (req, res) => citaController.crearCita(req, res, connection));
    
    // Ruta para crear cita desde panel administrativo (requiere autenticación y rol administrativo)
    router.post('/crear-cita-admin', requireLogin, requireRole(['administrativo']), (req, res) => citaController.crearCitaAdmin(req, res, connection));
    
    // Ruta para listar citas con filtros y paginación
    router.get('/listar', (req, res) => citaController.listarCitas(req, res, connection));
    
    // Ruta para obtener datos de filtros
    router.get('/filtros', (req, res) => citaController.obtenerDatosFiltros(req, res, connection));
    
    // Ruta para verificar cupos disponibles
    router.get('/verificar-cupos', (req, res) => citaController.verificarCuposDisponibles(req, res, connection));
    
    // Ruta para editar cita
    router.put('/editar/:id', (req, res) => citaController.editarCita(req, res, connection));
    
    // Ruta para cancelar cita
    router.put('/cancelar/:id', (req, res) => citaController.cancelarCita(req, res, connection));

    return router;
};