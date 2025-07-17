exports.listarUsuarios = (req, res, connection) => {
  const { pagina = 1, tipo = '', buscar = '' } = req.query;
  const limit = 20;
  const offset = (parseInt(pagina) - 1) * limit;

  let where = '1=1';
  let params = [];

  if (tipo && tipo !== 'Todos') {
    where += ' AND rol = ?';
    params.push(tipo.toLowerCase());
  }
  if (buscar) {
    where += ' AND (primer_nombre LIKE ? OR primer_apellido LIKE ? OR cedula LIKE ?)';
    params.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`);
  }

  // Contar total
  connection.query(`SELECT COUNT(*) as total FROM usuarios WHERE ${where}`, params, (err, countResult) => {
    if (err) return res.status(500).json({ message: 'Error al contar usuarios.' });
    const total = countResult[0].total;

    // Obtener página
    connection.query(
      `SELECT cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, rol as tipo FROM usuarios WHERE ${where} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
      (err2, results) => {
        if (err2) return res.status(500).json({ message: 'Error al obtener usuarios.' });
        res.json({ usuarios: results, total });
      }
    );
  });
};

exports.editarUsuario = (req, res, connection) => {
  const { cedula } = req.params;
  const { primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, rol } = req.body;

  // Validar que no se edite un administrador
  connection.query('SELECT rol FROM usuarios WHERE cedula = ?', [cedula], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error al verificar usuario.' });
    if (result.length === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });
    
    if (result[0].rol === 'administrativo') {
      return res.status(403).json({ message: 'No se puede editar un usuario administrativo.' });
    }

    const rolAnterior = result[0].rol;

    // Iniciar transacción para asegurar consistencia
    connection.beginTransaction((err) => {
      if (err) return res.status(500).json({ message: 'Error al iniciar transacción.' });

      // 1. Actualizar tabla usuarios
      connection.query(
        'UPDATE usuarios SET primer_nombre = ?, segundo_nombre = ?, primer_apellido = ?, segundo_apellido = ?, correo = ?, rol = ? WHERE cedula = ?',
        [primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, rol, cedula],
        (err2) => {
          if (err2) {
            return connection.rollback(() => {
              if (err2.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'El correo ya está en uso.' });
              }
              return res.status(500).json({ message: 'Error al actualizar usuario.' });
            });
          }

          // 2. Actualizar tabla específica según el rol
          let updateQuery = '';
          let updateParams = [];

          if (rol === 'paciente') {
            updateQuery = `
              UPDATE Paciente 
              SET primer_nombre = ?, segundo_nombre = ?, primer_apellido = ?, segundo_apellido = ?, correo = ?
              WHERE cedula = ?
            `;
            updateParams = [primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, cedula];
          } else if (rol === 'medico') {
            updateQuery = `
              UPDATE Medico 
              SET primer_nombre = ?, segundo_nombre = ?, primer_apellido = ?, segundo_apellido = ?, correo = ?
              WHERE cedula = ?
            `;
            updateParams = [primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, cedula];
          }

          // Si hay una consulta de actualización, ejecutarla
          if (updateQuery) {
            connection.query(updateQuery, updateParams, (err3) => {
              if (err3) {
                return connection.rollback(() => {
                  console.error('Error al actualizar tabla específica:', err3);
                  return res.status(500).json({ message: 'Error al actualizar información específica del usuario.' });
                });
              }

              // 3. Si el rol cambió, manejar el cambio de tabla
              if (rolAnterior !== rol) {
                handleRoleChange(connection, cedula, rolAnterior, rol, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, res);
              } else {
                // Confirmar transacción si no hay cambio de rol
                connection.commit((err4) => {
                  if (err4) {
                    return connection.rollback(() => {
                      return res.status(500).json({ message: 'Error al confirmar cambios.' });
                    });
                  }
                  res.json({ message: 'Usuario actualizado correctamente.' });
                });
              }
            });
          } else {
            // Si no hay tabla específica que actualizar, solo confirmar
            connection.commit((err4) => {
              if (err4) {
                return connection.rollback(() => {
                  return res.status(500).json({ message: 'Error al confirmar cambios.' });
                });
              }
              res.json({ message: 'Usuario actualizado correctamente.' });
            });
          }
        }
      );
    });
  });
};

// Función auxiliar para manejar cambios de rol
function handleRoleChange(connection, cedula, rolAnterior, rolNuevo, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, res) {
  // Eliminar de la tabla anterior
  let deleteQuery = '';
  if (rolAnterior === 'paciente') {
    deleteQuery = 'DELETE FROM Paciente WHERE cedula = ?';
  } else if (rolAnterior === 'medico') {
    deleteQuery = 'DELETE FROM Medico WHERE cedula = ?';
  }

  if (deleteQuery) {
    connection.query(deleteQuery, [cedula], (err) => {
      if (err) {
        return connection.rollback(() => {
          return res.status(500).json({ message: 'Error al eliminar de tabla anterior.' });
        });
      }

      // Insertar en la nueva tabla
      insertIntoNewTable(connection, cedula, rolNuevo, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, res);
    });
  } else {
    // Si no había tabla anterior, solo insertar en la nueva
    insertIntoNewTable(connection, cedula, rolNuevo, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, res);
  }
}

