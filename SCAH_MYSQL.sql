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