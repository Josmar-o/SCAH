const bcrypt = require('bcryptjs'); //Se debe instalar antes de usarlo: npm install bcryptjs
const nodemailer = require('nodemailer'); // Se debe instalar antes de usarlo: npm install nodemailer
const crypto = require('crypto'); //Se debe instalar antes de usarlo: npm install crypto
const multer = require('multer'); // Se debe instalar antes de usarlo: npm install multer
const path = require('path'); //Modulo nativo de Node.js para manejar rutas de archivos
const fs = require('fs'); // Módulo nativo de Node.js para manejar el sistema de archivos

// Función para validar contraseña
function validarContrasena(password) {
  const errores = [];
  
  // Validar longitud
  if (password.length < 8) {
    errores.push('Debe tener al menos 8 caracteres');
  }
  if (password.length > 16) {
    errores.push('No puede tener más de 16 caracteres');
  }
  
  // Validar que tenga al menos un número
  if (!/\d/.test(password)) {
    errores.push('Debe contener al menos 1 número');
  }
  
  // Validar que tenga al menos un símbolo
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errores.push('Debe contener al menos 1 símbolo (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }
  
  return {
    valida: errores.length === 0,
    errores: errores,
    mensaje: errores.length === 0 ? 'Contraseña válida' : errores.join(', ')
  };
}

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/fotos');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const cedula = req.session.cedula;
    const extension = path.extname(file.originalname);
    cb(null, `perfil_${cedula}_${Date.now()}${extension}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

// Función para subir foto
exports.subirFoto = (req, res, connection) => {
upload.single('foto')(req, res, (err) => {
    if (err) {
    return res.status(400).json({ message: err.message });
    }

    const cedula = req.session.cedula;
    const fotoUrl = `/uploads/fotos/${req.file.filename}`;

    // ✅ PRIMERO: Obtener la foto anterior para eliminarla
    connection.query(
    'SELECT foto_perfil FROM Paciente WHERE cedula = ?',
    [cedula],
    (err, results) => {
        if (err) {
        console.error('Error al obtener foto anterior:', err);
        return res.status(500).json({ message: 'Error del servidor' });
        }

        const fotoAnterior = results[0]?.foto_perfil;

        // ✅ SEGUNDO: Actualizar en la base de datos
        connection.query(
        'UPDATE Paciente SET foto_perfil = ? WHERE cedula = ?',
        [fotoUrl, cedula],
        (err, results) => {
            if (err) {
            console.error('Error al actualizar foto:', err);
            return res.status(500).json({ message: 'Error al guardar la foto' });
            }

            // ✅ TERCERO: Eliminar la foto anterior del disco (si existe)
            if (fotoAnterior) {
            const fotoAnteriorPath = path.join(__dirname, '..', fotoAnterior);
            fs.unlink(fotoAnteriorPath, (err) => {
                if (err) {
                console.error('Error al eliminar foto anterior:', err);
                // No retornar error, continuar con la respuesta
                }
            });
            }

            res.json({ fotoUrl: fotoUrl });
        }
        );
    }
    );
});
};

// Función para eliminar foto
exports.eliminarFoto = (req, res, connection) => {
const cedula = req.session.cedula;

// Obtener la foto actual
connection.query(
    'SELECT foto_perfil FROM Paciente WHERE cedula = ?',
    [cedula],
    (err, results) => {
    if (err) {
        console.error('Error al obtener foto actual:', err);
        return res.status(500).json({ message: 'Error del servidor' });
    }
    
    if (results.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    const fotoActual = results[0]?.foto_perfil;
    
    // Actualizar en la base de datos
    connection.query(
        'UPDATE Paciente SET foto_perfil = NULL WHERE cedula = ?',
        [cedula],
        (err, results) => {
        if (err) {
            console.error('Error al eliminar foto de BD:', err);
            return res.status(500).json({ message: 'Error al eliminar la foto' });
        }
        
        // ✅ ELIMINAR archivo físico
        if (fotoActual) {
            const filePath = path.join(__dirname, '..', fotoActual);
            fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error al eliminar archivo físico:', err);
                // No retornar error, continuar con la respuesta
            } else {
                console.log('✅ Archivo eliminado exitosamente:', filePath);
            }
            });
        }
        
        res.json({ message: 'Foto eliminada exitosamente' });
        }
    );
    }
);
};

// Función para obtener datos del usuario
exports.getPerfilUsuario = (req, res, connection) => {
  const cedula = req.session.cedula;
  
  connection.query(
    'SELECT primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, cedula, correo, telefono, direccion, fecha_nacimiento, foto_perfil FROM Paciente WHERE cedula = ?',
    [cedula],
    (err, results) => {
      if (err) {
        console.error('Error al obtener perfil:', err);
        return res.status(500).json({ message: 'Error en el servidor.' });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      
      const usuario = results[0];
      return res.json({ 
        usuario: {
          ...usuario,
          nombre_completo: `${usuario.primer_nombre} ${usuario.segundo_nombre || ''} ${usuario.primer_apellido} ${usuario.segundo_apellido || ''}`.trim()
        }
      });
    }
  );
};




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
            
            // AGREGAR LOGS AQUÍ:
            
            req.session.cedula = user.cedula;
            req.session.correo = user.correo;
            req.session.rol = user.rol;

            // VERIFICAR QUE SE GUARDÓ:

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

    // Validar que todos los campos obligatorios estén presentes
    if (!cedula || !primer_nombre || !primer_apellido || !fecha_nacimiento || 
        !telefono || !correo || !contrasena) {
        return res.status(400).json({ 
            message: 'Todos los campos obligatorios deben estar completos' 
        });
    }

    // Validar formato de email
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(correo)) {
        return res.status(400).json({ 
            message: 'Formato de correo electrónico no válido' 
        });
    }

    // Validar contraseña usando nuestra función
    const resultadoContrasena = validarContrasena(contrasena);
    if (!resultadoContrasena.valida) {
        return res.status(400).json({ 
            message: `Contraseña no válida: ${resultadoContrasena.mensaje}` 
        });
    }

    // Verificar si ya existe un usuario con esa cédula o correo
    connection.query(
        'SELECT * FROM usuarios WHERE cedula = ? OR correo = ?',
        [cedula, correo],
        (err, results) => {
            if (err) {
                console.error('Error al verificar usuario:', err);
                return res.status(500).json({ message: 'Error del servidor' });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ 
                    message: 'Ya existe un usuario registrado con esta cédula o correo electrónico' 
                });
            }

            // Generar código de verificación de 6 dígitos y token seguro
            const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();
            const tokenVerificacion = crypto.randomBytes(32).toString('hex');
            const expiracion = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

            // Encriptar la contraseña
            bcrypt.hash(contrasena, 10, (err, hash) => {
                if (err) {
                    return res.status(500).json({ message: 'Error al encriptar la contraseña' });
                }

                // Crear tabla temporal si no existe
                const crearTablaTemporal = `
                    CREATE TABLE IF NOT EXISTS registros_pendientes (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        cedula VARCHAR(20) NOT NULL,
                        primer_nombre VARCHAR(50) NOT NULL,
                        segundo_nombre VARCHAR(50),
                        primer_apellido VARCHAR(50) NOT NULL,
                        segundo_apellido VARCHAR(50),
                        fecha_nacimiento DATE NOT NULL,
                        telefono VARCHAR(20) NOT NULL,
                        correo VARCHAR(100) NOT NULL,
                        direccion TEXT,
                        contrasena VARCHAR(255) NOT NULL,
                        codigo_verificacion VARCHAR(6) NOT NULL,
                        token_verificacion VARCHAR(64) NOT NULL,
                        expiracion DATETIME NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY unique_cedula (cedula),
                        UNIQUE KEY unique_correo (correo),
                        UNIQUE KEY unique_token (token_verificacion)
                    )
                `;

                connection.query(crearTablaTemporal, (err) => {
                    if (err) {
                        console.error('Error al crear tabla temporal:', err);
                        return res.status(500).json({ message: 'Error del servidor' });
                    }

                    // Intentar agregar columna token_verificacion si no existe
                    const agregarColumnaToken = `
                        ALTER TABLE registros_pendientes 
                        ADD COLUMN token_verificacion VARCHAR(64) NOT NULL UNIQUE
                    `;

                    connection.query(agregarColumnaToken, (errAlter) => {
                        // Ignorar el error si la columna ya existe (errno 1060 = columna duplicada)
                        if (errAlter && errAlter.errno !== 1060) {
                            console.log('Nota al agregar columna token:', errAlter.message);
                        }
                    });

                    // Guardar datos temporalmente
                    const insertarTemporal = `
                        INSERT INTO registros_pendientes (
                            cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
                            fecha_nacimiento, telefono, correo, direccion, contrasena,
                            codigo_verificacion, token_verificacion, expiracion
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            primer_nombre = VALUES(primer_nombre),
                            segundo_nombre = VALUES(segundo_nombre),
                            primer_apellido = VALUES(primer_apellido),
                            segundo_apellido = VALUES(segundo_apellido),
                            fecha_nacimiento = VALUES(fecha_nacimiento),
                            telefono = VALUES(telefono),
                            direccion = VALUES(direccion),
                            contrasena = VALUES(contrasena),
                            codigo_verificacion = VALUES(codigo_verificacion),
                            token_verificacion = VALUES(token_verificacion),
                            expiracion = VALUES(expiracion)
                    `;

                    connection.query(insertarTemporal, [
                        cedula, primer_nombre, segundo_nombre, primer_apellido,
                        segundo_apellido, fecha_nacimiento, telefono, correo, direccion,
                        hash, codigoVerificacion, tokenVerificacion, expiracion
                    ], async (err) => {
                        if (err) {
                            console.error('Error al guardar registro temporal:', err);
                            return res.status(500).json({ message: 'Error al procesar el registro' });
                        }

                        // Enviar correo con código de verificación
                        const emailService = require('./emailService');
                        const resultadoEmail = await emailService.enviarCorreoVerificacion({
                            correo: correo,
                            nombre: `${primer_nombre} ${primer_apellido}`,
                            codigo: codigoVerificacion
                        });

                        if (resultadoEmail.success) {
                            return res.status(200).json({ 
                                message: 'Se ha enviado un código de verificación a tu correo electrónico',
                                token: tokenVerificacion
                            });
                        } else {
                            return res.status(500).json({ 
                                message: 'Error al enviar el correo de verificación. Intenta de nuevo.' 
                            });
                        }
                    });
                });
            });
        }
    );
};

// Función para manejar el envío de correo de recuperación de contraseña
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
                const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/scah/vista_general/reset-password.html?token=${token}`;
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

//Función para restablecer la contraseña
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

// Función para verificar el código de registro
exports.verifyRegistration = (req, res, connection) => {
    const { token, codigo } = req.body;

    if (!token || !codigo) {
        return res.status(400).json({ message: 'Token y código son requeridos' });
    }

    // Buscar el registro pendiente con el token y código válidos
    connection.query(
        'SELECT * FROM registros_pendientes WHERE token_verificacion = ? AND codigo_verificacion = ? AND expiracion > NOW()',
        [token, codigo],
        (err, results) => {
            if (err) {
                console.error('Error al verificar código:', err);
                return res.status(500).json({ message: 'Error del servidor' });
            }

            if (results.length === 0) {
                return res.status(400).json({ message: 'Código inválido o expirado' });
            }

            const registro = results[0];

            // Insertar en la tabla Paciente
            const insertarPaciente = `
                INSERT INTO Paciente (
                    cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
                    fecha_nacimiento, telefono, correo, direccion
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            connection.query(insertarPaciente, [
                registro.cedula, registro.primer_nombre, registro.segundo_nombre, 
                registro.primer_apellido, registro.segundo_apellido, registro.fecha_nacimiento, 
                registro.telefono, registro.correo, registro.direccion
            ], (err) => {
                if (err) {
                    console.error('Error al insertar paciente:', err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ 
                            message: 'Ya existe un paciente registrado con esta cédula o correo' 
                        });
                    }
                    return res.status(500).json({ message: 'Error al crear el paciente' });
                }

                // Insertar en la tabla usuarios
                const insertarUsuario = `
                    INSERT INTO usuarios (
                        cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, contrasena
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                connection.query(insertarUsuario, [
                    registro.cedula, registro.primer_nombre, registro.segundo_nombre,
                    registro.primer_apellido, registro.segundo_apellido, registro.correo, registro.contrasena
                ], (err) => {
                    if (err) {
                        console.error('Error al insertar usuario:', err);
                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(400).json({ 
                                message: 'Ya existe un usuario registrado con esta cédula o correo' 
                            });
                        }
                        return res.status(500).json({ message: 'Paciente creado, pero error al crear usuario' });
                    }

                    // Eliminar el registro pendiente usando el token
                    connection.query(
                        'DELETE FROM registros_pendientes WHERE token_verificacion = ?',
                        [token],
                        (err) => {
                            if (err) {
                                console.error('Error al eliminar registro pendiente:', err);
                                // No fallar aquí, el usuario ya fue creado exitosamente
                            }

                            return res.status(200).json({ 
                                message: 'Cuenta verificada exitosamente. Ya puedes iniciar sesión.' 
                            });
                        }
                    );
                });
            });
        }
    );
};

// Función para obtener los datos del usuario
exports.getDatosUsuario = (req, res, connection) => {
    const cedula = req.session.cedula;
    const rol = req.session.rol;

    if (!cedula || !rol) {
        return res.status(401).json({ message: 'Sesión no válida' });
    }

    // Buscar en la tabla correspondiente según el rol
    let tabla = '';
    let camposSelect = '';
    
    switch (rol) {
        case 'paciente':
            tabla = 'Paciente';
            camposSelect = 'primer_nombre, primer_apellido, cedula, correo';
            break;
        case 'medico':
            tabla = 'Medico';
            camposSelect = 'primer_nombre, primer_apellido, cedula, correo, especialidad';
            break;
        case 'administrativo':
            tabla = 'Administrativo';
            camposSelect = 'primer_nombre, primer_apellido, cedula, correo, cargo';
            break;
        default:
            return res.status(400).json({ message: 'Rol no válido' });
    }

    connection.query(
        `SELECT ${camposSelect} FROM ${tabla} WHERE cedula = ?`,
        [cedula],
        (err, results) => {
            if (err) {
                console.error('Error al obtener datos del usuario:', err);
                return res.status(500).json({ message: 'Error en el servidor.' });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Usuario no encontrado.' });
            }
            
            // Agregar el rol a la respuesta
            const userData = { ...results[0], rol: rol };
            return res.json(userData);
        }
    );
};

// Función para obtener las citas de un paciente
exports.getCitasPaciente = (req, res, connection) => {
    const cedula = req.session.cedula;
    
    // Obtener las citas del paciente con datos del médico
    connection.query(`
        SELECT 
            c.id_cita,
            DATE_FORMAT(c.fecha_cita, '%Y-%m-%d') as fecha_cita,
            TIME_FORMAT(c.hora_cita, '%H:%i:%s') as hora_cita,
            c.estado,
            c.numero_tiquete,
            c.fecha_creacion,
            CONCAT(m.primer_nombre, ' ', m.primer_apellido) as medico_nombre,
            m.especialidad
        FROM Cita c
        LEFT JOIN Medico m ON c.cedula_medico = m.cedula
        WHERE c.cedula_paciente = ?
        ORDER BY c.fecha_cita asc, c.hora_cita asc
    `, [cedula], (err, citasResults) => {
        if (err) {
            console.error('Error al obtener citas:', err);
            return res.status(500).json({ message: 'Error al obtener las citas.' });
        }
    
        // Separar citas futuras y pasadas
        const ahora = new Date();
        const citasFuturas = [];
        const citasPasadas = [];

        citasResults.forEach(cita => {
            // Crear la fecha de la cita de manera más explícita
            const [year, month, day] = cita.fecha_cita.split('-');
            const [hour, minute] = cita.hora_cita.split(':');
            
            const fechaCita = new Date(
                parseInt(year), 
                parseInt(month) - 1, // Los meses en JavaScript empiezan en 0
                parseInt(day), 
                parseInt(hour), 
                parseInt(minute)
            );
            
            if (fechaCita >= ahora) {
                citasFuturas.push(cita);
            } else {
                citasPasadas.push(cita);
            }
        });

        // Ordenar citas futuras ascendente (más cercanas primero)
        citasFuturas.sort((a, b) => {
            const fechaA = new Date(a.fecha_cita + 'T' + a.hora_cita);
            const fechaB = new Date(b.fecha_cita + 'T' + b.hora_cita);
            return fechaA - fechaB;
        });
        
        // Ordenar citas pasadas descendente (más recientes primero)
        citasPasadas.sort((a, b) => {
            const fechaA = new Date(a.fecha_cita + 'T' + a.hora_cita);
            const fechaB = new Date(b.fecha_cita + 'T' + b.hora_cita);
            return fechaB - fechaA;
        });
        
        // Combinar: futuras primero, luego pasadas
        const citasOrdenadas = [...citasFuturas, ...citasPasadas];
        
        return res.json({ citas: citasOrdenadas });
    });
};

// Función para obtener el historial de citas (solo pasadas)

exports.getHistorialCitas = (req, res, connection) => {
    const cedula = req.session.cedula;

    connection.query(`
        SELECT 
            c.id_cita,
            DATE_FORMAT(c.fecha_cita, '%Y-%m-%d') as fecha_cita,
            TIME_FORMAT(c.hora_cita, '%H:%i:%s') as hora_cita,
            c.estado,
            c.numero_tiquete,
            c.fecha_creacion,
            CONCAT(m.primer_nombre, ' ', m.primer_apellido) as medico_nombre,
            m.especialidad
        FROM Cita c
        LEFT JOIN Medico m ON c.cedula_medico = m.cedula
        WHERE c.cedula_paciente = ? 
        AND (
            CONCAT(c.fecha_cita, ' ', c.hora_cita) < NOW()
            OR c.estado IN ('Atendida', 'No asistió')
        )
        ORDER BY c.fecha_cita DESC, c.hora_cita DESC
    `, [cedula], (err, citasResults) => {
        if (err) {
            console.error('Error al obtener historial:', err);
            return res.status(500).json({ message: 'Error al obtener el historial.' });
        }
        return res.json({ citas: citasResults });
    });
};


// Función para obtener detalles de atención médica por número de tiquete
exports.getDetalleAtencionPorTiquete = (req, res, connection) => {
    const { numero_tiquete } = req.body;

    // Verificar que el tiquete no sea undefined o null
    if (!numero_tiquete) {
        return res.status(400).json({ message: 'Número de tiquete no proporcionado.' });
    }
    
    // Primero buscar el id_cita por el número de tiquete
    connection.query(
        'SELECT id_cita FROM Cita WHERE numero_tiquete = ?',
        [numero_tiquete],
        (err, citaResults) => {
            if (err) {
                console.error('Error al buscar cita por tiquete:', err);
                return res.status(500).json({ message: 'Error al buscar la cita.' });
            }
            
            if (citaResults.length === 0) {
                return res.status(404).json({ message: 'No se encontró una cita con ese número de tiquete.' });
            }
            
            const id_cita = citaResults[0].id_cita;
            
            // Ahora buscar la atención médica con ese id_cita
            connection.query(`
                SELECT 
                    am.id_atencion,
                    am.diagnostico,
                    am.observacion,
                    am.prescripcion,
                    am.fecha_atencion,
                    c.fecha_cita,
                    c.hora_cita,
                    c.estado,
                    c.numero_tiquete,
                    CONCAT(m.primer_nombre, ' ', m.primer_apellido) as medico_nombre,
                    m.especialidad
                FROM AtencionMedica am
                INNER JOIN Cita c ON am.id_cita = c.id_cita
                INNER JOIN Medico m ON am.cedula_medico = m.cedula
                WHERE am.id_cita = ?
            `, [id_cita], (err, results) => {
                if (err) {
                    console.error('Error al obtener detalles de atención:', err);
                    return res.status(500).json({ message: 'Error al obtener detalles de atención.' });
                }                
                if (results.length === 0) {
                    return res.status(404).json({ 
                        message: 'No se encontró información de atención para esta cita.',
                        numero_tiquete: numero_tiquete,
                        id_cita: id_cita
                    });
                }
                
                return res.json({ atencion: results[0] });
            });
        }
    );
};

// Función para actualizar perfil del paciente
exports.actualizarPerfil = (req, res, connection) => {
  const cedula = req.session.cedula;
  const { 
    primer_nombre, 
    segundo_nombre, 
    primer_apellido, 
    segundo_apellido, 
    telefono, 
    direccion,
    fecha_nacimiento 
  } = req.body;
  
  // Iniciar transacción para asegurar consistencia
  connection.beginTransaction((err) => {
    if (err) return res.status(500).json({ message: 'Error al iniciar transacción.' });

    // 1. Actualizar en la tabla Paciente
    connection.query(
      `UPDATE Paciente SET 
       primer_nombre = ?, 
       segundo_nombre = ?, 
       primer_apellido = ?, 
       segundo_apellido = ?, 
       telefono = ?, 
       direccion = ?, 
       fecha_nacimiento = ?
       WHERE cedula = ?`,
      [primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono, direccion, fecha_nacimiento, cedula],
      (err, result) => {
        if (err) {
          return connection.rollback(() => {
            console.error('Error al actualizar perfil en Paciente:', err);
            return res.status(500).json({ message: 'Error al actualizar perfil.' });
          });
        }
        
        // 2. También actualizar en la tabla usuarios para mantener sincronización
        connection.query(
          `UPDATE usuarios SET 
           primer_nombre = ?, 
           segundo_nombre = ?, 
           primer_apellido = ?, 
           segundo_apellido = ?
           WHERE cedula = ?`,
          [primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, cedula],
          (err2, result2) => {
            if (err2) {
              return connection.rollback(() => {
                console.error('Error al actualizar perfil en usuarios:', err2);
                return res.status(500).json({ message: 'Error al actualizar información del usuario.' });
              });
            }
            
            // Confirmar transacción
            connection.commit((err3) => {
              if (err3) {
                return connection.rollback(() => {
                  return res.status(500).json({ message: 'Error al confirmar cambios.' });
                });
              }
              
              return res.json({ message: 'Perfil actualizado exitosamente' });
            });
          }
        );
      }
    );
  });
};

// Verificar sesión activa
exports.verificarSesion = (req, res) => {
  if (!req.session || !req.session.cedula || !req.session.rol) {
    return res.status(401).json({ 
      message: 'No hay sesión activa',
      autenticado: false
    });
  }
  
  res.json({
    message: 'Sesión activa',
    autenticado: true,
    cedula: req.session.cedula,
    rol: req.session.rol
  });
};

// Cerrar sesión
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error al cerrar sesión' });
    }
    res.json({ message: 'Sesión cerrada exitosamente' });
  });
};

