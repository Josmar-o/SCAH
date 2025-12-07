-- Crear base de datos
CREATE DATABASE IF NOT EXISTS scah_db;
USE scah_db;

-- Tabla: Paciente
CREATE TABLE Paciente (
    cedula VARCHAR(20) PRIMARY KEY,
    primer_nombre VARCHAR(50) NOT NULL,
    segundo_nombre VARCHAR(50),
    primer_apellido VARCHAR(50) NOT NULL,
    segundo_apellido VARCHAR(50),
    fecha_nacimiento DATE NOT NULL,
    telefono VARCHAR(15),
    correo VARCHAR(100),
    direccion VARCHAR(255),
    foto_perfil VARCHAR(255)
);

-- Tabla: Medico
CREATE TABLE Medico (
    cedula VARCHAR(20) PRIMARY KEY,
    primer_nombre VARCHAR(50) NOT NULL,
    segundo_nombre VARCHAR(50),
    primer_apellido VARCHAR(50) NOT NULL,
    segundo_apellido VARCHAR(50),
    fecha_nacimiento DATE NOT NULL,
    telefono VARCHAR(15),
    correo VARCHAR(100),
    especialidad VARCHAR(100) NOT NULL
);

CREATE TABLE usuarios (
    cedula VARCHAR(50) NOT NULL,
    primer_nombre VARCHAR(50) NOT NULL,
    segundo_nombre VARCHAR(50),
    primer_apellido VARCHAR(50),
    segundo_apellido VARCHAR(50),
    correo VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(300) NOT NULL,
    rol ENUM('paciente', 'medico', 'administrativo') NOT NULL DEFAULT 'paciente',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reset_token VARCHAR(255),
	reset_expires DATETIME
);

-- Tabla: Administrativo
CREATE TABLE Administrativo (
    cedula VARCHAR(20) PRIMARY KEY,
    primer_nombre VARCHAR(50) NOT NULL,
    segundo_nombre VARCHAR(50),
    primer_apellido VARCHAR(50) NOT NULL,
    segundo_apellido VARCHAR(50),
    fecha_nacimiento DATE NOT NULL,
    telefono VARCHAR(15),
    correo VARCHAR(100),
    cargo VARCHAR(100) NOT NULL
);

-- Tabla: Cita
CREATE TABLE Cita (
    id_cita INT AUTO_INCREMENT PRIMARY KEY,
    fecha_cita DATE NOT NULL,
    hora_cita TIME NOT NULL,
    estado ENUM('Programada', 'Confirmada', 'Reagendada', 'Cancelada', 'No asistió', 'Atendida') NOT NULL DEFAULT 'Programada',
    numero_tiquete VARCHAR(20) NOT NULL UNIQUE,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cedula_paciente VARCHAR(20) NOT NULL,
    cedula_medico VARCHAR(20) NOT NULL,
    FOREIGN KEY (cedula_paciente) REFERENCES Paciente(cedula),
    FOREIGN KEY (cedula_medico) REFERENCES Medico(cedula)
);

-- Tabla: Asistencia
CREATE TABLE Asistencia (
    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
    fecha_confirmacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(30) NOT NULL,
    cedula_admin VARCHAR(20) NOT NULL,
    id_cita INT NOT NULL,
    FOREIGN KEY (cedula_admin) REFERENCES Administrativo(cedula),
    FOREIGN KEY (id_cita) REFERENCES Cita(id_cita)
);

-- Tabla: AtencionMedica
CREATE TABLE AtencionMedica (
    id_atencion INT AUTO_INCREMENT PRIMARY KEY,
    diagnostico VARCHAR(255),
    observacion TEXT,
    prescripcion TEXT,
    fecha_atencion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cedula_paciente VARCHAR(20) NOT NULL,
    cedula_medico VARCHAR(20) NOT NULL,
    id_cita INT NOT NULL,
    FOREIGN KEY (cedula_paciente) REFERENCES Paciente(cedula),
    FOREIGN KEY (cedula_medico) REFERENCES Medico(cedula),
    FOREIGN KEY (id_cita) REFERENCES Cita(id_cita)
);

