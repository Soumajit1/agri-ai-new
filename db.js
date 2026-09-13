const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Test pool connection on startup
db.query('SELECT 1', (err) => {
    if (err) {
        console.error('MySQL pool connection failed:', err.message);
    } else {
        console.log('MySQL pool connected successfully');
    }
});

module.exports = db;
