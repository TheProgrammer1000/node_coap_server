import { request } from "coap";
import type { IncomingMessage } from "coap";
import dotenv from "dotenv";

dotenv.config();

const stockholmLat = 59.309591;
const stockholmLon = 18.01624;

const randomOffset = () => (Math.random() - 0.5) * 0.02;

const gnssPayload = JSON.stringify({
    device_ID: 456789,
    lat: stockholmLat + randomOffset(),
    lon: stockholmLon + randomOffset(),
    acc: Number((Math.random() * 8 + 2).toFixed(2)),
    data_timestamp: new Date().toISOString(),
});

const req = request({
    host: process.env.HOST_NAME,
    port: 5683,
    pathname: "/sensor_data/gps",
    method: "POST",
    options: {
        "Content-Format": "application/json",
    },
});

req.on("response", (res: IncomingMessage) => {
    console.log("Response code: ", res.code);
    res.pipe(process.stdout);
});

req.on("error", (err) => {
    console.error("Client error:", err);
});

console.log("Sending payload:", gnssPayload);

req.write(gnssPayload);
req.end();
