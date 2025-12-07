//para ejecutar colocar en la terminal npx nodemon app.js

require('dotenv').config(); // Cargar variables de entorno
const express = require('express');
const mysql2 = require('mysql2');
const app = express();
const port = process.env.PORT || 3000;
const authRoutes = require('./routes/authRoutes');
const medicoRoutes = require('./routes/medicoRoute');
const citaRoutes = require('./routes/citaRoutes');
const cupoRoutes = require('./routes/cupoRoutes');
const reagendarRoutes = require('./routes/reagendarRoutes');
const usuariosRoute = require('./routes/usuariosRoute');
const session = require('express-session');
const path = require('path'); // Módulo nativo, no instalar
const requireViewAccess = require('./middlewares/requireViewAccess');

app.use(session({
  secret: process.env.SESSION_SECRET || 'tu_clave_secreta', // Usar variable de entorno
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // true en producción con HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Middlewares
app.use(express.json());

// Middleware de protección ANTES de servir archivos estáticos
app.use('/scah', (req, res, next) => {
  // Solo aplicar protección a archivos HTML en vistas específicas
  if (req.url.includes('vista_paciente') && req.url.endsWith('.html')) {
    console.log('🔒 Protegiendo vista de paciente:', req.url);
    return requireViewAccess(['paciente'])(req, res, next);
  } else if (req.url.includes('vista_medico') && req.url.endsWith('.html')) {
    console.log('🔒 Protegiendo vista de médico:', req.url);
    return requireViewAccess(['medico'])(req, res, next);
  } else if (req.url.includes('vista_administrativo') && req.url.endsWith('.html')) {
    console.log('🔒 Protegiendo vista administrativo:', req.url);
    return requireViewAccess(['administrativo'])(req, res, next);
  }
  
  // Para todas las demás rutas, continuar normalmente
  next();
});

// Servir archivos estáticos desde la carpeta "views" con prefijo /scah
app.use('/scah/views', express.static('views'));
app.use('/scah', express.static('views'));

const connection = mysql2.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('MySQL Connected...');
});


// Rutas con prefijo /scah
app.use('/scah/api/medico', medicoRoutes(connection));
app.use('/scah/api/auth', authRoutes(connection));
app.use('/scah/api/cupo', cupoRoutes(connection));
app.use('/scah/api/citas', citaRoutes(connection));
app.use('/scah/api/usuarios', usuariosRoute(connection));
app.use('/scah/api/reagendar', reagendarRoutes(connection));
app.use('/scah/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/scah/api/cita', citaRoutes(connection));

// Rutas específicas
app.get('/scah/', (req, res) => {
    console.log('📍 Redirigiendo desde /scah/ hacia vista_general/home.html');
    res.redirect('/scah/vista_general/home.html');
});

app.get('/scah/login', (req, res) => {
    res.sendFile(__dirname + '/views/vista_general/loginRegistrarse.html');
});

// Ruta principal - redirigir a SCAH
app.get('/', (req, res) => {
    console.log('📍 Redirigiendo desde / hacia /scah/vista_general/home.html');
    res.redirect('/scah/vista_general/home.html');
});

app.listen(port, () => {
    console.log(`🚀 SCAH Server running on port ${port}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Access at: http://localhost:${port}/scah`);
});

