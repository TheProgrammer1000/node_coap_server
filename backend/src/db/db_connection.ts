import mysql from "mysql2/promise"; // ← /promise är viktigt!

const pool = mysql.createPool({
    host: process.env.DB_HOST ?? "localhost",
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? "IoT_sensor_test",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export default pool;
