import pool from "./db_connection.js"; // ← .js även i TypeScript med NodeNext

const [rows] = await pool.query("SELECT * FROM gps_sensor_data");
console.log(rows);
