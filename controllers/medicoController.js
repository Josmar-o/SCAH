

// Función para obtener datos del médico
exports.getDatosMedico = (req, res, connection) => {
    const cedula = req.session.cedula;
    connection.query(
        'SELECT primer_nombre, primer_apellido, cedula, correo, especialidad FROM Medico WHERE cedula = ?',
        [cedula],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Error en el servidor.' });
            if (results.length === 0) return res.status(404).json({ message: 'Médico no encontrado.' });
            return res.json(results[0]);
        }
    );
};

// ...existing code...

// Obtener próximas citas del médico
exports.getProximasCitas = (req, res, connection) => {
    const cedulaMedico = req.session.cedula;
    const hoy = new Date().toISOString().slice(0, 10);
    connection.query(
        `SELECT Cita.id_cita, Cita.fecha_cita, Cita.hora_cita, Paciente.primer_nombre, Paciente.primer_apellido, Paciente.cedula
         FROM Cita
         JOIN Paciente ON Cita.cedula_paciente = Paciente.cedula
         WHERE Cita.cedula_medico = ? AND Cita.fecha_cita >= ? AND Cita.estado IN ('Programada', 'Confirmada', 'Reagendada')
         ORDER BY Cita.fecha_cita, Cita.hora_cita
         LIMIT 5`,
        [cedulaMedico, hoy],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Error en el servidor.' });
            res.json(results);
        }
    );
};

exports.getDetalleCita = (req, res, connection) => {
    const idCita = req.body.id_cita;
    connection.query(
        `SELECT Cita.id_cita, Cita.fecha_cita, Cita.hora_cita, Cita.estado, 
                Paciente.primer_nombre, Paciente.primer_apellido, Paciente.cedula AS cedula_paciente, 
                Medico.especialidad
         FROM Cita
         JOIN Paciente ON Cita.cedula_paciente = Paciente.cedula
         JOIN Medico ON Cita.cedula_medico = Medico.cedula
         WHERE Cita.id_cita = ?`,
        [idCita],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Error en el servidor.' });
            if (results.length === 0) return res.status(404).json({ message: 'Cita no encontrada.' });
            res.json(results[0]);
        }
    );
};

exports.guardarObservacion = (req, res, connection) => {
    const { id_cita, asistencia, diagnostico, observacion, prescripcion } = req.body;
    // Busca datos de la cita para obtener cedulas
    connection.query(
        'SELECT cedula_paciente, cedula_medico FROM Cita WHERE id_cita = ?',
        [id_cita],
        (err, results) => {
            if (err || results.length === 0) return res.status(400).json({ message: 'Cita inválida.' });
            const { cedula_paciente, cedula_medico } = results[0];
            connection.query(
                `INSERT INTO AtencionMedica (diagnostico, observacion, prescripcion, cedula_paciente, cedula_medico, id_cita)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [diagnostico, observacion, prescripcion, cedula_paciente, cedula_medico, id_cita],
                (err2) => {
                    if (err2) return res.status(500).json({ message: 'Error al guardar observación.' });
                    // Actualiza estado de la cita según asistencia
                    let nuevoEstado = asistencia === 'si' ? 'Atendida' : 'No asistió';
                    connection.query(
                        'UPDATE Cita SET estado = ? WHERE id_cita = ?',
                        [nuevoEstado, id_cita],
                        () => res.json({ message: 'Observación guardada correctamente.' })
                    );
                }
            );
        }
    ); 
};

// Obtener especialidades únicas
exports.getEspecialidades = (req, res, connection) => {
    connection.query(
        'SELECT DISTINCT especialidad FROM Medico',
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Error en el servidor.' });
            res.json(results);
        }
    );
};

// Obtener médicos por especialidad
exports.getMedicosPorEspecialidad = (req, res, connection) => {
    const especialidad = req.query.especialidad;
    connection.query(
        'SELECT cedula, primer_nombre, primer_apellido FROM Medico WHERE especialidad = ?',
        [especialidad],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Error en el servidor.' });
            res.json(results);
        }
    );
};

exports.getTodosMedicos = (req, res, connection) => {
    connection.query(
        'SELECT cedula, primer_nombre, primer_apellido, especialidad FROM Medico',
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Error en el servidor.' });
            res.json(results);
        }
    );
};

// Obtener citas del médico por fecha específica
exports.getCitasPorFecha = (req, res, connection) => {
    const cedulaMedico = req.session.cedula;
    const { fecha } = req.body;

    if (!cedulaMedico) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    if (!fecha) {
        return res.status(400).json({ message: 'La fecha es requerida' });
    }

    connection.query(
        `SELECT 
            Cita.id_cita, 
            Cita.fecha_cita, 
            Cita.hora_cita, 
            Cita.estado,
            Cita.numero_tiquete,
            Paciente.primer_nombre, 
            Paciente.primer_apellido, 
            Paciente.cedula AS cedula_paciente
         FROM Cita
         JOIN Paciente ON Cita.cedula_paciente = Paciente.cedula
         WHERE Cita.cedula_medico = ? AND DATE(Cita.fecha_cita) = ?
         ORDER BY Cita.hora_cita`,
        [cedulaMedico, fecha],
        (err, results) => {
            if (err) {
                console.error('Error al obtener citas por fecha:', err);
                return res.status(500).json({ message: 'Error en el servidor.' });
            }
            res.json(results);
        }
    );
};