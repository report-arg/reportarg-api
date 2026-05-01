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

const dbConfig = process.env.MYSQL_PUBLIC_URL
  ? parseConnectionFromUrl(process.env.MYSQL_PUBLIC_URL)
  : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };

const pool = mysql.createPool({
  host:               dbConfig.host,
  port:               dbConfig.port,
  user:               dbConfig.user,
  password:           dbConfig.password,
  database:           dbConfig.database,
  waitForConnections: true,
  connectionLimit:    10,
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