# SCAH - Sistema de Control de Atención Hospitalaria

Sistema web completo para la gestión de citas médicas, pacientes y médicos en un entorno hospitalario.

## 📋 Descripción

SCAH es una aplicación web diseñada para facilitar la administración de citas médicas en instituciones de salud. Permite a los pacientes agendar citas, a los médicos gestionar sus consultas y al personal administrativo supervisar el sistema completo.

## ✨ Funcionalidades Principales

### Para Pacientes
- 👤 Registro y autenticación de usuarios
- 📅 Agendamiento de citas médicas
- 🔄 Reprogramación de citas existentes
- 📋 Visualización de historial médico
- 👨‍⚕️ Selección de médicos por especialidad
- 📧 Notificaciones por correo electrónico
- 🖼️ Gestión de foto de perfil
- 📊 Dashboard personalizado

### Para Médicos
- 📆 Visualización de agenda de citas
- ⏰ Gestión de cupos disponibles
- 📝 Registro de observaciones médicas
- 👥 Consulta de información de pacientes
- 📊 Panel de control con estadísticas

### Para Administrativos
- 👥 Gestión completa de usuarios (pacientes, médicos, administrativos)
- 📈 Visualización de estadísticas del sistema
- 📋 Administración de citas
- 🔧 Control total del sistema

## 🏗️ Arquitectura

El proyecto sigue una arquitectura **MVC (Model-View-Controller)** con las siguientes capas:

```
┌─────────────────┐
│   CLIENTE       │  ← HTML/JavaScript (Vistas)
└────────┬────────┘
         │
┌────────▼────────┐
│   RUTAS         │  ← Express Router
└────────┬────────┘
         │
┌────────▼────────┐
│ MIDDLEWARES     │  ← Autenticación/Autorización
└────────┬────────┘
         │
┌────────▼────────┐
│ CONTROLADORES   │  ← Lógica de Negocio
└────────┬────────┘
         │
┌────────▼────────┐
│   BASE DE DATOS │  ← MySQL
└─────────────────┘
```

### Componentes de la Arquitectura

1. **Cliente (Frontend)**: Archivos HTML estáticos con JavaScript vanilla
2. **Servidor (Backend)**: Node.js con Express.js
3. **Base de Datos**: MySQL para persistencia de datos
4. **Gestión de Sesiones**: Express-session con almacenamiento en MySQL
5. **Autenticación**: bcrypt para encriptación de contraseñas
6. **Notificaciones**: Nodemailer para envío de correos

## 📁 Estructura del Proyecto

```
SCAH/
├── app.js                      # Punto de entrada de la aplicación
├── package.json                # Dependencias y scripts
├── ecosystem.config.js         # Configuración de PM2 para producción
├── eslint.config.mjs          # Configuración de ESLint
├── SCAH_MYSQL.sql             # Schema de base de datos
│
├── controllers/               # Lógica de negocio
│   ├── authController.js      # Autenticación y registro
│   ├── citaController.js      # Gestión de citas
│   ├── cupoController.js      # Gestión de cupos médicos
│   ├── medicoController.js    # Operaciones de médicos
│   ├── reagendarController.js # Reprogramación de citas
│   ├── usuariosController.js  # Administración de usuarios
│   └── emailService.js        # Servicio de notificaciones
│
├── middlewares/               # Middleware de seguridad
│   ├── requireLogin.js        # Verificación de autenticación
│   ├── requireRole.js         # Control de roles
│   └── requireViewAccess.js   # Protección de vistas
│
├── routes/                    # Definición de endpoints
│   ├── authRoutes.js          # Rutas de autenticación
│   ├── citaRoutes.js          # Rutas de citas
│   ├── cupoRoutes.js          # Rutas de cupos
│   ├── medicoRoute.js         # Rutas de médicos
│   ├── perfilRoutes.js        # Rutas de perfil
│   ├── reagendarRoutes.js     # Rutas de reprogramación
│   └── usuariosRoute.js       # Rutas de usuarios
│
├── views/                     # Interfaz de usuario
│   ├── navbar/                # Componentes de navegación
│   ├── vista_general/         # Vistas públicas (login, home)
│   ├── vista_paciente/        # Vistas de pacientes
│   ├── vista_medico/          # Vistas de médicos
│   └── vista_administrativo/  # Vistas de administración
│
└── uploads/                   # Archivos subidos (fotos de perfil)
```

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** - Entorno de ejecución
- **Express.js** - Framework web
- **MySQL2** - Conector de base de datos
- **Express-session** - Gestión de sesiones
- **Express-mysql-session** - Almacenamiento de sesiones en MySQL

### Seguridad
- **bcrypt/bcryptjs** - Encriptación de contraseñas
- **jsonwebtoken** - Tokens de autenticación
- **crypto** - Generación de tokens seguros

### Utilidades
- **Nodemailer** - Envío de correos electrónicos
- **Multer** - Manejo de uploads de archivos
- **dotenv** - Variables de entorno
- **cedula-panama** - Validación de cédulas panameñas

### Frontend
- **HTML5** - Estructura
- **CSS3** - Estilos
- **JavaScript (Vanilla)** - Interactividad
- **Fetch API** - Comunicación con el backend

