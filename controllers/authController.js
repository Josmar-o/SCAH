const bcrypt = require('bcrypt');

exports.login = (req, res, connection) => {
    const { correo, contrasena } = req.body;

    const query = `SELECT * FROM usuarios WHERE correo = ?`;
    connection.query(query, [correo], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error en el servidor' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
        }

        const user = results[0];
        bcrypt.compare(contrasena, user.contrasena, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ message: 'Error al verificar la contraseña' });
            }

            if (!isMatch) {
                return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
            }

            res.status(200).json({ message: 'Login exitoso', user });
        });
    });
};

exports.register = (req, res, connection) => {
    const { nombre, correo, contrasena, identificacion, rol } = req.body;

    // Hash the password
    bcrypt.hash(contrasena, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).json({ message: 'Error al encriptar la contraseña' });
        }

        const query = `
            INSERT INTO usuarios (nombre, correo, contrasena, identificacion, rol)
            VALUES (?, ?, ?, ?, ?)
        `;
        connection.query(query, [nombre, correo, hashedPassword, identificacion, rol], (err, results) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'El correo ya está registrado' });
                }
                return res.status(500).json({ message: 'Error en el servidor' });
            }

            res.status(201).json({ message: 'Usuario registrado exitosamente' });
        });
    });
};