-- Tabla: Cupo
-- Esta tabla almacena los horarios disponibles de los médicos
CREATE TABLE Cupo (
    id_cupo INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    cedula_medico VARCHAR(20) NOT NULL,
    ocupado BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (cedula_medico) REFERENCES Medico(cedula)
);


INSERT INTO Medico (cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, telefono, correo, especialidad)
VALUES
('7-7777-777', 'Ricardo', 'Antonio', 'Díaz', '', '1980-01-01', '60000000', 'ricardo.diaz@correo.com', 'Medicina General'),
('8-8888-888', 'María', 'Elena', 'González', '', '1985-02-02', '60000001', 'maria.gonzalez@correo.com', 'Pediatría'),
('9-9999-999', 'Luis', 'Fernando', 'Ramírez', '', '1978-03-15', '60000003', 'luis.ramirez@correo.com', 'Cardiología'),
('6-6666-666', 'Ana', 'Lucía', 'Morales', '', '1992-07-21', '60000004', 'ana.morales@correo.com', 'Dermatología');

--se necesita correr esto en el node para poder conseguir la contrasena hasheada y luego reemplazarla en la base de datos
-- Ejecutar en la terminal de Node.js para generar la contraseña hasheada
--node -e "require('bcrypt').hash('contrasena123', 10).then(console.log)"

INSERT INTO usuarios (cedula, primer_nombre, primer_apellido, correo, contrasena, rol)
VALUES
('7-7777-777', 'Ricardo', 'Díaz', 'ricardo.diaz@correo.com', 'contrasena123', 'medico'),
('8-8888-888', 'María', 'González', 'maria.gonzalez@correo.com', 'contrasena123', 'medico');


--administrativo
INSERT INTO Administrativo (cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, telefono, correo, cargo)
VALUES
('1-1111-111', 'Admin', '', 'Principal', '', '1990-01-01', '60000002', 'admin@correo.com', 'Administrador General');

