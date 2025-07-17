exports.reagendarCita = (req, res, connection) => {
  const { id_cita, nueva_fecha, nueva_hora, motivo } = req.body;
  
  console.log('=== REAGENDAR DEBUG ===');
  console.log('id_cita:', id_cita);
  console.log('nueva_fecha:', nueva_fecha);
  console.log('nueva_hora:', nueva_hora);
  console.log('motivo:', motivo);
  
  // 1. Buscar la cita y el cupo actual
  connection.query('SELECT * FROM Cita WHERE id_cita = ?', [id_cita], (err, results) => {
    if (err || !results.length) return res.status(400).json({ message: 'Cita no encontrada.' });
    const cita = results[0];
    
    console.log('Cita encontrada:', cita);
    
    // 2. Validar tiempo mínimo de anticipación (igual que en cupoController)
    const ahora = new Date();
    const [anio, mes, dia] = nueva_fecha.split('-');
    const [hora, minutos] = nueva_hora.split(':');
    
    const fechaCupo = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia), parseInt(hora), parseInt(minutos));
    const diferenciaMilisegundos = fechaCupo.getTime() - ahora.getTime();
    const diferenciaMinutos = diferenciaMilisegundos / (1000 * 60);
    
    console.log('Fecha cupo construida:', fechaCupo);
    console.log('Fecha actual:', ahora);
    console.log('Diferencia en minutos:', diferenciaMinutos);
    
    // Si es hoy y no tiene al menos 15 minutos de anticipación, rechazar
    if (diferenciaMinutos < 15) {
      console.log('❌ Rechazado: No cumple con los 15 minutos de anticipación');
      return res.status(400).json({ 
        message: 'La cita debe programarse con al menos 15 minutos de anticipación.' 
      });
    }
    
    // 3. Verificar que el nuevo cupo esté disponible
    console.log('Buscando cupo con:', { fecha: nueva_fecha, hora: nueva_hora, cedula_medico: cita.cedula_medico });
    
    // Primero, veamos TODOS los cupos del médico para debug
    connection.query(
      'SELECT * FROM Cupo WHERE cedula_medico = ? ORDER BY fecha, hora',
      [cita.cedula_medico],
      (errDebug, todosLosCupos) => {
        console.log('📋 TODOS LOS CUPOS DEL MÉDICO:', todosLosCupos);
        console.log('📋 Total cupos:', todosLosCupos.length);
        
        // Ahora busquemos específicamente el cupo que necesitamos
        connection.query(
          'SELECT * FROM Cupo WHERE fecha = ? AND hora = ? AND cedula_medico = ?',
          [nueva_fecha, nueva_hora, cita.cedula_medico],
          (err2, cuposEncontrados) => {
            console.log('🔍 Cupos encontrados para fecha/hora específica:', cuposEncontrados);
            
            // Filtrar solo los disponibles
            const cuposDisponibles = cuposEncontrados.filter(c => c.ocupado === 0);
            console.log('✅ Cupos disponibles filtrados:', cuposDisponibles);
            
            if (err2 || !cuposDisponibles.length) {
              console.log('❌ No hay cupo disponible - Error:', err2);
              console.log('❌ Cupos encontrados pero ocupados:', cuposEncontrados.filter(c => c.ocupado === 1));
              return res.status(400).json({ message: 'No hay cupo disponible para esa fecha/hora.' });
            }
            
            const cupo = cuposDisponibles[0];
            const id_cupo_nuevo = cupo.id_cupo;
            console.log('✅ Cupo encontrado:', id_cupo_nuevo);

            // 4. Actualizar la cita (fecha, hora, estado='Reagendada', motivo)
            connection.query(
              'UPDATE Cita SET fecha_cita = ?, hora_cita = ?, estado = "Reagendada" WHERE id_cita = ?',
              [nueva_fecha, nueva_hora, id_cita],
              (err3) => {
                if (err3) {
                  console.log('❌ Error al actualizar cita:', err3);
                  return res.status(500).json({ message: 'Error al actualizar la cita.' });
                }
                
                console.log('✅ Cita actualizada correctamente');
                
                // 5. Liberar el cupo anterior y ocupar el nuevo
                connection.query(
                  'UPDATE Cupo SET ocupado = 0 WHERE fecha = ? AND hora = ? AND cedula_medico = ?',
                  [cita.fecha_cita, cita.hora_cita, cita.cedula_medico],
                  (err4) => {
                    if (err4) {
                      console.log('❌ Error al liberar cupo anterior:', err4);
                      return res.status(500).json({ message: 'Error al liberar el cupo anterior.' });
                    }
                    
                    console.log('✅ Cupo anterior liberado');
                    
                    connection.query(
                      'UPDATE Cupo SET ocupado = 1 WHERE id_cupo = ?',
                      [id_cupo_nuevo],
                      (err5) => {
                        if (err5) {
                          console.log('❌ Error al ocupar nuevo cupo:', err5);
                          return res.status(500).json({ message: 'Error al ocupar el nuevo cupo.' });
                        }
                        
                        console.log('✅ Nuevo cupo ocupado correctamente');
                        console.log('=== REAGENDAR COMPLETADO ===');
                        
                        // 6. (Opcional) Guardar el motivo en otra tabla si lo deseas
                        res.json({ message: 'Cita reprogramada correctamente.' });
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
  });
};

//Cancelar cita
exports.cancelarCita = (req, res, connection) => {
  const { id_cita, motivo } = req.body;
  connection.query('SELECT * FROM Cita WHERE id_cita = ?', [id_cita], (err, results) => {
    if (err || !results.length) return res.status(400).json({ message: 'Cita no encontrada.' });
    const cita = results[0];
    connection.query(
      'UPDATE Cita SET estado = "Cancelada" WHERE id_cita = ?',
      [id_cita],
      (err2) => {
        if (err2) return res.status(500).json({ message: 'Error al cancelar la cita.' });
        // Liberar el cupo
        connection.query(
          'UPDATE Cupo SET ocupado = 0 WHERE fecha = ? AND hora = ? AND cedula_medico = ?',
          [cita.fecha_cita, cita.hora_cita, cita.cedula_medico],
          (err3) => {
            if (err3) return res.status(500).json({ message: 'Error al liberar el cupo.' });
            // (Opcional) Guardar el motivo en otra tabla si lo deseas
            res.json({ message: 'Cita cancelada correctamente.' });
          }
        );
      }
    );
  });
};