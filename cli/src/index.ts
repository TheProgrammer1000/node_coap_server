#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import axios from "axios";

const program = new Command();

const API_URL = (
    process.env.NODECORE_API_URL || "http://127.0.0.1:3000"
).replace(/\/$/, "");

type TableColumn<T> = {
    label: string;
    width: number;
    value: (row: T) => string | number | null | undefined;
};

type DeviceRow = {
    device_ID: number;
    device_name: string;
    data_transport: string;
};

type DeviceStatusRow = DeviceRow & {
    battery_percent: number | null;
    firmware_version: string | null;
    last_seen: string | null;
    connection_status: string | null;
};

type DevicePositionRow = {
    device_ID: number;
    device_name?: string | null;
    data_transport?: string | null;
    lat: string | number | null;
    lon: string | number | null;
    acc: string | number | null;
    data_timestamp?: string | null;
    created_at?: string | null;
};

type DeviceAlertRow = {
    id: number;
    device_ID: number;
    status_type: "geofence" | "device_connection" | "battery" | string;
    from_status: string | null;
    to_status: string | null;
    status_value: string | number | null;
    reason: string | null;
    created_at: string;
    user_ID: number;
    device_name: string;
    data_transport: "cellular" | "ble" | string;
};

function formatCell(value: string | number | null | undefined, width: number) {
    const text = String(value ?? "N/A");

    if (text.length > width) {
        return `${text.slice(0, width - 1)}…`;
    }

    return text.padEnd(width, " ");
}

function formatDate(value: string | null | undefined) {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "N/A";
    }

    return new Intl.DateTimeFormat("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function printTable<T>(columns: TableColumn<T>[], rows: T[]) {
    const header = columns
        .map((column) => formatCell(column.label, column.width))
        .join("  ");

    const divider = columns
        .map((column) => "-".repeat(column.width))
        .join("  ");

    console.log(header);
    console.log(divider);

    rows.forEach((row) => {
        const line = columns
            .map((column) => formatCell(column.value(row), column.width))
            .join("  ");

        console.log(line);
    });
}

function handleAxiosError(error: unknown) {
    if (axios.isAxiosError(error)) {
        console.error("Request failed:", error.response?.data ?? error.message);
        process.exitCode = 1;
        return;
    }

    console.error("Unexpected error:", error);
    process.exitCode = 1;
}

function parseRequiredNumber(value: string, label: string) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        console.error(`Invalid ${label}: ${value}`);
        process.exitCode = 1;
        return null;
    }

    return parsed;
}

function getRows<T>(data: unknown): T[] {
    const maybeData = data as { data?: unknown };

    return Array.isArray(maybeData.data) ? (maybeData.data as T[]) : [];
}

function isSuccessResponse(data: unknown) {
    const result = data as { success?: boolean };

    return result?.success === true;
}

function getMessage(data: unknown, fallback: string) {
    const result = data as { msg?: string; message?: string };

    return result?.msg || result?.message || fallback;
}

program
    .name("nodecore")
    .description("CLI tool for NodeCore IoT platform")
    .version("0.0.1");

const devicesCommands = program
    .command("devices")
    .description("Manage and view devices");

const deviceCommands = program
    .command("device")
    .description("Manage and view single device");

const sendCommands = program
    .command("send")
    .description("Send test data to backend");

// -----------------------------------------------------------------------------
// devices list
// -----------------------------------------------------------------------------

devicesCommands
    .command("list")
    .description("List devices for the user")
    .requiredOption("-u, --user <userId>", "user ID")
    .action(async (options) => {
        try {
            const userId = parseRequiredNumber(options.user, "user ID");
            if (userId === null) return;

            const response = await axios.get(
                `${API_URL}/api/device/get/all/${userId}`,
            );

            const data = response.data;

            if (!isSuccessResponse(data)) {
                console.log(getMessage(data, "No devices found."));
                return;
            }

            const rows = getRows<DeviceRow>(data);

            if (rows.length === 0) {
                console.log(`No devices found for user ${userId}.`);
                return;
            }

            printTable<DeviceRow>(
                [
                    {
                        label: "ID",
                        width: 10,
                        value: (row) => row.device_ID,
                    },
                    {
                        label: "Name",
                        width: 16,
                        value: (row) => row.device_name,
                    },
                    {
                        label: "Transport",
                        width: 12,
                        value: (row) => row.data_transport,
                    },
                ],
                rows,
            );
        } catch (error) {
            handleAxiosError(error);
        }
    });

// -----------------------------------------------------------------------------
// device status
// -----------------------------------------------------------------------------

