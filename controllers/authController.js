// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Pass the DB connection from app.js
exports.login = (req, res, connection) => {
    const { correo, contrasena } = req.body;

    const query = 'SELECT * FROM usuarios WHERE correo = ?';
    connection.query(query, [correo], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error en el servidor' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Correo no registrado' });
        }

        const user = results[0];

        const match = await bcrypt.compare(contrasena, user.contrasena);
        if (!match) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: user.id, rol: user.rol },
            'secret_key', // ideally use process.env.JWT_SECRET
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            usuario: {
                id: user.id,
                nombre: user.nombre,
                rol: user.rol
            }
        });
    });
};
