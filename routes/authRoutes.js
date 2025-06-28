const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

module.exports = (connection) => {
    router.post('/login', (req, res) => authController.login(req, res, connection));
    router.post('/register', (req, res) => authController.register(req, res, connection));
    router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res, connection)); 
    router.post('/reset-password', (req, res) => authController.resetPassword(req, res, connection));
    router.post('/verificar-token', (req, res) => authController.verificarToken(req, res, connection));
    router.post('/datos-usuario', (req, res) => authController.getDatosUsuario(req, res, connection));
    return router;
};
