import { createServer } from "coap";
import pool from "../db/db_connection.js";

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
                        : null;

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
                            utcTime,
                        ],
                    );

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
