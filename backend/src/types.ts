export type user_type = {
    user_ID?: number;
    show_username: string;
    username: string;
    email: string;
    password?: string;
    password_hash?: string;
    auth_provider?: "local" | "google" | "microsoft";
    provider_user_id?: string | null;
};

export interface device_param {
    user_ID: number;
    device_name: string;
    device_serienumber: string;
    data_transport: string;
}

export interface work_area_payload {
    user_ID: number;
    device_ID: number;
    lon: number;
    lat: number;
    circle_radius_m: number;
    matchedAddress: string;
}

export interface ble_motion_packet_type {
    device_ID: number;
    quat_x: number;
    quat_y: number;
    quat_z: number;
    quat_w: number;
    data_packet: number;
    firmware_version: string;
}

export interface device_event_type {
    device_ID: number;
    event_type: string;
    severity: string;
    message: string;
    data_transport: string;
    firmware_version: string;
}

export interface device_lifecycle_type {
    device_ID: number;
    battery_percent: number;
    gnss_periodic_timeout: number;
    gnss_periodic_interval: number;
    firmware_version: string;
}
