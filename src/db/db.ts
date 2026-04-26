import pool from "./db_connection.js";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export async function getLastPositions(limit = 10) {
    const safeLimit = Math.min(Math.max(Number(limit), 1), 500);

    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_last_posistions(?);",
        [safeLimit],
    );

    return result[0];
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
