export function getDeviceTransport(device) {
    return String(
        device?.data_transport ??
            device?.dataTransport ??
            device?.transport ??
            "",
    )
        .trim()
        .toLowerCase();
}

export function isCellularDevice(device) {
    return getDeviceTransport(device) === "cellular";
}

export function isBleDevice(device) {
    return getDeviceTransport(device) === "ble";
}

export function filterCellularDevices(devices) {
    if (!Array.isArray(devices)) return [];

    return devices.filter(isCellularDevice);
}

export function filterBleDevices(devices) {
    if (!Array.isArray(devices)) return [];

    return devices.filter(isBleDevice);
}
