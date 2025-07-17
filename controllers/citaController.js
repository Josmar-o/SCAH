exports.crearCita = (req, res, connection) => {
    const cedula_paciente = req.session.cedula;
    const { fecha_cita, hora_cita, cedula_medico } = req.body;

    if (!cedula_paciente) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    // Convertir fecha si viene en formato ISO
    let fechaFormateada = fecha_cita;
    if (fecha_cita.includes('T')) {
        fechaFormateada = fecha_cita.split('T')[0];
    }

    // Validar que la fecha no sea pasada
    const [year, month, day] = fechaFormateada.split('-').map(Number);
    const fechaCitaObj = new Date(year, month - 1, day); // month - 1 porque enero es 0
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    
    if (fechaCitaObj < hoy) {
        return res.status(400).json({ message: 'No se pueden agendar citas para fechas pasadas' });
    }
    
    // Si es hoy, validar que la hora tenga al menos 15 minutos de anticipación
    const esMismaFecha = (
        fechaCitaObj.getFullYear() === hoy.getFullYear() &&
        fechaCitaObj.getMonth() === hoy.getMonth() &&
        fechaCitaObj.getDate() === hoy.getDate()
    );
    
    console.log('DEBUG CitaController - Fecha cita:', fechaCitaObj.toDateString());
    console.log('DEBUG CitaController - Fecha hoy:', hoy.toDateString());
    console.log('DEBUG CitaController - Es misma fecha?', esMismaFecha);
    
    if (esMismaFecha) {
        const horaActual = ahora;
        const [hora, minuto] = hora_cita.split(':').map(Number);
        const horaCita = new Date();
        horaCita.setHours(hora, minuto, 0, 0);
        
        // Permitir citas con al menos 15 minutos de anticipación
        const tiempoMinimoAnticipacion = 15 * 60 * 1000; // 15 minutos en milisegundos
        const tiempoRestante = horaCita.getTime() - horaActual.getTime();
        
        console.log('Validación de hora para hoy:');
        console.log('Hora actual:', horaActual.toTimeString());
        console.log('Hora de la cita:', horaCita.toTimeString());
        console.log('Tiempo restante (ms):', tiempoRestante);
        console.log('Tiempo mínimo requerido (ms):', tiempoMinimoAnticipacion);
        
        if (tiempoRestante <= tiempoMinimoAnticipacion) {
            return res.status(400).json({ message: 'Las citas para hoy deben ser con al menos 15 minutos de anticipación' });
        }
    }

    // 1. Buscar cupo disponible
    connection.query(
        'SELECT id_cupo FROM Cupo WHERE fecha = ? AND hora = ? AND cedula_medico = ? AND ocupado = 0 LIMIT 1',
        [fechaFormateada, hora_cita, cedula_medico],
        (err, results) => {
            if (err) {
                console.error('Error MySQL:', err);
                return res.status(500).json({ message: 'Error al buscar cupo', error: err });
            }
            if (!results.length) {
                return res.status(400).json({ message: 'No hay cupo disponible para ese horario.' });
            }

            const id_cupo = results[0].id_cupo;

            // 2. Marcar cupo como ocupado
            connection.query(
                'UPDATE Cupo SET ocupado = 1 WHERE id_cupo = ?',
                [id_cupo],
                (err2) => {
                    if (err2) {
                        console.error('Error MySQL:', err2);
                        return res.status(500).json({ message: 'Error al reservar cupo', error: err2 });
                    }

                    // 3. Insertar la cita (igual que antes)
                    connection.query(
                        'SELECT MAX(CAST(numero_tiquete AS UNSIGNED)) AS max_tiquete FROM Cita',
                        (err, results) => {
                            if (err) {
                                console.error('Error MySQL:', err);
                                return res.status(500).json({ message: 'Error al generar el número de tiquete', error: err });
                            }

                            let nuevoTiquete = 1;
                            if (results && results[0] && results[0].max_tiquete) {
                                nuevoTiquete = results[0].max_tiquete + 1;
                            }

                            if (nuevoTiquete > 99999999) {
                                return res.status(400).json({ message: 'Se alcanzó el máximo de números de tiquete permitidos.' });
                            }
                            const numero_tiquete_str = nuevoTiquete.toString().padStart(8, '0');

                            const sql = `
                                INSERT INTO Cita (fecha_cita, hora_cita, cedula_paciente, cedula_medico, numero_tiquete)
                                VALUES (?, ?, ?, ?, ?)
                            `;
                            connection.query(
                                sql,
                                [fechaFormateada, hora_cita, cedula_paciente, cedula_medico, numero_tiquete_str],
                                (err, result) => {
                                    if (err) {
                                        console.error('Error MySQL:', err);
                                        return res.status(500).json({ message: 'Error al registrar la cita', error: err });
                                    }
                                    res.json({ message: 'Cita registrada correctamente', id_cita: result.insertId, numero_tiquete: numero_tiquete_str });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

// Listar citas con filtros y paginación
exports.listarCitas = (req, res, connection) => {
    const { pagina = 1, cedula = '', medico = 'Todos', paciente = 'Todos', fecha = '', estado = 'Todos' } = req.query;
    const limite = 20;
    const offset = (pagina - 1) * limite;
    
    let whereConditions = [];
    let queryParams = [];
    
    // Filtros
    if (cedula && cedula.trim() !== '') {
        whereConditions.push('(p.cedula LIKE ? OR m.cedula LIKE ?)');
        queryParams.push(`%${cedula}%`, `%${cedula}%`);
    }
    
    if (medico && medico !== 'Todos') {
        whereConditions.push('m.cedula = ?');
        queryParams.push(medico);
    }
    
    if (paciente && paciente !== 'Todos') {
        whereConditions.push('p.cedula = ?');
        queryParams.push(paciente);
    }
    
    if (fecha && fecha.trim() !== '') {
        whereConditions.push('c.fecha_cita = ?');
        queryParams.push(fecha);
    }
    
    if (estado && estado !== 'Todos') {
        whereConditions.push('c.estado = ?');
        queryParams.push(estado);
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // Query principal
    const sql = `
        SELECT 
            c.id_cita,
            c.fecha_cita,
            c.hora_cita,
            c.estado,
            c.numero_tiquete,
            CONCAT(p.primer_nombre, ' ', COALESCE(p.segundo_nombre, ''), ' ', p.primer_apellido, ' ', COALESCE(p.segundo_apellido, '')) as nombre_paciente,
            p.cedula as cedula_paciente,
            CONCAT(m.primer_nombre, ' ', COALESCE(m.segundo_nombre, ''), ' ', m.primer_apellido, ' ', COALESCE(m.segundo_apellido, '')) as nombre_medico,
            m.cedula as cedula_medico,
            m.especialidad,
            CASE 
                WHEN asist.estado = 'Asistió' THEN 'Si asistió'
                WHEN asist.estado = 'No asistió' THEN 'No asistió'
                ELSE 'Pendiente'
            END as asistencia,
            CASE 
                WHEN c.estado = 'Reagendada' THEN 'Si'
                ELSE 'No'
            END as fue_reprogramada
        FROM Cita c
        JOIN Paciente p ON c.cedula_paciente = p.cedula
        JOIN Medico m ON c.cedula_medico = m.cedula
        LEFT JOIN Asistencia asist ON c.id_cita = asist.id_cita
        ${whereClause}
        ORDER BY c.fecha_cita DESC, c.hora_cita DESC
        LIMIT ? OFFSET ?
    `;
    
    queryParams.push(limite, offset);
    
    connection.query(sql, queryParams, (err, results) => {
        if (err) {
            console.error('Error al listar citas:', err);
            return res.status(500).json({ message: 'Error al listar citas', error: err });
        }
        
        // Query para contar total
        const countSql = `
            SELECT COUNT(*) as total
            FROM Cita c
            JOIN Paciente p ON c.cedula_paciente = p.cedula
            JOIN Medico m ON c.cedula_medico = m.cedula
            LEFT JOIN Asistencia asist ON c.id_cita = asist.id_cita
            ${whereClause}
        `;
        
        connection.query(countSql, queryParams.slice(0, -2), (err2, countResults) => {
            if (err2) {
                console.error('Error al contar citas:', err2);
                return res.status(500).json({ message: 'Error al contar citas', error: err2 });
            }
            
            res.json({
                citas: results,
                total: countResults[0].total,
                pagina: parseInt(pagina),
                totalPaginas: Math.ceil(countResults[0].total / limite)
            });
        });
    });
};

// Obtener datos para los filtros
exports.obtenerDatosFiltros = (req, res, connection) => {
    // Obtener médicos con especialidad
    const sqlMedicos = `
        SELECT cedula, CONCAT(primer_nombre, ' ', COALESCE(segundo_nombre, ''), ' ', primer_apellido, ' ', COALESCE(segundo_apellido, '')) as nombre_completo, especialidad
        FROM Medico
        ORDER BY primer_nombre
    `;
    
    // Obtener pacientes (para filtros solamente)
    const sqlPacientes = `
        SELECT DISTINCT p.cedula, 
               CONCAT(p.primer_nombre, ' ', COALESCE(p.segundo_nombre, ''), ' ', p.primer_apellido, ' ', COALESCE(p.segundo_apellido, '')) as nombre_completo,
               p.primer_nombre
        FROM Paciente p
        JOIN Cita c ON p.cedula = c.cedula_paciente
        ORDER BY p.primer_nombre
    `;
    
    // Obtener especialidades distintas
    const sqlEspecialidades = `
        SELECT DISTINCT especialidad
        FROM Medico
        WHERE especialidad IS NOT NULL AND especialidad != ''
        ORDER BY especialidad
    `;
    
    connection.query(sqlMedicos, (err1, medicos) => {
        if (err1) {
            console.error('Error al obtener médicos:', err1);
            return res.status(500).json({ message: 'Error al obtener médicos', error: err1 });
        }
        
        connection.query(sqlPacientes, (err2, pacientes) => {
            if (err2) {
                console.error('Error al obtener pacientes:', err2);
                return res.status(500).json({ message: 'Error al obtener pacientes', error: err2 });
            }
            
            connection.query(sqlEspecialidades, (err3, especialidades) => {
                if (err3) {
                    console.error('Error al obtener especialidades:', err3);
                    return res.status(500).json({ message: 'Error al obtener especialidades', error: err3 });
                }
                
                res.json({
                    medicos: medicos,
                    pacientes: pacientes,
                    especialidades: especialidades
                });
            });
        });
    });
};

// Editar cita
exports.editarCita = (req, res, connection) => {
    const { id } = req.params;
    const { fecha_cita, hora_cita, cedula_medico } = req.body;
    
    // Verificar que la cita existe
    connection.query('SELECT * FROM Cita WHERE id_cita = ?', [id], (err, citaResults) => {
        if (err) {
            console.error('Error al buscar cita:', err);
            return res.status(500).json({ message: 'Error al buscar cita', error: err });
        }
        
        if (citaResults.length === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }
        
        const citaOriginal = citaResults[0];
        
        // Si se cambió fecha, hora o médico, verificar disponibilidad
        if (fecha_cita !== citaOriginal.fecha_cita || 
            hora_cita !== citaOriginal.hora_cita || 
            cedula_medico !== citaOriginal.cedula_medico) {
            
            connection.query(
                'SELECT id_cupo FROM Cupo WHERE fecha = ? AND hora = ? AND cedula_medico = ? AND ocupado = 0 LIMIT 1',
                [fecha_cita, hora_cita, cedula_medico],
                (err, cupoResults) => {
                    if (err) {
                        console.error('Error al verificar cupo:', err);
                        return res.status(500).json({ message: 'Error al verificar disponibilidad', error: err });
                    }
                    
                    if (cupoResults.length === 0) {
                        return res.status(400).json({ message: 'No hay cupo disponible para ese horario' });
                    }
                    
                    // Liberar cupo anterior si cambió
                    if (fecha_cita !== citaOriginal.fecha_cita || 
                        hora_cita !== citaOriginal.hora_cita || 
                        cedula_medico !== citaOriginal.cedula_medico) {
                        
                        connection.query(
                            'UPDATE Cupo SET ocupado = 0 WHERE fecha = ? AND hora = ? AND cedula_medico = ?',
                            [citaOriginal.fecha_cita, citaOriginal.hora_cita, citaOriginal.cedula_medico],
                            (err) => {
                                if (err) console.error('Error al liberar cupo anterior:', err);
                            }
                        );
                        
                        // Ocupar nuevo cupo
                        connection.query(
                            'UPDATE Cupo SET ocupado = 1 WHERE id_cupo = ?',
                            [cupoResults[0].id_cupo],
                            (err) => {
                                if (err) console.error('Error al ocupar nuevo cupo:', err);
                            }
                        );
                    }
                    
                    // Actualizar cita
                    actualizarCita();
                }
            );
        } else {
            // Solo actualizar cita sin cambiar cupos
            actualizarCita();
        }
        
        function actualizarCita() {
            const sqlUpdate = `
                UPDATE Cita 
                SET fecha_cita = ?, hora_cita = ?, cedula_medico = ?, estado = 'Reagendada'
                WHERE id_cita = ?
            `;
            
            connection.query(sqlUpdate, [fecha_cita, hora_cita, cedula_medico, id], (err) => {
                if (err) {
                    console.error('Error al actualizar cita:', err);
                    return res.status(500).json({ message: 'Error al actualizar cita', error: err });
                }
                
                res.json({ message: 'Cita actualizada correctamente' });
            });
        }
    });
};

// Cancelar cita
exports.cancelarCita = (req, res, connection) => {
    const { id } = req.params;
    
    // Verificar que la cita existe y puede ser cancelada
    connection.query('SELECT * FROM Cita WHERE id_cita = ?', [id], (err, results) => {
        if (err) {
            console.error('Error al buscar cita:', err);
            return res.status(500).json({ message: 'Error al buscar cita', error: err });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }
        
        const cita = results[0];
        const fechaCita = new Date(cita.fecha_cita);
        const hoy = new Date();
        
        // Verificar que la cita es del futuro y no está completada
        if (fechaCita <= hoy) {
            return res.status(400).json({ message: 'No se pueden cancelar citas pasadas' });
        }
        
        if (cita.estado === 'Cancelada') {
            return res.status(400).json({ message: 'La cita ya está cancelada' });
        }
        
        // Liberar cupo
        connection.query(
            'UPDATE Cupo SET ocupado = 0 WHERE fecha = ? AND hora = ? AND cedula_medico = ?',
            [cita.fecha_cita, cita.hora_cita, cita.cedula_medico],
            (err) => {
                if (err) console.error('Error al liberar cupo:', err);
            }
        );
        
        // Cancelar cita
        connection.query(
            'UPDATE Cita SET estado = "Cancelada" WHERE id_cita = ?',
            [id],
            (err) => {
                if (err) {
                    console.error('Error al cancelar cita:', err);
                    return res.status(500).json({ message: 'Error al cancelar cita', error: err });
                }
                
                res.json({ message: 'Cita cancelada correctamente' });
            }
        );
    });
};

// Verificar cupos disponibles para un médico en fecha y hora específica
exports.verificarCuposDisponibles = (req, res, connection) => {
    const { fecha, hora, cedula_medico } = req.query;
    
    if (!fecha || !hora || !cedula_medico) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos' });
    }
    
    connection.query(
        'SELECT id_cupo FROM Cupo WHERE fecha = ? AND hora = ? AND cedula_medico = ? AND ocupado = 0',
        [fecha, hora, cedula_medico],
        (err, results) => {
            if (err) {
                console.error('Error al verificar cupos:', err);
                return res.status(500).json({ message: 'Error al verificar cupos', error: err });
            }
            
            res.json({
                disponible: results.length > 0,
                cupos: results.length
            });
        }
    );
};

// Función para crear cita desde el panel administrativo (permite especificar el paciente)
exports.crearCitaAdmin = (req, res, connection) => {
    const { fecha_cita, hora_cita, cedula_medico, cedula_paciente } = req.body;

    // Validar que todos los campos estén presentes
    if (!fecha_cita || !hora_cita || !cedula_medico || !cedula_paciente) {
        return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Convertir fecha si viene en formato ISO
    let fechaFormateada = fecha_cita;
    if (fecha_cita.includes('T')) {
        fechaFormateada = fecha_cita.split('T')[0];
    }

    // Validar que la fecha no sea pasada
    const [year, month, day] = fechaFormateada.split('-').map(Number);
    const fechaCitaObj = new Date(year, month - 1, day);
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    
    if (fechaCitaObj < hoy) {
        return res.status(400).json({ message: 'No se pueden agendar citas para fechas pasadas' });
    }

    // Si es hoy, validar que la hora tenga al menos 15 minutos de anticipación
    const esMismaFecha = (
        fechaCitaObj.getFullYear() === hoy.getFullYear() &&
        fechaCitaObj.getMonth() === hoy.getMonth() &&
        fechaCitaObj.getDate() === hoy.getDate()
    );
    
    if (esMismaFecha) {
        const horaActual = ahora;
        const [hora, minuto] = hora_cita.split(':').map(Number);
        const horaCita = new Date();
        horaCita.setHours(hora, minuto, 0, 0);
        
        const tiempoMinimoAnticipacion = 15 * 60 * 1000; // 15 minutos
        const tiempoRestante = horaCita.getTime() - horaActual.getTime();
        
        if (tiempoRestante < tiempoMinimoAnticipacion) {
            return res.status(400).json({ 
                message: 'Las citas para hoy deben ser agendadas con al menos 15 minutos de anticipación' 
            });
        }
    }

    // Verificar que el paciente existe
    connection.query(
        'SELECT cedula FROM Paciente WHERE cedula = ?',
        [cedula_paciente],
        (err, pacienteResults) => {
            if (err) {
                console.error('Error al verificar paciente:', err);
                return res.status(500).json({ message: 'Error interno del servidor' });
            }

            if (pacienteResults.length === 0) {
                return res.status(400).json({ message: 'El paciente especificado no existe' });
            }

            // Verificar que el médico existe
            connection.query(
                'SELECT cedula FROM Medico WHERE cedula = ?',
                [cedula_medico],
                (err, medicoResults) => {
                    if (err) {
                        console.error('Error al verificar médico:', err);
                        return res.status(500).json({ message: 'Error interno del servidor' });
                    }

                    if (medicoResults.length === 0) {
                        return res.status(400).json({ message: 'El médico especificado no existe' });
                    }

                    // Buscar cupo disponible
                    connection.query(
                        'SELECT id_cupo FROM Cupo WHERE fecha = ? AND hora = ? AND cedula_medico = ? AND ocupado = 0 LIMIT 1',
                        [fechaFormateada, hora_cita, cedula_medico],
                        (err, cupoResults) => {
                            if (err) {
                                console.error('Error al verificar cupo:', err);
                                return res.status(500).json({ message: 'Error al verificar disponibilidad del cupo' });
                            }

                            if (cupoResults.length === 0) {
                                return res.status(400).json({ message: 'No hay cupos disponibles para la fecha y hora seleccionada' });
                            }

                            const id_cupo = cupoResults[0].id_cupo;
                            const numero_tiquete = Math.random().toString(36).substr(2, 9).toUpperCase();
                            const estado = 'Programada';

                            // Crear la cita
                            connection.query(
                                'INSERT INTO Cita (fecha_cita, hora_cita, cedula_paciente, cedula_medico, estado, numero_tiquete) VALUES (?, ?, ?, ?, ?, ?)',
                                [fechaFormateada, hora_cita, cedula_paciente, cedula_medico, estado, numero_tiquete],
                                (err, result) => {
                                    if (err) {
                                        console.error('Error al crear cita:', err);
                                        return res.status(500).json({ message: 'Error al crear la cita' });
                                    }

                                    // Marcar el cupo como ocupado
                                    connection.query(
                                        'UPDATE Cupo SET ocupado = 1 WHERE id_cupo = ?',
                                        [id_cupo],
                                        (err) => {
                                            if (err) {
                                                console.error('Error al ocupar cupo:', err);
                                                // Intentar deshacer la cita creada
                                                connection.query('DELETE FROM Cita WHERE id_cita = ?', [result.insertId]);
                                                return res.status(500).json({ message: 'Error al ocupar el cupo' });
                                            }

                                            res.status(201).json({
                                                message: 'Cita creada exitosamente',
                                                id_cita: result.insertId,
                                                numero_tiquete: numero_tiquete
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};