### DevOps & Herramientas
- **PM2** - Gestor de procesos (modo cluster)
- **Nodemon** - Desarrollo con auto-reload
- **ESLint** - Linting de código
- **Git** - Control de versiones

### Base de Datos
- **MySQL** - Sistema de gestión de base de datos relacional

## 🗄️ Modelo de Base de Datos

### Tablas Principales

- **usuarios**: Información de autenticación y roles
- **Paciente**: Datos personales de pacientes
- **Medico**: Información de médicos y especialidades
- **Administrativo**: Datos del personal administrativo
- **Cupo**: Disponibilidad de horarios médicos
- **Cita**: Registro de citas médicas
- **Atencion**: Registro de atenciones y observaciones médicas
- **sessions**: Almacenamiento de sesiones activas

## 🚀 Instalación y Configuración

### Prerequisitos
- Node.js (v14 o superior)
- MySQL (v5.7 o superior)
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/Josmar-o/SCAH.git
cd SCAH
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crear un archivo `.env` en la raíz del proyecto:
```env
# Base de datos
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=scah_db

# Servidor
PORT=3000
SESSION_SECRET=tu_clave_secreta_muy_segura

# Correo electrónico (Nodemailer)
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicación
```

4. **Crear la base de datos**
```bash
mysql -u tu_usuario -p < SCAH_MYSQL.sql
```

5. **Iniciar la aplicación**

Modo desarrollo:
```bash
npm run dev
```

Modo producción:
```bash
npm start
```

Con PM2 (recomendado para producción):
```bash
pm2 start ecosystem.config.js
```

6. **Acceder a la aplicación**
```
http://localhost:3000/scah/
```

## 🔐 Sistema de Roles y Permisos

El sistema cuenta con tres roles principales:

1. **Paciente**: Puede agendar citas, ver su historial, actualizar su perfil
2. **Médico**: Gestiona cupos, atiende citas, registra observaciones
3. **Administrativo**: Control completo del sistema, gestión de usuarios y estadísticas

Cada vista está protegida por middlewares que verifican:
- Autenticación (sesión activa)
- Rol apropiado para acceder a la vista
- Permisos específicos para operaciones sensibles

## 📧 Sistema de Notificaciones

El sistema envía correos electrónicos automatizados para:
- Confirmación de registro
- Confirmación de citas agendadas
- Recordatorios de citas
- Recuperación de contraseña
- Cambios en el estado de citas

## 🔒 Seguridad

- Contraseñas encriptadas con bcrypt (10 rounds)
- Validación de contraseñas (mínimo 8 caracteres, números, símbolos)
- Sesiones almacenadas en MySQL con expiración
- Tokens de reseteo de contraseña con caducidad
- Validación de cédulas panameñas
- Protección de rutas según roles
- Sanitización de entradas de usuario

## 🌐 Endpoints API Principales

### Autenticación (`/scah/api/auth`)
- `POST /login` - Inicio de sesión
- `POST /register` - Registro de usuarios
- `POST /logout` - Cerrar sesión
- `POST /forgot-password` - Recuperar contraseña
- `POST /reset-password` - Restablecer contraseña

### Citas (`/scah/api/citas`)
- `GET /citas-disponibles` - Obtener cupos disponibles
- `POST /crear` - Agendar nueva cita
- `GET /paciente/:cedula` - Citas de un paciente
- `PUT /actualizar/:id` - Modificar cita

### Médicos (`/scah/api/medico`)
- `GET /especialidades` - Listar especialidades
- `GET /por-especialidad/:especialidad` - Médicos por especialidad
- `GET /cupos/:cedula` - Cupos de un médico

### Usuarios (`/scah/api/usuarios`) 
- `GET /listar` - Listar todos los usuarios
- `POST /crear` - Crear nuevo usuario
- `PUT /actualizar/:cedula` - Actualizar usuario
- `DELETE /eliminar/:cedula` - Eliminar usuario

## 📊 Características Técnicas

- **Modo Cluster**: Configurado para ejecutarse en múltiples instancias con PM2
- **Sesiones Persistentes**: Almacenadas en MySQL para soportar múltiples instancias
- **Upload de Archivos**: Sistema de gestión de fotos de perfil
- **Validaciones**: Validación de fechas, horarios y datos de usuario
- **Logging**: Registro de errores y eventos importantes
- **Auto-restart**: Configurado para reinicio automático en caso de errores

## 🐛 Scripts Disponibles

```json
{
  "start": "node app.js",           // Producción
  "dev": "nodemon app.js",          // Desarrollo con auto-reload
  "lint": "eslint ."                // Verificar calidad de código
}
```

## 📝 Notas de Desarrollo

- Prefijo de rutas: `/scah/` para todas las rutas
- Puerto por defecto: `3000`
- Sesiones: Expiración de 24 horas
- Uploads: Almacenados en `/uploads/fotos/`
- Variables de entorno requeridas en `.env`

## 👥 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

ISC

## 🔗 Enlaces

- **Repositorio**: [https://github.com/Josmar-o/SCAH](https://github.com/Josmar-o/SCAH)
- **Issues**: [https://github.com/Josmar-o/SCAH/issues](https://github.com/Josmar-o/SCAH/issues)

---

**Desarrollado con ❤️ para mejorar la gestión hospitalaria**
