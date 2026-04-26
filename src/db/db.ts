import pool from "./db_connection.js";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export async function getGnssData() {
    const [rows] = await pool.query<RowDataPacket[]>(
        `
        SELECT
            device_ID,
            lat,
            lon,
            acc,
            data_timestamp
        FROM gnss_data
        LIMIT 100
        `,
    );

    return rows;
}

export async function getGnssDataByDeviceId(deviceId: number, limit = 50) {
    const safeLimit = Math.min(Math.max(Number(limit), 1), 500);

    const [rows] = await pool.query<RowDataPacket[]>(
        `
        SELECT
            device_ID,
            lat,
            lon,
            acc,
            data_timestamp
        FROM gnss_data
        WHERE device_ID = ?
        ORDER BY data_timestamp DESC
        LIMIT ?
        `,
        [deviceId, safeLimit],
    );

    return rows;
}
