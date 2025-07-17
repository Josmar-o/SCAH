const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const requireLogin = require('../middlewares/requireLogin');
const requireRole = require('../middlewares/requireRole');

module.exports = (connection) => {
  // Solo administrativos pueden ver usuarios
  router.get('/listar', requireLogin, requireRole(['administrativo']), (req, res) =>
    usuariosController.listarUsuarios(req, res, connection)
  );
  
  // Solo administrativos pueden editar usuarios
  router.put('/editar/:cedula', requireLogin, requireRole(['administrativo']), (req, res) =>
    usuariosController.editarUsuario(req, res, connection)
  );
  
  // Solo administrativos pueden eliminar usuarios
  router.delete('/eliminar/:cedula', requireLogin, requireRole(['administrativo']), (req, res) =>
    usuariosController.eliminarUsuario(req, res, connection)
  );
  
  return router;
};