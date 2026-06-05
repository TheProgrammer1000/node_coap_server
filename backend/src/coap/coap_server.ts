import { createServer } from "coap";
import pool from "../db/db_connection.js";
import {
    sendLiveGnssPosition,
    sendLiveGeofencePosition,
    sendLiveGeofenceAlert,
    sendLiveDeviceStatus,
    sendLiveDeviceFirmwareQue,
    sendLiveDeviceLifeCycle,
} from "../api/api_server.js";
import {
    get_device_arealocation,
    get_last_device_state,
    add_device_health,
    get_userID_by_deviceID,
    add_device_state,
    add_device_alert,
    add_device_event,
    add_device_lifecycle,
    get_device_firmware_command,
    update_device_firmware_que,
} from "../db/db.js";
import { checkGeofenceStatus } from "../utils/geofence.js";
import { device_event_type, device_lifecycle_type } from "../types.js";

function getCoapQuery(req: any) {
    const url = new URL(req.url, `coap://${process.env.COAP_HOST_NAME}`);

    return {
        pathname: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
    };
}

export function startCoapServer() {
    const server = createServer(async (req, res) => {
        console.log("CoAP request:", req.method, req.url);
        const { pathname, query } = getCoapQuery(req);

        // --- LÄGG TILL DETTA HÄR FÖR ATT STOPPA KRASCHEN ---
        res.on("error", (err) => {
            console.log(
                `[CoAP Warning] Det gick inte att skicka svar till en enhet: ${err.message}`,
            );
        });

        if (req.url === "/sensor_data/gps" && req.method === "POST") {
            let body = "";

            req.on("data", (chunk) => {
                body += chunk.toString();
            });

            req.on("end", async () => {
                try {
                    res.setOption("Content-Format", "text/plain");

                    if (!body) {
                        res.code = "4.00";
                        return res.end("Missing request body");
                    }

                    const sensorData = JSON.parse(body);

                    if (
                        sensorData.device_ID === undefined ||
                        sensorData.lat === undefined ||
                        sensorData.lon === undefined ||
                        sensorData.acc === undefined
                    ) {
                        console.warn("Invalid sensor payload:", sensorData);

                        res.code = "4.00";
                        return res.end("Invalid sensor payload");
                    }

                    const parsedTime = sensorData.data_timestamp
                        ? new Date(sensorData.data_timestamp)
                        : new Date();

                    const utcTime = Number.isNaN(parsedTime.getTime())
                        ? new Date()
                        : parsedTime;

                    console.log("UTC:", utcTime);
                    console.log("Keys mottagna:", Object.keys(sensorData));
                    console.log("Received JSON body:", sensorData);

                    await pool.query(
                        `
                        INSERT INTO device_gnss_data (
                            device_ID,
                            lat,
                            lon,
                            acc,
                            data_timestamp
                        )
                        VALUES (?, ?, ?, ?, ?)
                        `,
                        [
                            sensorData.device_ID,
                            sensorData.lat,
                            sensorData.lon,
                            sensorData.acc,
                            utcTime.toISOString(),
                        ],
                    );

                    const [deviceRows]: any = await pool.query(
                        `
                        SELECT user_ID
                        FROM device_user
                        WHERE device_ID = ?
                        LIMIT 1
                        `,
                        [sensorData.device_ID],
                    );

                    const userId = deviceRows?.[0]?.user_ID;

                    const livePosition = {
                        device_ID: sensorData.device_ID,
                        lat: sensorData.lat,
                        lon: sensorData.lon,
                        acc: sensorData.acc,
                        data_timestamp: utcTime.toISOString(),
                    };

                    if (!userId) {
                        console.warn(
                            `No user found for device_ID ${sensorData.device_ID}. Position saved but not sent live.`,
                        );

                        res.code = "2.04";
                        return res.end("GNSS data saved");
                    }

                    await sendLiveGnssPosition(userId, livePosition);

                    console.log(
                        `Live GNSS position sent to user:${userId}`,
                        livePosition,
                    );

                    const areaRows: any = await get_device_arealocation(
                        sensorData.device_ID,
                    );

                    const areaLocation = Array.isArray(areaRows)
                        ? areaRows[0]
                        : null;

                    if (
                        !areaLocation ||
                        Number(areaLocation.is_available) !== 1
                    ) {
                        console.log(
                            `No active geofence area found for device_ID ${sensorData.device_ID}.`,
                        );

                        res.code = "2.04";
                        return res.end("GNSS data saved");
                    }

                    const deviceLat = Number(sensorData.lat);
                    const deviceLon = Number(sensorData.lon);

                    const areaLat = Number(areaLocation.arealocation_lat);
                    const areaLon = Number(areaLocation.arealocation_lon);

                    const radiusMeters = Number(
                        areaLocation.area_location_radius_m ??
                            areaLocation.circle_radius_m,
                    );

                    if (
                        !Number.isFinite(deviceLat) ||
                        !Number.isFinite(deviceLon) ||
                        !Number.isFinite(areaLat) ||
                        !Number.isFinite(areaLon) ||
                        !Number.isFinite(radiusMeters) ||
                        radiusMeters <= 0
                    ) {
                        console.warn("Invalid geofence values:", {
                            device_ID: sensorData.device_ID,
                            deviceLat,
                            deviceLon,
                            areaLat,
                            areaLon,
                            radiusMeters,
                            areaLocation,
                        });

                        res.code = "2.04";
                        return res.end("GNSS data saved");
                    }

                    const geofence = checkGeofenceStatus({
                        areaLat,
                        areaLon,
                        deviceLat,
                        deviceLon,
                        radiusMeters,
                    });

                    let device_area_distance_m: number | null = null;

                    if (geofence.status === "outside") {
                        device_area_distance_m = geofence.outside_by_m;
                    }

                    if (
                        geofence.status === "inside" &&
                        geofence.distance_m !== null
                    ) {
                        device_area_distance_m = Math.max(
                            0,
                            radiusMeters - geofence.distance_m,
                        );
                    }

                    if (device_area_distance_m === null) {
                        console.warn("Could not calculate device zone state:", {
                            device_ID: sensorData.device_ID,
                            geofence,
                            areaLocation,
                        });

                        res.code = "2.04";
                        return res.end("GNSS data saved");
                    }

                    const [device_data]: any = await get_last_device_state(
                        sensorData.device_ID,
                        "geofence",
                    );

                    console.log("device_data", device_data);

                    const previousStatus = device_data?.status_now ?? null;

                    if (previousStatus && previousStatus !== geofence.status) {
                        console.log("Geofence status changed:", {
                            device_ID: sensorData.device_ID,
                            from_status: previousStatus,
                            to_status: geofence.status,
                        });

                        try {
                            if (previousStatus == "outside") {
                                await add_device_alert(
                                    sensorData.device_ID,
                                    "geofence",
                                    previousStatus,
                                    geofence.status,
                                    device_area_distance_m,
                                    "Coming from outside to inside",
                                );
                            } else {
                                await add_device_alert(
                                    sensorData.device_ID,
                                    "geofence",
                                    previousStatus,
                                    geofence.status,
                                    device_area_distance_m,
                                    "Coming from inside to outside",
                                );
                            }

                            const alertPayload = {
                                device_ID: Number(sensorData.device_ID),
                                from_status: previousStatus,
                                to_status: geofence.status,
                                device_area_distance_m,
                                distance_m: geofence.distance_m,
                                outside_by_m: geofence.outside_by_m,
                                data_timestamp: utcTime.toISOString(),
                                matchedAddress:
                                    areaLocation.matchedAddress ?? null,
                            };

                            console.log("TRYING TO SEND LIVE GEOFENCE ALERT:", {
                                userId,
                                previousStatus,
                                currentStatus: geofence.status,
                            });

                            await sendLiveGeofenceAlert(userId, alertPayload);

                            console.log("LIVE GEOFENCE ALERT SENT:", {
                                userId,
                                room: `user:${userId}`,
                                alertPayload,
                            });
                        } catch (err) {
                            console.error(
                                "Failed to create/send geofence alert:",
                                err,
                            );
                        }
                    } else if (!previousStatus) {
                        console.log(
                            "No previous geofence state found. Saving initial state only.",
                            {
                                device_ID: sensorData.device_ID,
                                status: geofence.status,
                            },
                        );
                    }

                    await add_device_state(
                        Number(sensorData.device_ID),
                        "geofence",
                        geofence.status,
                        device_area_distance_m,
                    );

                    const geofenceLivePosition = {
                        device_ID: Number(sensorData.device_ID),

                        device_now_lat: deviceLat,
                        device_now_lon: deviceLon,

                        acc: sensorData.acc,
                        data_timestamp: utcTime.toISOString(),

                        area_location_lat: areaLat,
                        area_location_lon: areaLon,
                        area_location_radius_m: radiusMeters,

                        geofence_status: geofence.status,
                        distance_m: geofence.distance_m,
                        outside_by_m: geofence.outside_by_m,
                        device_area_distance_m,

                        matchedAddress: areaLocation.matchedAddress ?? null,
                    };

                    await sendLiveGeofencePosition(
                        userId,
                        geofenceLivePosition,
                    );

                    console.log("Device zone state calculated:", {
                        device_ID: sensorData.device_ID,
                        previousStatus,
                        status: geofence.status,
                        device_area_distance_m,
                        distance_m: geofence.distance_m,
                        outside_by_m: geofence.outside_by_m,
                        radiusMeters,
                        matchedAddress: areaLocation.matchedAddress,
                    });

                    res.code = "2.04";
                    return res.end("GNSS data saved");
                } catch (err) {
                    console.error("POST failed:", err);

                    res.code = "5.00";
                    return res.end("Server error");
                }
            });

            return;
        } else if (req.url === "/device/health" && req.method === "POST") {
            let body = "";

            req.on("data", (chunk) => {
                body += chunk.toString();
            });

            req.on("end", async () => {
                try {
                    res.setOption("Content-Format", "text/plain");

                    if (!body) {
                        res.code = "4.00";
                        return res.end("Missing request body");
                    }

                    const sensorData = JSON.parse(body);
                    console.log("sensorData: ", sensorData);

                    if (!sensorData?.device_ID) {
                        console.error("");
                        res.code = "4.01";
                        return res.end("Error with status property");
                    }

                    try {
                        const status_response = await add_device_health(
                            sensorData.device_ID,
                            sensorData.battery_percent,
                            sensorData.firmware_version,
                        );

                        console.log("status_response: ", status_response);

                        const [data] = await get_userID_by_deviceID(
                            sensorData.device_ID,
                        );
                        const user_ID = data[0].user_ID;

                        const lastSeen = new Date().toISOString();

                        const deviceStatusPayload = {
                            device_ID: Number(sensorData.device_ID),
                            status: "online",
                            last_seen: lastSeen,
                        };

                        if (!user_ID) {
                            console.warn(
                                `No user found for device_ID ${sensorData.device_ID}. Status saved but not sent live.`,
                            );

                            res.code = "2.04";
                            return res.end("Device status saved");
                        }

                        await sendLiveDeviceStatus(
                            user_ID,
                            deviceStatusPayload,
                        );

                        console.log(
                            "Live device status sent:",
                            deviceStatusPayload,
                        );

                        res.code = "2.00";
                        return res.end(`Successfully got device status!`);
                    } catch (error) {
                        console.error("Failed to call db procedur");
                    }
                } catch (err) {
                    res.code = "5.00";
                    return res.end(`Server error ${err}`);
                }
            });

            return;
        } else if (req.url === "/device/event" && req.method === "POST") {
            let body = "";

            req.on("data", (chunk) => {
                body += chunk.toString();
            });

            req.on("end", async () => {
                try {
                    res.setOption("Content-Format", "text/plain");

                    if (!body) {
                        res.code = "4.00";
                        return res.end("Missing request body");
                    }

                    const sensorData: device_event_type = JSON.parse(body);
                    console.log("sensorData: ", sensorData);

                    const db_response = await add_device_event(
                        sensorData.device_ID,
                        sensorData.event_type,
                        sensorData.severity,
                        sensorData.message,
                        sensorData.data_transport,
                        sensorData.firmware_version,
                    );

                    console.log(db_response);

                    res.code = "2.01";
                    return res.end(`Successfully added device event!`);
                } catch (err) {
                    res.code = "5.00";
                    return res.end(`Server error ${err}`);
                }
            });
        } else if (
            pathname.startsWith("/device/firmware_command/") &&
            req.method === "GET"
        ) {
            const device_ID = Number(pathname.split("/").pop());

            res.setOption("Content-Format", "application/json");

            if (!device_ID) {
                res.code = "4.00";
                return res.end(
                    JSON.stringify({
                        success: false,
                        message: "Missing device_ID",
                    }),
                );
            }

            try {
                const db_response =
                    await get_device_firmware_command(device_ID);
                console.log("Firmware command DB response:", db_response);

                res.code = "2.05"; // Content (Standard framgångsrik GET i CoAP)
                return res.end(
                    JSON.stringify({
                        success: true,
                        message: "Successfully fetched firmware command!",
                        device_ID,
                        data: db_response,
                    }),
                );
            } catch (err) {
                console.error("Failed to fetch firmware command:", err);
                res.code = "5.00";
                return res.end(
                    JSON.stringify({
                        success: false,
                        message: "Server error",
                        error: String(err),
                    }),
                );
            }
        } else if (
            req.url === "/device/firmware_command" &&
            req.method === "POST"
        ) {
            console.log("Hereeeee weee come");

            let body = "";

            req.on("data", (chunk) => {
                body += chunk.toString();
            });

            req.on("end", async () => {
                try {
                    res.setOption("Content-Format", "text/plain");

                    if (!body) {
                        res.code = "4.00";
                        return res.end("Missing request body");
                    }

                    const sensorData = JSON.parse(body);
                    console.log("sensorData: ", sensorData);

                    // ÄNDRING HÄR: Gör om payload-objektet till en JSON-sträng för MySQL
                    // Om payload är null/undefined skickar vi null, annars stringifierar vi det
                    const dbPayload: any = sensorData.payload
                        ? JSON.stringify(sensorData.payload)
                        : null;

                    const db_response = await update_device_firmware_que(
                        sensorData.device_ID,
                        sensorData.command_status,
                        sensorData.msg,
                        dbPayload,
                    );

                    const [data] = await get_userID_by_deviceID(
                        sensorData.device_ID,
                    );
                    const user_ID = data[0].user_ID;

                    await sendLiveDeviceFirmwareQue(user_ID, sensorData);

                    console.log(db_response);
                    console.log(
                        "Live device firmware que data sent:",
                        sensorData,
                    );

                    res.code = "2.01";
                    return res.end(`Successfully added device event!`);
                } catch (err) {
                    console.error("Det uppstod ett fel i backend:", err); // Bra att logga hela felet i din terminal också!
                    res.code = "5.00";
                    return res.end(`Server error ${err}`);
                }
            });
        } else if (req.url === "/device/lifecycle" && req.method === "POST") {
            let body = "";

            req.on("data", (chunk) => {
                body += chunk.toString();
            });

            req.on("end", async () => {
                try {
                    res.setOption("Content-Format", "text/plain");

                    if (!body) {
                        res.code = "4.00";
                        return res.end("Missing request body");
                    }

                    const sensorData: device_lifecycle_type = JSON.parse(body);
                    console.log("sensorData: ", sensorData);

                    if (!sensorData?.device_ID) {
                        console.error("");
                        res.code = "4.01";
                        return res.end("Error with device_ID property");
                    }

                    try {
                        const db_response = await add_device_lifecycle(
                            sensorData.device_ID,
                            sensorData.battery_percent,
                            sensorData.gnss_periodic_timeout,
                            sensorData.gnss_periodic_interval,
                            sensorData.firmware_version,
                        );

                        console.log("db_response: ", db_response);

                        const [data] = await get_userID_by_deviceID(
                            sensorData.device_ID,
                        );
                        const user_ID = data[0].user_ID;

                        if (!user_ID) {
                            console.warn(
                                `No user found for device_ID ${sensorData.device_ID}. Status saved but not sent live.`,
                            );

                            res.code = "2.04";
                            return res.end("Device status saved");
                        }

                        await sendLiveDeviceLifeCycle(user_ID, sensorData);

                        console.log("Live device lifecycle sent:", sensorData);

                        res.code = "2.00";
                        return res.end(`Successfully got device lifecycle!`);
                    } catch (error) {
                        console.error("Failed to call db procedur");
                    }
                } catch (err) {
                    res.code = "5.00";
                    return res.end(`Server error ${err}`);
                }
            });
        }
    });

    const host = process.env.COAP_HOST_NAME ?? "127.0.0.1";
    const port = Number(process.env.COAP_PORT ?? 5683);

    server.listen(port, host, () => {
        console.log(
            `CoAP server running on coap://${host}:${port}/sensor_data/gps`,
        );
    });
}
