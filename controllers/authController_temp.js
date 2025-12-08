const bcrypt = require('bcryptjs'); //Se debe instalar antes de usarlo: npm install bcryptjs
const nodemailer = require('nodemailer'); // Se debe instalar antes de usarlo: npm install nodemailer
const crypto = require('crypto'); //Se debe instalar antes de usarlo: npm install crypto
const multer = require('multer'); // Se debe instalar antes de usarlo: npm install multer
const path = require('path'); //Modulo nativo de Node.js para manejar rutas de archivos
const fs = require('fs'); // MÃ³dulo nativo de Node.js para manejar el sistema de archivos
const { validateCedula } = require('cedula-panama'); // LibrerÃ­a para validar cÃ©dulas y pasaportes panameÃ±os

// ConfiguraciÃ³n de multer para subir archivos
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

// FunciÃ³n para subir foto
exports.subirFoto = (req, res, connection) => {
upload.single('foto')(req, res, (err) => {
    if (err) {
    return res.status(400).json({ message: err.message });
    }

    const cedula = req.session.cedula;
    const fotoUrl = `/uploads/fotos/${req.file.filename}`;

    // âœ… PRIMERO: Obtener la foto anterior para eliminarla
    connection.query(
    'SELECT foto_perfil FROM Paciente WHERE cedula = ?',
    [cedula],
    (err, results) => {
        if (err) {
        console.error('Error al obtener foto anterior:', err);
        return res.status(500).json({ message: 'Error del servidor' });
        }

        const fotoAnterior = results[0]?.foto_perfil;

        // âœ… SEGUNDO: Actualizar en la base de datos
        connection.query(
        'UPDATE Paciente SET foto_perfil = ? WHERE cedula = ?',
        [fotoUrl, cedula],
        (err, results) => {
            if (err) {
            console.error('Error al actualizar foto:', err);
            return res.status(500).json({ message: 'Error al guardar la foto' });
            }

            // âœ… TERCERO: Eliminar la foto anterior del disco (si existe)
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

// FunciÃ³n para eliminar foto
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
        
        // âœ… ELIMINAR archivo fÃ­sico
        if (fotoActual) {
            const filePath = path.join(__dirname, '..', fotoActual);
            fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error al eliminar archivo fÃ­sico:', err);
                // No retornar error, continuar con la respuesta
            } else {
                console.log('âœ… Archivo eliminado exitosamente:', filePath);
            }
            });
        }
        
        res.json({ message: 'Foto eliminada exitosamente' });
        }
    );
    }
);
};

