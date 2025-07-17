const express = require('express');
const router = express.Router();
const medicoController = require('../controllers/medicoController');
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');

module.exports = (connection) => {
    // Todas las rutas aquí requieren ser médico autenticado
    router.post('/datos-medico', requireLogin, requireRole(['medico']), (req, res) => medicoController.getDatosMedico(req, res, connection));
    router.post('/proximas-citas-medico', requireLogin, requireRole(['medico']), (req, res) => medicoController.getProximasCitas(req, res, connection));
    router.post('/citas-por-fecha', requireLogin, requireRole(['medico']), (req, res) => medicoController.getCitasPorFecha(req, res, connection));
    router.post('/detalle-cita', requireLogin, requireRole(['medico']), (req, res) => medicoController.getDetalleCita(req, res, connection));
    router.post('/guardar-observacion', requireLogin, requireRole(['medico']), (req, res) => medicoController.guardarObservacion(req, res, connection));
    router.get('/todos', (req, res) => medicoController.getTodosMedicos(req, res, connection));
    // Obtener especialidades únicas (no requiere login)
    router.get('/especialidades', (req, res) => medicoController.getEspecialidades(req, res, connection));

    // Obtener médicos por especialidad (no requiere login)
    router.get('/por-especialidad', (req, res) => medicoController.getMedicosPorEspecialidad(req, res, connection));
    // Agrega aquí más rutas de médico si las necesitas
    return router;
};