// Configuración para PM2 (Process Manager)
module.exports = {
  apps: [{
    name: 'scah-app',
    script: './app.js',
    instances: 2, // Múltiples instancias ahora funcionarán con MySQL session store
    exec_mode: 'cluster', // Modo cluster para alta disponibilidad
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