deviceCommands
    .command("status")
    .description("Gives the status of given device and user")
    .requiredOption("-d, --device <deviceId>", "device ID")
    .requiredOption("-u, --user <userId>", "user ID")
    .action(async (options) => {
        try {
            const userId = parseRequiredNumber(options.user, "user ID");
            const deviceId = parseRequiredNumber(options.device, "device ID");

            if (userId === null || deviceId === null) return;

            const response = await axios.get(
                `${API_URL}/api/device/status/get/${userId}?device_ID=${deviceId}`,
            );

            const data = response.data;

            if (!isSuccessResponse(data)) {
                console.log(getMessage(data, "No device status found."));
                return;
            }

            const rows = getRows<DeviceStatusRow>(data);

            if (rows.length === 0) {
                console.log(`No status found for device ${deviceId}.`);
                return;
            }

            printTable<DeviceStatusRow>(
                [
                    {
                        label: "ID",
                        width: 10,
                        value: (row) => row.device_ID,
                    },
                    {
                        label: "Name",
                        width: 16,
                        value: (row) => row.device_name,
                    },
                    {
                        label: "Transport",
                        width: 12,
                        value: (row) => row.data_transport,
                    },
                    {
                        label: "Battery",
                        width: 10,
                        value: (row) =>
                            row.battery_percent !== null &&
                            row.battery_percent !== undefined
                                ? `${row.battery_percent}%`
                                : "N/A",
                    },
                    {
                        label: "Firmware",
                        width: 12,
                        value: (row) => row.firmware_version,
                    },
                    {
                        label: "Last seen",
                        width: 18,
                        value: (row) => formatDate(row.last_seen),
                    },
                    {
                        label: "Status",
                        width: 10,
                        value: (row) => row.connection_status,
                    },
                ],
                rows,
            );
        } catch (error) {
            handleAxiosError(error);
        }
    });

// -----------------------------------------------------------------------------
// device position
// -----------------------------------------------------------------------------

deviceCommands
    .command("position")
    .description("Gives device latest position")
    .requiredOption("-u, --user <userId>", "user ID")
    .requiredOption("-d, --device <deviceId>", "device ID")
    .action(async (options) => {
        try {
            const userId = parseRequiredNumber(options.user, "user ID");
            const deviceId = parseRequiredNumber(options.device, "device ID");

            if (userId === null || deviceId === null) return;

            const response = await axios.get(
                `${API_URL}/api/device/gnss/get/position/${userId}?device_ID=${deviceId}`,
            );

            const data = response.data;

            if (!isSuccessResponse(data)) {
                console.log(getMessage(data, "No device position found."));
                return;
            }

            const rows = getRows<DevicePositionRow>(data);

            if (rows.length === 0) {
                console.log(`No GNSS position found for device ${deviceId}.`);
                return;
            }

            printTable<DevicePositionRow>(
                [
                    {
                        label: "Device",
                        width: 10,
                        value: (row) => row.device_ID,
                    },
                    {
                        label: "Name",
                        width: 16,
                        value: (row) => row.device_name,
                    },
                    {
                        label: "Lat",
                        width: 14,
                        value: (row) => row.lat,
                    },
                    {
                        label: "Lon",
                        width: 14,
                        value: (row) => row.lon,
                    },
                    {
                        label: "Acc",
                        width: 10,
                        value: (row) =>
                            row.acc !== null && row.acc !== undefined
                                ? `${row.acc} m`
                                : "N/A",
                    },
                    {
                        label: "Time",
                        width: 18,
                        value: (row) =>
                            formatDate(row.data_timestamp ?? row.created_at),
                    },
                ],
                rows,
            );
        } catch (error) {
            handleAxiosError(error);
        }
    });

// -----------------------------------------------------------------------------
// device history
// -----------------------------------------------------------------------------

deviceCommands
    .command("history")
    .description("Gives the position history of the given device")
    .requiredOption("-u, --user <userId>", "user ID")
    .requiredOption("-d, --device <deviceId>", "device ID")
    .option("-l, --limit <limit>", "limit of history to display", "10")
    .action(async (options) => {
        try {
            const userId = parseRequiredNumber(options.user, "user ID");
            const deviceId = parseRequiredNumber(options.device, "device ID");
            const limit = parseRequiredNumber(options.limit, "limit");

            if (userId === null || deviceId === null || limit === null) {
                return;
            }

            const response = await axios.get(
                `${API_URL}/api/device/gnss/get/position/${userId}?device_ID=${deviceId}&limit=${limit}`,
            );

            const data = response.data;

            if (!isSuccessResponse(data)) {
                console.log(getMessage(data, "No device GNSS history found."));
                return;
            }

            const rows = getRows<DevicePositionRow>(data);

            if (rows.length === 0) {
                console.log(`No GNSS history found for device ${deviceId}.`);
                return;
            }

            printTable<DevicePositionRow>(
                [
                    {
                        label: "Device",
                        width: 10,
                        value: (row) => row.device_ID,
                    },
                    {
                        label: "Name",
                        width: 16,
                        value: (row) => row.device_name,
                    },
                    {
                        label: "Lat",
                        width: 14,
                        value: (row) => row.lat,
                    },
                    {
                        label: "Lon",
                        width: 14,
                        value: (row) => row.lon,
                    },
                    {
                        label: "Acc",
                        width: 10,
                        value: (row) =>
                            row.acc !== null && row.acc !== undefined
                                ? `${row.acc} m`
                                : "N/A",
                    },
                    {
                        label: "Time",
                        width: 18,
                        value: (row) =>
                            formatDate(row.data_timestamp ?? row.created_at),
                    },
                ],
                rows,
            );
        } catch (error) {
            handleAxiosError(error);
        }
    });

