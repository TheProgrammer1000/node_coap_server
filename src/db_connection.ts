import mysql from "mysql2/promise"; // ← /promise är viktigt!

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "Kalleanka9!",
    database: "IoT_sensor",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export default pool;