// FunciÃ³n para obtener datos del usuario
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
            return res.status(401).json({ message: 'Correo o contraseÃ±a incorrectos' });
        }

        const user = results[0];
        bcrypt.compare(contrasena, user.contrasena, (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(401).json({ message: 'Correo o contraseÃ±a incorrectos' });
            }
            
            // AGREGAR LOGS AQUÃ:
            
            req.session.cedula = user.cedula;
            req.session.correo = user.correo;
            req.session.rol = user.rol;

            // VERIFICAR QUE SE GUARDÃ“:

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
            cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, contrasena
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
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
        
        // Encriptar la contraseÃ±a
        bcrypt.hash(contrasena, 10, (err, hash) => {
            if (err) {
                return res.status(500).json({ message: 'Error al encriptar la contraseÃ±a' });
            }
            // Insertar usuario con la contraseÃ±a encriptada (hash)
            connection.query(
                insertarUsuario,
                [cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, hash],
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

// FunciÃ³n para manejar el envÃ­o de correo de recuperaciÃ³n de contraseÃ±a
exports.forgotPassword = (req, res, connection) => {
    const { correo } = req.body;
    connection.query('SELECT * FROM usuarios WHERE correo = ?', [correo], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error en el servidor.' });
        }

        // Siempre responde igual para no revelar si el correo existe o no
        if (results.length === 0) {
            return res.json({ message: 'Si el correo existe, se ha enviado un enlace para restablecer la contraseÃ±a.' });
        }

        // 1. Generar token seguro
        const token = crypto.randomBytes(32).toString('hex');
        const tokenExpira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        // 2. Guardar token y expiraciÃ³n en la base de datos (puedes crear campos en tu tabla usuarios)
        connection.query(
            'UPDATE usuarios SET reset_token = ?, reset_expires = ? WHERE correo = ?',
            [token, tokenExpira, correo],
            (err2) => {
                if (err2) {
                    return res.status(500).json({ message: 'Error al guardar el token.' });
                }

                // 3. Enviar correo con el enlace de recuperaciÃ³n
                const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/vista_general/reset-password.html?token=${token}`;
                // Configuracion del transportador de nodemailer
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'abdelbarbaebay@gmail.com', // Correo del remitente
                        pass: 'upfo nxxm uaqk bifh' // ContraseÃ±a del remitente (app password si usas autenticaciÃ³n de dos factores)

                        //upfo nxxm uaqk bifh
                    }
                });

                const mailOptions = {
                from: '"SCAH" <abdelbarbaebay@gmail.com>',
                to: correo,
                subject: 'Recupera tu contraseÃ±a',
                html: `
                    <div style="font-family: 'Questrial', Arial, sans-serif; color: #333; background: #f9fafb; padding: 24px; border-radius: 8px; border: 1px solid #e0e0e0;">
                        <h2 style="color: #004f98; margin-top: 0;">Solicitud de restablecimiento de contraseÃ±a</h2>
                        <p>Hola,</p>
                        <p>Hemos recibido una solicitud para restablecer la contraseÃ±a de tu cuenta en <b>SCAH</b>.</p>
                        <p>Para crear una nueva contraseÃ±a, haz clic en el siguiente botÃ³n o copia y pega el enlace en tu navegador:</p>
                        <p style="text-align: center; margin: 24px 0;">
                            <a href="${resetUrl}" style="background: #2d93d5; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Restablecer contraseÃ±a</a>
                        </p>
                        <p style="word-break: break-all;">${resetUrl}</p>
                        <p style="color: #d32f2f;"><b>Este enlace expirarÃ¡ en 1 hora.</b></p>
                        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
                        <p style="font-size: 0.95em; color: #888;">Este mensaje fue enviado automÃ¡ticamente, por favor no respondas a este correo.</p>
                    </div>
                `
            };

                transporter.sendMail(mailOptions, (error, info) => {
                    // Siempre responde igual, aunque falle el envÃ­o
                    return res.json({ message: 'Si el correo existe, se ha enviado un enlace para restablecer la contraseÃ±a.' });
                });
            }
        );
    });
};

//FunciÃ³n para restablecer la contraseÃ±a
exports.resetPassword = (req, res, connection) => {
    const { token, nueva } = req.body;
    // 1. Buscar usuario con ese token y que no haya expirado
    connection.query(
        'SELECT * FROM usuarios WHERE reset_token = ? AND reset_expires > NOW()',
        [token],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Error en el servidor.' });
            if (results.length === 0) return res.status(400).json({ message: 'Token invÃ¡lido o expirado.' });

            // 2. Encriptar la nueva contraseÃ±a
            bcrypt.hash(nueva, 10, (err, hash) => {
                if (err) return res.status(500).json({ message: 'Error al encriptar la contraseÃ±a.' });

                // 3. Actualizar contraseÃ±a y limpiar el token
                connection.query(
                    'UPDATE usuarios SET contrasena = ?, reset_token = NULL, reset_expires = NULL WHERE reset_token = ?',
                    [hash, token],
                    (err2) => {
                        if (err2) return res.status(500).json({ message: 'Error al actualizar la contraseÃ±a.' });
                        return res.json({ message: 'ContraseÃ±a restablecida con Ã©xito.' });
                    }
                );
            });
        }
    );
};

// FunciÃ³n para obtener los datos del usuario
exports.getDatosUsuario = (req, res, connection) => {
    const cedula = req.session.cedula;
    const rol = req.session.rol;

    if (!cedula || !rol) {
        return res.status(401).json({ message: 'SesiÃ³n no vÃ¡lida' });
    }

    // Buscar en la tabla correspondiente segÃºn el rol
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
            return res.status(400).json({ message: 'Rol no vÃ¡lido' });
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

// FunciÃ³n para obtener las citas de un paciente
exports.getCitasPaciente = (req, res, connection) => {
    const cedula = req.session.cedula;
    
    // Obtener las citas del paciente con datos del mÃ©dico
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
            // Crear la fecha de la cita de manera mÃ¡s explÃ­cita
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

        // Ordenar citas futuras ascendente (mÃ¡s cercanas primero)
        citasFuturas.sort((a, b) => {
            const fechaA = new Date(a.fecha_cita + 'T' + a.hora_cita);
            const fechaB = new Date(b.fecha_cita + 'T' + b.hora_cita);
            return fechaA - fechaB;
        });
        
        // Ordenar citas pasadas descendente (mÃ¡s recientes primero)
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

// FunciÃ³n para obtener el historial de citas (solo pasadas)

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
            OR c.estado IN ('Atendida', 'No asistiÃ³')
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


// FunciÃ³n para obtener detalles de atenciÃ³n mÃ©dica por nÃºmero de tiquete
exports.getDetalleAtencionPorTiquete = (req, res, connection) => {
    const { numero_tiquete } = req.body;

    // Verificar que el tiquete no sea undefined o null
    if (!numero_tiquete) {
        return res.status(400).json({ message: 'NÃºmero de tiquete no proporcionado.' });
    }
    
    // Primero buscar el id_cita por el nÃºmero de tiquete
    connection.query(
        'SELECT id_cita FROM Cita WHERE numero_tiquete = ?',
        [numero_tiquete],
        (err, citaResults) => {
            if (err) {
                console.error('Error al buscar cita por tiquete:', err);
                return res.status(500).json({ message: 'Error al buscar la cita.' });
            }
            
            if (citaResults.length === 0) {
                return res.status(404).json({ message: 'No se encontrÃ³ una cita con ese nÃºmero de tiquete.' });
            }
            
            const id_cita = citaResults[0].id_cita;
            
            // Ahora buscar la atenciÃ³n mÃ©dica con ese id_cita
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
                    console.error('Error al obtener detalles de atenciÃ³n:', err);
                    return res.status(500).json({ message: 'Error al obtener detalles de atenciÃ³n.' });
                }                
                if (results.length === 0) {
                    return res.status(404).json({ 
                        message: 'No se encontrÃ³ informaciÃ³n de atenciÃ³n para esta cita.',
                        numero_tiquete: numero_tiquete,
                        id_cita: id_cita
                    });
                }
                
                return res.json({ atencion: results[0] });
            });
        }
    );
};

// FunciÃ³n para actualizar perfil del paciente
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
  
  // Iniciar transacciÃ³n para asegurar consistencia
  connection.beginTransaction((err) => {
    if (err) return res.status(500).json({ message: 'Error al iniciar transacciÃ³n.' });

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
        
        // 2. TambiÃ©n actualizar en la tabla usuarios para mantener sincronizaciÃ³n
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
                return res.status(500).json({ message: 'Error al actualizar informaciÃ³n del usuario.' });
              });
            }
            
            // Confirmar transacciÃ³n
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

// Verificar sesiÃ³n activa
exports.verificarSesion = (req, res) => {
  if (!req.session.cedula) {
    return res.status(401).json({ 
      message: 'No hay sesiÃ³n activa',
      isAuthenticated: false
    });
  }
  
  res.json({
    message: 'SesiÃ³n activa',
    isAuthenticated: true,
    cedula: req.session.cedula,
    rol: req.session.rol
  });
};

// Cerrar sesiÃ³n
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error al cerrar sesiÃ³n' });
    }
    res.json({ message: 'SesiÃ³n cerrada exitosamente' });
  });
};

// FunciÃ³n para verificar si un paciente existe por correo (para uso administrativo)
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
          message: 'No se encontrÃ³ un paciente registrado con este correo'
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
              message: 'No se encontrÃ³ informaciÃ³n del paciente'
            });
          }
        }
      );
    }
  );
};

// FunciÃ³n para verificar si un paciente existe por cÃ©dula (para uso administrativo)
exports.verificarPacienteCedula = (req, res, connection) => {
  const { cedula } = req.body;

  if (!cedula) {
    return res.status(400).json({ message: 'La cÃ©dula es requerida' });
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
          message: 'No se encontrÃ³ un paciente registrado con esta cÃ©dula'
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
              message: 'No se encontrÃ³ informaciÃ³n del paciente'
            });
          }
        }
      );
    }
  );
};

