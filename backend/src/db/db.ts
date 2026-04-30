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

export async function register_user(
    show_username: string,
    username: string,
    password: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL register_user(?, ?, ?);",
        [show_username, username, password],
    );

    return result[0];
}

export async function login_user(username: string, password: string) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL login_user(?, ?);",
        [username, password],
    );

    return result[0];
}

export async function get_gnss_user_device(device_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_gnss_user_device(?);",
        [device_ID],
    );

    return result[0];
}

export async function get_deviceID_by_userID(user_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_deviceID_by_userID(?);",
        [user_ID],
    );

    return result[0];
}

export async function get_gnss_data_by_user_deviceID(device_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_gnss_data_by_user_deviceID(?);",
        [device_ID],
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
