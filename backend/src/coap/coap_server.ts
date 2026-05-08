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

                    const sensorData = JSON.parse(body);

                    const utcTime = sensorData.data_timestamp
                        ? new Date(sensorData.data_timestamp)
                        : new Date();

                    console.log("UTC:", utcTime);
                    console.log("Keys mottagna:", Object.keys(sensorData));
                    console.log("Received JSON body:", sensorData);

                    const [response] = await pool.query(
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

                    if (userId) {
                        await sendLiveGnssPosition(userId, livePosition);

                        console.log(
                            `Live GNSS position sent to user:${userId}`,
                            livePosition,
                        );

                        const data = await get_device_arealocation(
                            sensorData.device_ID,
                        );

                        if (data[0]?.is_available == 1) {
                            const areaLocation = data[0];

                            const deviceLat = Number(sensorData.lat);
                            const deviceLon = Number(sensorData.lon);

                            const areaLat = Number(
                                areaLocation.arealocation_lat,
                            );
                            const areaLon = Number(
                                areaLocation.arealocation_lon,
                            );

                            const radiusMeters = Number(
                                areaLocation.area_location_radius_m ??
                                    areaLocation.circle_radius_m,
                            );

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

                            if (device_area_distance_m !== null) {
                                const [device_data]: any =
                                    await get_last_device_zone_state(
                                        sensorData.device_ID,
                                    );

                                console.log("device_data", device_data);

                                if (device_data.status != geofence.status) {
                                    // insert into alert!
                                    console.log("Diffrent!!!!");

                                    try {
                                        await add_device_zone_alert(
                                            sensorData.device_ID,
                                            device_data.status,
                                            geofence.status,
                                            device_area_distance_m,
                                        );

                                        const alertPayload = {
                                            device_ID: Number(
                                                sensorData.device_ID,
                                            ),
                                            from_status: device_data.status,
                                            to_status: geofence.status,
                                            device_area_distance_m,
                                            distance_m: geofence.distance_m,
                                            outside_by_m: geofence.outside_by_m,
                                            data_timestamp:
                                                utcTime.toISOString(),
                                            matchedAddress:
                                                areaLocation.matchedAddress ??
                                                null,
                                        };

                                        await sendLiveGeofenceAlert(
                                            userId,
                                            alertPayload,
                                        );
                                    } catch (err) {
                                        console.error(err);
                                    }
                                }

                                // inserta nya state
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

                                    matchedAddress:
                                        areaLocation.matchedAddress ?? null,
                                };

                                await sendLiveGeofencePosition(
                                    userId,
                                    geofenceLivePosition,
                                );

                                console.log("Device zone state calculated:", {
                                    device_ID: sensorData.device_ID,
                                    status: geofence.status,
                                    device_area_distance_m,
                                    distance_m: geofence.distance_m,
                                    outside_by_m: geofence.outside_by_m,
                                    radiusMeters,
                                    matchedAddress: areaLocation.matchedAddress,
                                });
                            } else {
                                console.warn(
                                    "Could not calculate device zone state:",
                                    {
                                        device_ID: sensorData.device_ID,
                                        geofence,
                                        areaLocation,
                                    },
                                );
                            }
                        }
                    } else {
                        console.warn(
                            `No user found for device_ID ${sensorData.device_ID}. Position saved but not sent live.`,
                        );
                    }

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
