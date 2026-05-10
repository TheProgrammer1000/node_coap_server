import pool from "./db_connection.js";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export async function get_user_devices_latest_positions(user_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_user_devices_latest_positions(?);",
        [user_ID],
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

export async function get_all_deviceID_by_userID(user_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_all_deviceID_by_userID(?);",
        [user_ID],
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

export async function get_user_arealocations(user_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_user_arealocations(?);",
        [user_ID],
    );

    return result[0];
}

export async function add_new_device(
    user_ID: number,
    device_name: string,
    device_serienumber: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_new_device(?, ?, ?);",
        [user_ID, device_name, device_serienumber],
    );

    console.log(result);

    return result[0]?.[0];
}

export async function add_device_arealocation(
    user_ID: number,
    device_ID: number,
    lon: number,
    lat: number,
    circle_radius: number,
    matchedAddress: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_device_arealocation(?, ?, ?, ?, ?, ?);",
        [user_ID, device_ID, lon, lat, circle_radius, matchedAddress],
    );

    console.log(result);

    return result[0];
}

export async function get_gnss_data_for_arealocation(user_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_gnss_data_for_arealocation(?);",
        [user_ID],
    );

    console.log(result);

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

export async function add_device_zone_state(
    device_ID: number,
    status: string,
    device_area_distance_m: number,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_device_zone_state(?, ?, ?);",
        [device_ID, status, device_area_distance_m],
    );

    console.log(result);

    return result[0];
}

export async function get_device_arealocation(device_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_device_arealocation(?);",
        [device_ID],
    );

    console.log(result);

    return result[0];
}

export async function get_last_device_zone_state(device_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_last_device_zone_state(?);",
        [device_ID],
    );

    console.log(result);

    return result[0];
}

export async function add_device_zone_alert(
    device_ID: number,
    from_status: string,
    to_status: string,
    device_area_distance_m: number,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_device_zone_alert(?, ?, ?, ?);",
        [device_ID, from_status, to_status, device_area_distance_m],
    );

    console.log(result);

    return result[0];
}

export async function get_all_device_zone_alert(device_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_all_device_zone_alert(?);",
        [device_ID],
    );

    console.log(result);

    return result;
}

export async function add_device_status(device_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_device_status(?);",
        [device_ID],
    );

    console.log(result);
    return result;
}

export async function get_userID_by_deviceID(device_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_userID_by_deviceID(?);",
        [device_ID],
    );

    console.log(result);
    return result;
}

export async function get_user_devices_status(user_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_user_devices_status(?);",
        [user_ID],
    );

    return result[0];
}