// Función para verificar si un paciente existe por correo (para uso administrativo)
exports.verificarPaciente = (req, res, connection) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({ message: 'El correo es requerido' });
  }

  // Primero buscar en la tabla usuarios para verificar que existe y es un paciente
  connection.query(
    'SELECT cedula, rol FROM usuarios WHERE correo = ? AND rol = "paciente"',
    [correo],
    (err, usuarioResults) => {
      if (err) {
        console.error('Error al verificar usuario:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
      }

      if (usuarioResults.length === 0) {
        return res.json({
          existe: false,
          message: 'No se encontró un paciente registrado con este correo'
        });
      }

      const cedula = usuarioResults[0].cedula;

      // Ahora obtener los datos completos del paciente
      connection.query(
        'SELECT cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo FROM Paciente WHERE cedula = ?',
        [cedula],
        (err, pacienteResults) => {
          if (err) {
            console.error('Error al obtener datos del paciente:', err);
            return res.status(500).json({ message: 'Error interno del servidor' });
          }

          if (pacienteResults.length > 0) {
            res.json({
              existe: true,
              paciente: pacienteResults[0]
            });
          } else {
            res.json({
              existe: false,
              message: 'No se encontró información del paciente'
            });
          }
        }
      );
    }
  );
};

// Función para verificar si un paciente existe por cédula (para uso administrativo)
exports.verificarPacienteCedula = (req, res, connection) => {
  const { cedula } = req.body;

  if (!cedula) {
    return res.status(400).json({ message: 'La cédula es requerida' });
  }

  // Primero buscar en la tabla usuarios para verificar que existe y es un paciente
  connection.query(
    'SELECT cedula, rol FROM usuarios WHERE cedula = ? AND rol = "paciente"',
    [cedula],
    (err, usuarioResults) => {
      if (err) {
        console.error('Error al verificar usuario:', err);
        return res.status(500).json({ message: 'Error interno del servidor' });
      }

      if (usuarioResults.length === 0) {
        return res.json({
          existe: false,
          message: 'No se encontró un paciente registrado con esta cédula'
        });
      }

      // Ahora obtener los datos completos del paciente
      connection.query(
        'SELECT cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo FROM Paciente WHERE cedula = ?',
        [cedula],
        (err, pacienteResults) => {
          if (err) {
            console.error('Error al obtener datos del paciente:', err);
            return res.status(500).json({ message: 'Error interno del servidor' });
          }

          if (pacienteResults.length > 0) {
            res.json({
              existe: true,
              paciente: pacienteResults[0]
            });
          } else {
            res.json({
              existe: false,
              message: 'No se encontró información del paciente'
            });
          }
        }
      );
    }
  );
};