// -----------------------------------------------------------------------------
// device alerts
// -----------------------------------------------------------------------------

deviceCommands
    .command("alerts")
    .description("Gets alerts for given device and user")
    .requiredOption("-d, --device <deviceId>", "device ID")
    .requiredOption("-u, --user <userId>", "user ID")
    .action(async (options) => {
        try {
            const userId = parseRequiredNumber(options.user, "user ID");
            const deviceId = parseRequiredNumber(options.device, "device ID");

            if (userId === null || deviceId === null) return;

            const response = await axios.get(
                `${API_URL}/api/device/alert/get/${deviceId}?status_type=geofence&user_ID=${userId}`,
            );

            const data = response.data;

            if (!isSuccessResponse(data)) {
                console.log(getMessage(data, "No device alerts found."));
                return;
            }

            const rows = getRows<DeviceAlertRow>(data);

            if (rows.length === 0) {
                console.log(`No alerts found for device ${deviceId}.`);
                return;
            }

            printTable<DeviceAlertRow>(
                [
                    {
                        label: "ID",
                        width: 8,
                        value: (row) => row.id,
                    },
                    {
                        label: "Device",
                        width: 10,
                        value: (row) => row.device_ID,
                    },
                    {
                        label: "Name",
                        width: 16,
                        value: (row) => row.device_name,
                    },
                    {
                        label: "Transport",
                        width: 12,
                        value: (row) => row.data_transport,
                    },
                    {
                        label: "Type",
                        width: 18,
                        value: (row) => row.status_type,
                    },
                    {
                        label: "From",
                        width: 10,
                        value: (row) => row.from_status,
                    },
                    {
                        label: "To",
                        width: 10,
                        value: (row) => row.to_status,
                    },
                    {
                        label: "Value",
                        width: 10,
                        value: (row) => row.status_value,
                    },
                    {
                        label: "Reason",
                        width: 28,
                        value: (row) => row.reason,
                    },
                    {
                        label: "Created",
                        width: 18,
                        value: (row) => formatDate(row.created_at),
                    },
                ],
                rows,
            );
        } catch (error) {
            handleAxiosError(error);
        }
    });

// -----------------------------------------------------------------------------
// send status
// -----------------------------------------------------------------------------

sendCommands
    .command("status")
    .description("Sends test status data to a device")
    .requiredOption("-d, --device <deviceId>", "device ID")
    .requiredOption("-b, --battery <batteryPercent>", "battery percent")
    .requiredOption("-f, --firmware <firmwareVersion>", "firmware version")
    .action(async (options) => {
        try {
            const deviceId = parseRequiredNumber(options.device, "device ID");
            const battery = parseRequiredNumber(
                options.battery,
                "battery percent",
            );

            if (deviceId === null || battery === null) return;

            const body = {
                device_ID: deviceId,
                battery_percent: battery,
                firmware_version: options.firmware,
            };

            const response = await axios.post(
                `${API_URL}/api/device/status/add`,
                body,
            );

            const data = response.data;

            if (!isSuccessResponse(data)) {
                console.log(
                    getMessage(data, "Failed to update device status."),
                );
                return;
            }

            console.log(`Status updated for device ${body.device_ID}.`);
        } catch (error) {
            handleAxiosError(error);
        }
    });

// -----------------------------------------------------------------------------
// send gnss
// -----------------------------------------------------------------------------

sendCommands
    .command("gnss")
    .description("Sends test GNSS data to a device")
    .requiredOption("-d, --device <deviceId>", "device ID")
    .requiredOption("--lat <lat>", "GNSS latitude value")
    .requiredOption("--lon <lon>", "GNSS longitude value")
    .requiredOption("--acc <acc>", "GNSS accuracy value")
    .action(async (options) => {
        try {
            const deviceId = parseRequiredNumber(options.device, "device ID");
            const lat = parseRequiredNumber(options.lat, "latitude");
            const lon = parseRequiredNumber(options.lon, "longitude");
            const acc = parseRequiredNumber(options.acc, "accuracy");

            if (
                deviceId === null ||
                lat === null ||
                lon === null ||
                acc === null
            ) {
                return;
            }

            const body = {
                device_ID: deviceId,
                lat,
                lon,
                acc,
            };

            const response = await axios.post(
                `${API_URL}/api/device/gnss/add`,
                body,
            );

            const data = response.data;

            if (!isSuccessResponse(data)) {
                console.log(getMessage(data, "Failed to add GNSS data."));
                return;
            }

            console.log(`GNSS data added for device ${body.device_ID}.`);
        } catch (error) {
            handleAxiosError(error);
        }
    });

program.parse();
