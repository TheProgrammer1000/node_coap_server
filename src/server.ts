import { createServer, request, registerFormat, registerOption } from "coap";
import pool from "./db_connection.js";

import dotenv from "dotenv";
dotenv.config();

const server = createServer((req, res) => {
    if (req.method == "GET") {
        res.code = "2.01";
        return res.end("Hello world!");
    } else if (req.url == "/sensor_data/gps" && req.method == "POST") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString(); // Keep collecting...
        });
        try {
            req.on("end", async () => {
                // NOW body is 100% complete and safe to use
                // ✅ This is the correct way to set content type per route
                res.setOption("Content-Format", "text/plain");

                let sensor_data_json = JSON.parse(body);
                // UTC från nRF9151 → Svensk tid
                const utcTime = new Date(sensor_data_json.data_timestamp);

                console.log("UTC:        ", utcTime); // 2026-04-23T09:42:00Z
                console.log("Keys mottagna:", Object.keys(sensor_data_json));

                // console.log("Recieved body:", body);
                console.log("Recieved JSON body:", sensor_data_json);

                await pool.query(
                    `INSERT INTO gps_sensor_data (device_ID, lat, lon, acc, data_timestamp)
                VALUES (?, ?, ?, ?, ?)`,
                    [
                        sensor_data_json.device_ID,
                        sensor_data_json.lat,
                        sensor_data_json.lon,
                        sensor_data_json.acc,
                        utcTime,
                    ],
                );

                res.code = "2.01";
                res.end(JSON.stringify({ received: body }));
            });
        } catch (err) {
            console.error("POST failed:", err);
            res.code = "4.00";
            res.end("Bad JSON");
        }
    }
});

server.listen(5683, process.env.HOST_NAME, () => {
    console.log("CoAP server running on port 5683");
});
