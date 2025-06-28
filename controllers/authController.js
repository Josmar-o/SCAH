const bcrypt = require('bcrypt'); //Se debe instalar antes de usarlo: npm install bcrypt
const nodemailer = require('nodemailer'); // Se debe instalar antes de usarlo: npm install nodemailer
const crypto = require('crypto'); //Se debe instalar antes de usarlo: npm install crypto

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
            if (err || !isMatch) {
                return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
            }
            res.status(200).json({ message: 'Login exitoso', user });
        });
    });
};

exports.register = (req, res, connection) => {
    const {
        cedula, primer_nombre, segundo_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, telefono, correo,
        direccion, contrasena
    } = req.body;

    const insertarPaciente = `
        INSERT INTO Paciente (
            cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
            fecha_nacimiento, telefono, correo, direccion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertarUsuario = `
        INSERT INTO usuarios (
            cedula,primer_nombre,primer_apellido, correo, contrasena
        ) VALUES (?, ?, ?, ?, ?)
    `;

    // Insertar paciente
    connection.query(insertarPaciente, [
        cedula, primer_nombre, segundo_nombre, primer_apellido,
        segundo_apellido, fecha_nacimiento, telefono, correo, direccion
    ], (err, result1) => {
        if (err) {
            console.error('Error al insertar paciente:', err);
            return res.status(500).json({ message: 'Error al registrar paciente' });
        }
        
        // Encriptar la contraseña
        bcrypt.hash(contrasena, 10, (err, hash) => {
            if (err) {
                return res.status(500).json({ message: 'Error al encriptar la contraseña' });
            }
            // Insertar usuario con la contraseña encriptada (hash)
            connection.query(
                insertarUsuario,
                [cedula,primer_nombre, segundo_nombre, correo, hash],
                (err2, result2) => {
                    if (err2) {
                        console.error('Error al insertar usuario:', err2);
                        return res.status(500).json({ message: 'Paciente creado, pero error al crear usuario' });
                    }
                    return res.status(200).json({ message: 'Registro exitoso' });
                }
            );
        });
    });
};

// Función para manejar el restablecimiento de contraseña
exports.forgotPassword = (req, res, connection) => {
    const { correo } = req.body;
    connection.query('SELECT * FROM usuarios WHERE correo = ?', [correo], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error en el servidor.' });
        }

        // Siempre responde igual para no revelar si el correo existe o no
        if (results.length === 0) {
            return res.json({ message: 'Si el correo existe, se ha enviado un enlace para restablecer la contraseña.' });
        }

        // 1. Generar token seguro
        const token = crypto.randomBytes(32).toString('hex');
        const tokenExpira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        // 2. Guardar token y expiración en la base de datos (puedes crear campos en tu tabla usuarios)
        connection.query(
            'UPDATE usuarios SET reset_token = ?, reset_expires = ? WHERE correo = ?',
            [token, tokenExpira, correo],
            (err2) => {
                if (err2) {
                    return res.status(500).json({ message: 'Error al guardar el token.' });
                }

                // 3. Enviar correo con el enlace de recuperación
                const resetUrl = `http://localhost:3000/vista_general/reset-password.html?token=${token}`;
                // Configuracion del transportador de nodemailer
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'abdelbarbaebay@gmail.com', // Correo del remitente
                        pass: 'upfo nxxm uaqk bifh' // Contraseña del remitente (app password si usas autenticación de dos factores)

                        //upfo nxxm uaqk bifh
                    }
                });

                const mailOptions = {
                from: '"SCAH" <abdelbarbaebay@gmail.com>',
                to: correo,
                subject: 'Recupera tu contraseña',
                html: `
                    <div style="font-family: 'Questrial', Arial, sans-serif; color: #333; background: #f9fafb; padding: 24px; border-radius: 8px; border: 1px solid #e0e0e0;">
                        <h2 style="color: #004f98; margin-top: 0;">Solicitud de restablecimiento de contraseña</h2>
                        <p>Hola,</p>
                        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <b>SCAH</b>.</p>
                        <p>Para crear una nueva contraseña, haz clic en el siguiente botón o copia y pega el enlace en tu navegador:</p>
                        <p style="text-align: center; margin: 24px 0;">
                            <a href="${resetUrl}" style="background: #2d93d5; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Restablecer contraseña</a>
                        </p>
                        <p style="word-break: break-all;">${resetUrl}</p>
                        <p style="color: #d32f2f;"><b>Este enlace expirará en 1 hora.</b></p>
                        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
                        <p style="font-size: 0.95em; color: #888;">Este mensaje fue enviado automáticamente, por favor no respondas a este correo.</p>
                    </div>
                `
            };

                transporter.sendMail(mailOptions, (error, info) => {
                    // Siempre responde igual, aunque falle el envío
                    return res.json({ message: 'Si el correo existe, se ha enviado un enlace para restablecer la contraseña.' });
                });
            }
        );
    });
};

//Función para manejar el restablecimiento de contraseña
exports.resetPassword = (req, res, connection) => {
    const { token, nueva } = req.body;
    // 1. Buscar usuario con ese token y que no haya expirado
    connection.query(
        'SELECT * FROM usuarios WHERE reset_token = ? AND reset_expires > NOW()',
        [token],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Error en el servidor.' });
            if (results.length === 0) return res.status(400).json({ message: 'Token inválido o expirado.' });

            // 2. Encriptar la nueva contraseña
            bcrypt.hash(nueva, 10, (err, hash) => {
                if (err) return res.status(500).json({ message: 'Error al encriptar la contraseña.' });

                // 3. Actualizar contraseña y limpiar el token
                connection.query(
                    'UPDATE usuarios SET contrasena = ?, reset_token = NULL, reset_expires = NULL WHERE reset_token = ?',
                    [hash, token],
                    (err2) => {
                        if (err2) return res.status(500).json({ message: 'Error al actualizar la contraseña.' });
                        return res.json({ message: 'Contraseña restablecida con éxito.' });
                    }
                );
            });
        }
    );
};

// Función que verifique si el token existe
exports.verificarToken = (req, res, connection) => {
const { token } = req.body;
connection.query(
    'SELECT * FROM usuarios WHERE reset_token = ? AND reset_expires > NOW()',
    [token],
    (err, results) => {
    if (err) return res.status(500).json({ message: 'Error en el servidor.' });
    if (results.length === 0) return res.status(400).json({ message: 'Token inválido o expirado' });
    return res.json({ message: 'Token válido' });
    }
);
};

// Función para obtener los datos del usuario
exports.getDatosUsuario = (req, res, connection) => {
    const { correo } = req.body;
    connection.query(
        'SELECT primer_nombre, primer_apellido FROM usuarios WHERE correo = ?',
        [correo],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Error en el servidor.' });
            if (results.length === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });
            return res.json(results[0]);
        }
    );
};