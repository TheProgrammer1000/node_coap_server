import pool from "./db_connection.js";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export async function get_user_devices_latest_positions(
    user_ID: number,
    limit: number,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_user_devices_latest_positions(?, ?);",
        [user_ID, limit],
    );

    return result[0];
}

export async function register_user(
    show_username: string,
    username: string,
    password: string,
    email: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL register_user(?, ?, ?, ?);",
        [show_username, username, password, email],
    );

    return result[0];
}

export async function login_user(username: string, email: string) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL login_user(?, ?);",
        [username, email],
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
    data_transport: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_new_device(?, ?, ?, ?);",
        [user_ID, device_name, device_serienumber, data_transport],
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

export async function get_device_arealocation(device_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_device_arealocation(?);",
        [device_ID],
    );

    console.log(result);

    return result[0];
}

export async function get_last_device_state(
    device_ID: number,
    status_type: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_last_device_state(?, ?);",
        [device_ID, status_type],
    );

    console.log(result);

    return result[0];
}

export async function add_device_alert(
    device_ID: number,
    status_type: string,
    from_status: string,
    to_status: string,
    status_value: number,
    reason: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_device_alert(?, ?, ?, ?, ?, ?);",
        [device_ID, status_type, from_status, to_status, status_value, reason],
    );

    console.log(result);

    return result[0];
}

export async function add_device_state(
    device_ID: number,
    status_type: string,
    status_now: string,
    status_value: number,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_device_state(?, ?, ?, ?);",
        [device_ID, status_type, status_now, status_value],
    );

    console.log(result);

    return result[0];
}

export async function get_all_devices_alert_by_type(
    device_ID: number,
    status_type: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_all_devices_alert_by_type(?, ?);",
        [device_ID, status_type],
    );

    console.log(result);

    return result[0];
}

export async function get_all_device_alert(
    device_ID: number,
    status_type: string,
    user_ID: number,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_all_device_alert(?, ?, ?);",
        [device_ID, status_type, user_ID],
    );

    console.log(result);

    return result[0];
}

export async function add_device_health(
    device_ID: number,
    battery_percent: number,
    firmware_version: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_device_health(?, ?, ?);",
        [device_ID, battery_percent, firmware_version],
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

export async function get_user_devices_lastseen_status(user_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_user_devices_lastseen_status(?);",
        [user_ID],
    );

    return result[0];
}

export async function get_device_user_by_userID(user_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_device_user_by_userID(?);",
        [user_ID],
    );

    return result[0];
}

export async function add_device_ble_data_session(device_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_device_ble_data_session(?);",
        [device_ID],
    );

    return result[0];
}

export async function add_device_ble_motion_data(
    device_ID: number,
    quat_x: number,
    quat_y: number,
    quat_z: number,
    quat_w: number,
    data_packet: number,
    firmware_version: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_device_ble_motion_data(?,?,?,?,?,?,?);",
        [
            device_ID,
            quat_x,
            quat_y,
            quat_z,
            quat_w,
            data_packet,
            firmware_version,
        ],
    );

    console.log(result);

    return result[0];
}

export async function update_device_ble_data_session(device_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL update_device_ble_data_session(?);",
        [device_ID],
    );

    console.log(result);

    return result[0];
}

export async function get_device_ble_motion_session_data_by_user(
    user_ID: number,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_device_ble_motion_session_data_by_user(?);",
        [user_ID],
    );

    return result[0];
}

export async function get_all_device_ble(user_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_all_device_ble(?);",
        [user_ID],
    );

    return result[0];
}

export async function find_or_create_oauth_user(
    show_username: string,
    username: string,
    email: string,
    auth_provider: "google" | "microsoft",
    provider_user_id: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL find_or_create_oauth_user(?, ?, ?, ?, ?);",
        [show_username, username, email, auth_provider, provider_user_id],
    );

    return result[0];
}

export async function get_user_devices_with_status(user_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_user_devices_with_status(?);",
        [user_ID],
    );

    return result[0];
}

export async function get_all_devices_from_userID(user_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_all_devices_from_userID(?);",
        [user_ID],
    );

    console.log(result);

    return result[0];
}

export async function get_user_device_with_status(
    user_ID: number,
    device_ID: number,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_user_device_with_status(?, ?);",
        [user_ID, device_ID],
    );

    return result[0];
}

export async function get_gnss_data_position(
    user_ID: number,
    device_ID: number,
    limit: number,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_gnss_data_position(?, ?, ?);",
        [user_ID, device_ID, limit],
    );

    return result[0];
}

// p_device_ID bigint, p_lat decimal(10,7), p_lon decimal(10,7), p_acc decimal(5,2)

export async function add_device_gnss_data(
    device_ID: number,
    lat: number,
    lon: number,
    acc: number,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_device_gnss_data(?, ?, ?, ?);",
        [device_ID, lat, lon, acc],
    );

    console.log(result);

    return result[0];
}

export async function add_device_event(
    device_ID: number,
    event_type: string,
    severity: string,
    message: string,
    data_transport: string,
    firmware_version: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_device_event(?, ?, ?, ?, ?, ?);",
        [
            device_ID,
            event_type,
            severity,
            message,
            data_transport,
            firmware_version,
        ],
    );

    console.log(result);

    return result[0];
}

export async function get_device_event(
    user_ID: number,
    data_transport: string,
    limit: number,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_device_event(?, ?, ?);",
        [user_ID, data_transport, limit],
    );

    return result[0];
}

export async function add_device_firmware_que(
    device_ID: number,
    command: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL add_device_firmware_que(?, ?);",
        [device_ID, command],
    );

    return result[0];
}

export async function get_device_firmware_command(device_ID: number) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_device_firmware_command(?);",
        [device_ID],
    );

    return result[0];
}

//p_device_ID BIGINT, p_command_status VARCHAR(255), p_msg TEXT, p_payload JSON
export async function update_device_firmware_que(
    device_ID: number,
    command_status: string,
    msg: string,
    payload: string,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL update_device_firmware_que(?, ?, ?, ?);",
        [device_ID, command_status, msg, payload],
    );

    return result[0];
}

export async function get_device_firmware_que_all_done(
    user_ID: number,
    device_ID: number,
) {
    const [result] = await pool.query<RowDataPacket[][]>(
        "CALL get_device_firmware_que_all_done(?, ?);",
        [user_ID, device_ID],
    );

    return result[0];
}
