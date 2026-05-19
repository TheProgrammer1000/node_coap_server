import { request } from "coap";
import type { IncomingMessage } from "coap";
import dotenv from "dotenv";

dotenv.config();

const host = process.env.COAP_HOST_NAME;

if (!host) {
    throw new Error("COAP_HOST_NAME saknas");
}

type RoutePoint = {
    lat: number;
    lon: number;
    acc?: number;
};

type SendMockPositionsInput = {
    device_ID: number;
    route: RoutePoint[];
    interval_ms?: number;
};

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function isValidRoutePoint(point: RoutePoint) {
    const lat = Number(point?.lat);
    const lon = Number(point?.lon);

    return Number.isFinite(lat) && Number.isFinite(lon);
}

function normalizeRoute(route: RoutePoint[]) {
    return route.filter(isValidRoutePoint).map((point) => ({
        lat: Number(point.lat),
        lon: Number(point.lon),
        acc:
            point.acc !== undefined && Number.isFinite(Number(point.acc))
                ? Number(point.acc)
                : 7.5,
    }));
}

export function sendPoint(
    device_ID: number,
    point: RoutePoint,
    pointIndex: number,
    totalPoints: number,
) {
    return new Promise<void>((resolve, reject) => {
        const payload = JSON.stringify({
            device_ID,
            lat: point.lat,
            lon: point.lon,
            acc: point.acc ?? 7.5,
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
            console.log(
                `Mock GNSS point ${pointIndex + 1}/${totalPoints} response: ${res.code}`,
            );

            res.pipe(process.stdout);

            res.on("end", () => {
                resolve();
            });
        });

        req.on("error", (err) => {
            console.error("CoAP client error:", err.message);
            reject(err);
        });

        console.log("Sending mock GNSS payload:", payload);

        req.write(payload);
        req.end();
    });
}

export async function sendMockPositions(input: SendMockPositionsInput) {
    const device_ID = Number(input.device_ID);

    if (!Number.isFinite(device_ID) || device_ID <= 0) {
        throw new Error("device_ID är ogiltigt");
    }

    const route = normalizeRoute(input.route);

    if (route.length === 0) {
        throw new Error("Route saknar giltiga positioner");
    }

    const intervalMs = clamp(Number(input.interval_ms) || 2000, 500, 10000);

    for (let i = 0; i < route.length; i += 1) {
        await sendPoint(device_ID, route[i], i, route.length);

        if (i < route.length - 1) {
            await sleep(intervalMs);
        }
    }

    console.log(`Done sending ${route.length} mock GNSS positions`);

    return {
        device_ID,
        point_count: route.length,
        interval_ms: intervalMs,
        route,
    };
}
