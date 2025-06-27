//para ejecutar colocar en la terminal npx nodemon app.js

const express = require('express');
const mysql2 = require('mysql2');
const app = express();
const port = 3000;
const authRoutes = require('./routes/authRoutes');

// Middlewares
app.use(express.json());

// Servir archivos estáticos desde la carpeta "views"
app.use(express.static('views'));

const connection = mysql2.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'scah_db',
    password: 'root'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('MySQL Connected...');
});

// Rutas 
app.use('/api/auth', authRoutes(connection));

app.get('/', (req, res) => {
    res.redirect('/vista_general/home.html');
});

app.listen(port, () => {
    console.log(`App running at http://localhost:${port}`);
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/views/vista_general/loginRegistrarse.html');
});

