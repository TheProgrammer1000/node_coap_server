import { request } from "coap";
import type { IncomingMessage } from "coap";

import dotenv from "dotenv";
dotenv.config();

const gnssPayload = JSON.stringify({
    device_ID: 123456,
    lat: 59.334591,
    lon: 18.06324,
    acc: 3.2,
    data_timestamp: "2026-04-23: 11:26",
});

const req = request({
    host: process.env.HOST_NAME,
    port: 5683,
    pathname: "/sensor_data/gps",
    method: "POST",
    options: {
        "Content-Format": "text/plain",
    },
});

// Sätter upp en händelselyssnare som väntar på svar från servern
req.on("response", (res: IncomingMessage) => {
    console.log("Response code: ", res.code);
    res.pipe(process.stdout); // Skriver ut svaret i terminalen
});

req.on("error", (err) => {
    console.error("Request error:", err);
});



req.write(gnssPayload); // Lägg GPS-datan i förfrågan
req.end(); // Skicka iväg alltihop
