import { request } from "coap";
import type { IncomingMessage } from "coap";
import dotenv from "dotenv";

dotenv.config();

const host = process.env.COAP_HOST_NAME;
const deviceId = Number(process.env.DEVICE_ID ?? 456789);

if (!host) {
    throw new Error("COAP_HOST_NAME saknas");
}

const route = [
    { lat: 59.309591, lon: 18.01624 },
    { lat: 59.3099, lon: 18.0167 },
    { lat: 59.3103, lon: 18.0172 },
    { lat: 59.311, lon: 18.019 },
    { lat: 59.313, lon: 18.023 },
];

let index = 0;

function sendPoint() {
    const point = route[index];

    const payload = JSON.stringify({
        device_ID: deviceId,
        lat: point.lat,
        lon: point.lon,
        acc: 6.5,
        data_timestamp: new Date().toISOString(),
    });

    const req = request({
        host,
        port: 5683,
        pathname: "/sensor_data/gps",
        method: "POST",
        options: {
            "Content-Format": "application/json",
        },
    });

    req.on("response", (res: IncomingMessage) => {
        console.log(`Point ${index + 1}/${route.length} response: ${res.code}`);
        res.pipe(process.stdout);
    });

    req.on("error", (err) => {
        console.error("Client error:", err.message);
    });

    console.log("Sending payload:", payload);

    req.write(payload);
    req.end();

    index = (index + 1) % route.length;
}

sendPoint();
setInterval(sendPoint, 5000);
