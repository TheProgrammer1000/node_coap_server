export interface user_type {
    show_username: string;
    username: string;
    password: string;
}

export interface device_param {
    user_ID: number;
    device_name: string;
    device_serienumber: string;
}

export interface work_area_payload {
    user_ID: number;
    device_ID: number;
    lon: number;
    lat: number;
    circle_radius_m: number;
    matchedAddress: string;
}
