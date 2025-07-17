const express = require('express');
const router = express.Router();
const cupoController = require('../controllers/cupoController');

module.exports = (connection) => {
  // Crear cupos (POST)
  router.post('/crear', (req, res) => {
    cupoController.crearCupos(req, res, connection);
  });

  // Obtener cupos por médico y fecha (GET)
  router.get('/por-medico', (req, res) => {
    cupoController.getCuposPorMedico(req, res, connection);
  });

  // Obtener cupos disponibles por especialidad (GET)
  router.get('/disponibles', (req, res) => {
    cupoController.getCuposDisponibles(req, res, connection);
  });

  // Obtener todos los cupos (GET)
  router.get('/todos', (req, res) => {
    cupoController.getTodosCupos(req, res, connection);
  });
  
    router.get('/medicos-disponibles', (req, res) => {
    cupoController.getMedicosDisponibles(req, res, connection);
  });

  router.get('/horas-disponibles', (req, res) => {
  cupoController.getHorasDisponibles(req, res, connection);
  });

  router.get('/fechas-disponibles', (req, res) => {
  cupoController.getFechasDisponibles(req, res, connection);
});

  return router;
};