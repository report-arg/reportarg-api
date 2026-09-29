const mysql = require('mysql2');
require('dotenv').config();

const parseConnectionFromUrl = (connectionUrl) => {
  const parsed = new URL(connectionUrl);

  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '3306', 10),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
  };
};

const connectionUrl = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_PRIVATE_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;

let dbConfig;
if (connectionUrl) {
  dbConfig = parseConnectionFromUrl(connectionUrl);
  if (process.env.MYSQLDATABASE || process.env.DB_NAME) {
    dbConfig.database = process.env.MYSQLDATABASE || process.env.DB_NAME;
  }
} else {
  dbConfig = {
    host: process.env.MYSQLHOST || process.env.DB_HOST,
    port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
  };
}

const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  keepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Verificar conexión al iniciar
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error conectando a MySQL:', err.message);
    return;
  }
  console.log('Conectado a MySQL correctamente');
  connection.release();
});

module.exports = pool.promise();