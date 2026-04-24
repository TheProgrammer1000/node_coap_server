import mysql from "mysql2/promise"; // ← /promise är viktigt!

import dotenv from "dotenv";
dotenv.config();



const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: process.env.PASSWORD,
    database: "IoT_sensor",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export default pool;
