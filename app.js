//para ejecutar colocar en la terminal npx nodemon app.js

require('dotenv').config(); // Cargar variables de entorno
const express = require('express');
const mysql2 = require('mysql2');
const app = express();
const port = 3000;
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
  secret: 'tu_clave_secreta', // Cambia esto por una clave segura
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Usa true solo si usas HTTPS
}));

// Middlewares
app.use(express.json());

// Middleware de protección ANTES de servir archivos estáticos
app.use((req, res, next) => {
  console.log('🌐 Interceptando ruta:', req.url);
  
  // Solo aplicar protección a archivos HTML en vistas específicas
  if (req.url.includes('vista_paciente') && req.url.endsWith('.html')) {
    console.log('🔒 Protegiendo vista de paciente');
    return requireViewAccess(['paciente'])(req, res, next);
  } else if (req.url.includes('vista_medico') && req.url.endsWith('.html')) {
    console.log('🔒 Protegiendo vista de médico');
    return requireViewAccess(['medico'])(req, res, next);
  } else if (req.url.includes('vista_administrativo') && req.url.endsWith('.html')) {
    console.log('🔒 Protegiendo vista administrativo');
    return requireViewAccess(['administrativo'])(req, res, next);
  }
  
  // Para todas las demás rutas, continuar normalmente
  next();
});

// Servir archivos estáticos desde la carpeta "views"
app.use('/views', express.static('views'));
app.use(express.static('views'));

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


// Rutas 
app.use('/api/medico', medicoRoutes(connection));
app.use('/api/auth', authRoutes(connection));
app.use('/api/cupo', cupoRoutes(connection));
app.use('/api/citas', citaRoutes(connection));
app.use('/api/usuarios', usuariosRoute(connection));
app.use('/api/reagendar', reagendarRoutes(connection));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/cita', citaRoutes(connection)); 
app.get('/', (req, res) => {
    res.redirect('/vista_general/home.html');
});

app.listen(port, () => {
    console.log(`App running at http://localhost:${port}`);
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/views/vista_general/loginRegistrarse.html');
});

