// Crear cupos (espera un array de cupos en req.body)
exports.crearCupos = (req, res, connection) => {
  const cupos = req.body.cupos; // [{fecha, hora, cedula_medico}]
  if (!Array.isArray(cupos) || cupos.length === 0) {
    return res.status(400).json({ message: 'Datos de cupos inválidos.' });
  }
  const values = cupos.map(c => [c.fecha, c.hora, c.cedula_medico, false]);
  connection.query(
    'INSERT INTO Cupo (fecha, hora, cedula_medico, ocupado) VALUES ?',
    [values],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Error al crear cupos.' });
      res.json({ message: 'Cupos creados correctamente.' });
    }
  );
};

// Obtener cupos por médico y fecha
exports.getCuposPorMedico = (req, res, connection) => {
  const { cedula_medico, fecha } = req.query;
  if (!cedula_medico) {
    return res.status(400).json({ message: 'Falta parámetro cedula_medico.' });
  }
  
  let query = 'SELECT * FROM Cupo WHERE cedula_medico = ?';
  let params = [cedula_medico];
  
  // Si se proporciona fecha, filtrar por fecha también
  if (fecha) {
    query += ' AND fecha = ?';
    params.push(fecha);
  }
  
  query += ' ORDER BY fecha ASC, hora ASC';
  
  connection.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error al obtener cupos.' });
    res.json(results);
  });
};

// Obtener cupos disponibles por especialidad
exports.getCuposDisponibles = (req, res, connection) => {
  const { especialidad, fecha } = req.query;
  if (!especialidad || !fecha) {
    return res.status(400).json({ message: 'Faltan parámetros.' });
  }
  connection.query(
    `SELECT c.*, m.primer_nombre, m.primer_apellido 
     FROM Cupo c 
     JOIN Medico m ON c.cedula_medico = m.cedula 
     WHERE m.especialidad = ? AND c.fecha = ? AND c.ocupado = 0`,
    [especialidad, fecha],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Error al obtener cupos disponibles.' });
      res.json(results);
    }
  );
};

exports.getTodosCupos = (req, res, connection) => {
  console.log('Intentando obtener todos los cupos...');
  connection.query(
    `SELECT c.*, m.primer_nombre, m.primer_apellido, m.especialidad 
     FROM Cupo c 
     JOIN Medico m ON c.cedula_medico = m.cedula`,
    (err, results) => {
      if (err) {
        console.error('Error SQL getTodosCupos:', err);
        return res.status(500).json({ message: 'Error al obtener cupos.' });
      }
      res.json(results);
    }
  );
};

exports.getMedicosDisponibles = (req, res, connection) => {
  const { fecha, especialidad } = req.query;
  if (!fecha || !especialidad) {
    return res.status(400).json({ message: 'Faltan parámetros.' });
  }
  connection.query(
    `SELECT DISTINCT m.cedula, m.primer_nombre, m.primer_apellido
     FROM Cupo c
     JOIN Medico m ON c.cedula_medico = m.cedula
     WHERE c.fecha = ? AND m.especialidad = ? AND c.ocupado = 0`,
    [fecha, especialidad],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Error al buscar médicos disponibles.' });
      res.json(results);
    }
  );
};

exports.getHorasDisponibles = (req, res, connection) => {
  const { fecha, cedula_medico } = req.query;
  console.log('API getHorasDisponibles', fecha, cedula_medico);
  
  if (!fecha || !cedula_medico) {
    return res.status(400).json({ message: 'Faltan parámetros.' });
  }
  
  // Convertir fecha ISO a formato DATE (YYYY-MM-DD)
  let fechaFormateada = fecha;
  if (fecha.includes('T')) {
    fechaFormateada = fecha.split('T')[0];
  }
  
  console.log('Fecha formateada para consulta:', fechaFormateada);
  
  // Para fechas de hoy, filtrar horas que tengan al menos 15 minutos de anticipación
  const hoy = new Date();
  const [year, month, day] = fechaFormateada.split('-').map(Number);
  const fechaConsulta = new Date(year, month - 1, day); // month - 1 porque enero es 0
  const fechaHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  
  // Comparar correctamente las fechas
  const esHoy = (
    fechaConsulta.getFullYear() === fechaHoy.getFullYear() &&
    fechaConsulta.getMonth() === fechaHoy.getMonth() &&
    fechaConsulta.getDate() === fechaHoy.getDate()
  );
  
  console.log('DEBUG Backend - Fecha consulta:', fechaConsulta.toDateString());
  console.log('DEBUG Backend - Fecha hoy:', fechaHoy.toDateString());
  console.log('DEBUG Backend - Es hoy?', esHoy);
  
  let whereClause = `fecha = ? AND cedula_medico = ? AND ocupado = 0`;
  let params = [fechaFormateada, cedula_medico];
  let minutosActuales = null; // Declarar aquí para que esté disponible en todo el scope
  
  if (esHoy) {
    // Filtrar horas que tengan al menos 15 minutos de anticipación
    const horaActual = hoy.getHours();
    const minutoActual = hoy.getMinutes();
    minutosActuales = horaActual * 60 + minutoActual + 15; // +15 minutos de anticipación
    
    console.log('Filtrando horas para hoy. Hora actual:', horaActual + ':' + minutoActual.toString().padStart(2, '0'));
    console.log('Tiempo mínimo en minutos:', minutosActuales);
    
    whereClause += ` AND (HOUR(hora) * 60 + MINUTE(hora)) > ?`;
    params.push(minutosActuales);
  }
  
  connection.query(
    `SELECT hora FROM Cupo WHERE ${whereClause} ORDER BY hora`,
    params,
    (err, results) => {
      if (err) {
        console.error('Error SQL getHorasDisponibles:', err);
        return res.status(500).json({ message: 'Error al obtener horas disponibles.' });
      }
      console.log('Resultados encontrados:', results.length);
      if (esHoy && minutosActuales !== null) {
        console.log('Filtrado aplicado para hoy - horas después de las', Math.floor(minutosActuales/60) + ':' + (minutosActuales%60).toString().padStart(2, '0'));
      }
      res.json(results);
    }
  );
};

exports.getFechasDisponibles = (req, res, connection) => {
  const { cedula_medico } = req.query;
  if (!cedula_medico) return res.status(400).json({ message: 'Falta el médico.' });
  connection.query(
    `SELECT DISTINCT fecha FROM Cupo WHERE cedula_medico = ? AND ocupado = 0 AND fecha >= CURDATE() ORDER BY fecha ASC`,
    [cedula_medico],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Error al obtener fechas.' });
      res.json(results);
    }
  );
};