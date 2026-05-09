import { createServer } from "coap";
import pool from "../db/db_connection.js";
import {
    sendLiveGnssPosition,
    sendLiveGeofencePosition,
    sendLiveGeofenceAlert,
} from "../api/api_server.js";
import {
    get_device_arealocation,
    add_device_zone_state,
    get_last_device_zone_state,
    add_device_zone_alert,
} from "../db/db.js";
import { checkGeofenceStatus } from "../utils/geofence.js";

export function startCoapServer() {
    const server = createServer((req, res) => {
        console.log("CoAP request:", req.method, req.url);

        if (req.method === "GET") {
            res.code = "2.05";
            return res.end("Hello world!");
        }

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

                    const [device_data]: any = await get_last_device_zone_state(
                        sensorData.device_ID,
                    );

                    console.log("device_data", device_data);

                    const previousStatus = device_data?.status ?? null;

                    if (previousStatus && previousStatus !== geofence.status) {
                        console.log("Geofence status changed:", {
                            device_ID: sensorData.device_ID,
                            from_status: previousStatus,
                            to_status: geofence.status,
                        });

                        try {
                            await add_device_zone_alert(
                                sensorData.device_ID,
                                previousStatus,
                                geofence.status,
                                device_area_distance_m,
                            );

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

                            await sendLiveGeofenceAlert(userId, alertPayload);
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

                    await add_device_zone_state(
                        Number(sensorData.device_ID),
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
        }

        res.code = "4.04";
        return res.end("Not found");
    });

    const host = process.env.COAP_HOST_NAME ?? "127.0.0.1";
    const port = Number(process.env.COAP_PORT ?? 5683);

    server.listen(port, host, () => {
        console.log(
            `CoAP server running on coap://${host}:${port}/sensor_data/gps`,
        );
    });
}