// Función auxiliar para insertar en la nueva tabla
function insertIntoNewTable(connection, cedula, rolNuevo, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, res) {
  let insertQuery = '';
  let insertParams = [];

  if (rolNuevo === 'paciente') {
    insertQuery = `
      INSERT INTO Paciente (cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, fecha_nacimiento, telefono, direccion)
      VALUES (?, ?, ?, ?, ?, ?, '1990-01-01', '', '')
    `;
    insertParams = [cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo];
  } else if (rolNuevo === 'medico') {
    insertQuery = `
      INSERT INTO Medico (cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, fecha_nacimiento, telefono, especialidad)
      VALUES (?, ?, ?, ?, ?, ?, '1990-01-01', '', 'Medicina General')
    `;
    insertParams = [cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo];
  }

  if (insertQuery) {
    connection.query(insertQuery, insertParams, (err) => {
      if (err) {
        return connection.rollback(() => {
          console.error('Error al insertar en nueva tabla:', err);
          return res.status(500).json({ message: 'Error al crear registro en nueva tabla.' });
        });
      }

      // Confirmar transacción
      connection.commit((err2) => {
        if (err2) {
          return connection.rollback(() => {
            return res.status(500).json({ message: 'Error al confirmar cambios.' });
          });
        }
        res.json({ message: 'Usuario actualizado correctamente con cambio de rol.' });
      });
    });
  } else {
    // Confirmar transacción si no hay inserción
    connection.commit((err) => {
      if (err) {
        return connection.rollback(() => {
          return res.status(500).json({ message: 'Error al confirmar cambios.' });
        });
      }
      res.json({ message: 'Usuario actualizado correctamente.' });
    });
  }
}

exports.eliminarUsuario = (req, res, connection) => {
  const { cedula } = req.params;

  // Verificar que no sea un administrador
  connection.query('SELECT rol FROM usuarios WHERE cedula = ?', [cedula], (err, result) => {
    if (err) return res.status(500).json({ message: 'Error al verificar usuario.' });
    if (result.length === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });
    
    if (result[0].rol === 'administrativo') {
      return res.status(403).json({ message: 'No se puede eliminar un usuario administrativo.' });
    }

    const rol = result[0].rol;

    // Iniciar transacción para asegurar consistencia
    connection.beginTransaction((err) => {
      if (err) return res.status(500).json({ message: 'Error al iniciar transacción.' });

      // 1. Eliminar de la tabla específica primero (por restricciones FK)
      let deleteSpecificQuery = '';
      if (rol === 'paciente') {
        deleteSpecificQuery = 'DELETE FROM Paciente WHERE cedula = ?';
      } else if (rol === 'medico') {
        deleteSpecificQuery = 'DELETE FROM Medico WHERE cedula = ?';
      }

      if (deleteSpecificQuery) {
        connection.query(deleteSpecificQuery, [cedula], (err2) => {
          if (err2) {
            return connection.rollback(() => {
              console.error('Error al eliminar de tabla específica:', err2);
              return res.status(500).json({ message: 'Error al eliminar información específica del usuario.' });
            });
          }

          // 2. Eliminar de la tabla usuarios
          connection.query('DELETE FROM usuarios WHERE cedula = ?', [cedula], (err3) => {
            if (err3) {
              return connection.rollback(() => {
                return res.status(500).json({ message: 'Error al eliminar usuario.' });
              });
            }

            // Confirmar transacción
            connection.commit((err4) => {
              if (err4) {
                return connection.rollback(() => {
                  return res.status(500).json({ message: 'Error al confirmar eliminación.' });
                });
              }
              res.json({ message: 'Usuario eliminado correctamente.' });
            });
          });
        });
      } else {
        // Si no hay tabla específica, solo eliminar de usuarios
        connection.query('DELETE FROM usuarios WHERE cedula = ?', [cedula], (err2) => {
          if (err2) {
            return connection.rollback(() => {
              return res.status(500).json({ message: 'Error al eliminar usuario.' });
            });
          }

          // Confirmar transacción
          connection.commit((err3) => {
            if (err3) {
              return connection.rollback(() => {
                return res.status(500).json({ message: 'Error al confirmar eliminación.' });
              });
            }
            res.json({ message: 'Usuario eliminado correctamente.' });
          });
        });
      }
    });
  });
};