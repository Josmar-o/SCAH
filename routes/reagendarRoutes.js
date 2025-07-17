const express = require('express');
const router = express.Router();
const reagendarController = require('../controllers/reagendarController');
const requireLogin = require('../middlewares/requireLogin');

module.exports = (connection) => {
  router.post('/reagendar-cita', requireLogin, (req, res) => reagendarController.reagendarCita(req, res, connection));
  router.post('/cancelar-cita', requireLogin, (req, res) => reagendarController.cancelarCita(req, res, connection));
  return router;
};