-- Contraseña: contrasena123 (reemplaza el hash por el generado con bcrypt)
INSERT INTO usuarios (cedula, primer_nombre, primer_apellido, correo, contrasena, rol)
VALUES
('1-1111-111', 'Admin', 'Principal', 'admin@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'administrativo');

-- Médicos adicionales por especialidad
INSERT INTO Medico (cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, telefono, correo, especialidad)
VALUES
-- Medicina General (2 adicionales)
('2-2222-222', 'Carlos', 'Eduardo', 'Mendoza', 'Vega', '1982-04-12', '60001001', 'carlos.mendoza@correo.com', 'Medicina General'),
('3-3333-333', 'Patricia', 'Isabel', 'Torres', 'López', '1979-11-08', '60001002', 'patricia.torres@correo.com', 'Medicina General'),

-- Pediatría (1 adicional)
('4-4444-444', 'Fernando', 'José', 'Castillo', 'Ruiz', '1987-06-20', '60001003', 'fernando.castillo@correo.com', 'Pediatría'),

-- Cardiología (1 adicional)
('5-5555-555', 'Sofía', 'Alejandra', 'Herrera', 'Sánchez', '1983-09-14', '60001004', 'sofia.herrera@correo.com', 'Cardiología'),

-- Dermatología (1 adicional)
('10-1010-101', 'Miguel', 'Ángel', 'Vargas', 'Peña', '1988-12-03', '60001005', 'miguel.vargas@correo.com', 'Dermatología'),

-- Especialidades nuevas con 2 médicos cada una
-- Neurología
('11-1111-111', 'Andrea', 'Beatriz', 'Jiménez', 'Castro', '1984-03-25', '60001006', 'andrea.jimenez@correo.com', 'Neurología'),
('12-1212-121', 'Roberto', 'Antonio', 'Gutiérrez', 'Moreno', '1981-08-17', '60001007', 'roberto.gutierrez@correo.com', 'Neurología'),

-- Ginecología
('13-1313-131', 'Carmen', 'Rosa', 'Vásquez', 'Delgado', '1986-05-30', '60001008', 'carmen.vasquez@correo.com', 'Ginecología'),
('14-1414-141', 'Alejandro', 'Manuel', 'Rojas', 'Fernández', '1980-10-22', '60001009', 'alejandro.rojas@correo.com', 'Ginecología'),

-- Oftalmología
('15-1515-151', 'Valeria', 'Cristina', 'Paredes', 'Aguilar', '1985-07-18', '60001010', 'valeria.paredes@correo.com', 'Oftalmología'),
('16-1616-161', 'Diego', 'Sebastián', 'Flores', 'Medina', '1982-01-09', '60001011', 'diego.flores@correo.com', 'Oftalmología'),

-- Traumatología
('17-1717-171', 'Mónica', 'Esperanza', 'Ríos', 'Ortega', '1987-04-05', '60001012', 'monica.rios@correo.com', 'Traumatología'),
('18-1818-181', 'Javier', 'Ernesto', 'Silva', 'Guerrero', '1983-12-28', '60001013', 'javier.silva@correo.com', 'Traumatología'),

-- Psiquiatría
('19-1919-191', 'Lucía', 'Gabriela', 'Morales', 'Ramírez', '1984-09-12', '60001014', 'lucia.morales@correo.com', 'Psiquiatría'),
('20-2020-202', 'Andrés', 'Felipe', 'Córdoba', 'Vélez', '1981-06-07', '60001015', 'andres.cordoba@correo.com', 'Psiquiatría');

-- Usuarios para todos los médicos nuevos (contraseña: contrasena123)
-- Nota: Ejecutar primero: node -e "require('bcrypt').hash('contrasena123', 10).then(console.log)" para generar el hash
INSERT INTO usuarios (cedula, primer_nombre, primer_apellido, correo, contrasena, rol)
VALUES
('2-2222-222', 'Carlos', 'Mendoza', 'carlos.mendoza@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('3-3333-333', 'Patricia', 'Torres', 'patricia.torres@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('4-4444-444', 'Fernando', 'Castillo', 'fernando.castillo@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('5-5555-555', 'Sofía', 'Herrera', 'sofia.herrera@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('10-1010-101', 'Miguel', 'Vargas', 'miguel.vargas@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('11-1111-111', 'Andrea', 'Jiménez', 'andrea.jimenez@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('12-1212-121', 'Roberto', 'Gutiérrez', 'roberto.gutierrez@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('13-1313-131', 'Carmen', 'Vásquez', 'carmen.vasquez@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('14-1414-141', 'Alejandro', 'Rojas', 'alejandro.rojas@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('15-1515-151', 'Valeria', 'Paredes', 'valeria.paredes@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('16-1616-161', 'Diego', 'Flores', 'diego.flores@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('17-1717-171', 'Mónica', 'Ríos', 'monica.rios@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('18-1818-181', 'Javier', 'Silva', 'javier.silva@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('19-1919-191', 'Lucía', 'Morales', 'lucia.morales@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('20-2020-202', 'Andrés', 'Córdoba', 'andres.cordoba@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico');

-- También actualizar los médicos existentes que no tienen usuario
INSERT INTO usuarios (cedula, primer_nombre, primer_apellido, correo, contrasena, rol)
VALUES
('9-9999-999', 'Luis', 'Ramírez', 'luis.ramirez@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico'),
('6-6666-666', 'Ana', 'Morales', 'ana.morales@correo.com', '$2b$10$bUqP35cfAtz7Q4Bjw3pRIe5z1UqOBBvQf0ptNuJdkfucNjOZvFXMi', 'medico');