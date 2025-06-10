// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

module.exports = (connection) => {
    router.post('/login', (req, res) => authController.login(req, res, connection));
    return router;
};
