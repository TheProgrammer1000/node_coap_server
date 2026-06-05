import express from "express";
import cors from "cors";

/* WebSocket / Socket.IO */
import { Server } from "socket.io";
import { createServer } from "node:http";

import routes from "./routes/index.js";

let io: Server | null = null;

export function getSocketServer() {
    return io;
}

/* Sending live data through WebSocket */
export async function sendLiveGnssPosition(
    userId: string | number,
    position: unknown,
) {
    if (!io) {
        console.warn("Socket.IO server is not ready");
        return;
    }

    const roomName = `user:${userId}`;
    const socketsInRoom = await io.in(roomName).fetchSockets();

    console.log("Trying to emit GNSS live position");
    console.log("Room:", roomName);
    console.log("Sockets in room:", socketsInRoom.length);
    console.log("Position:", position);

    io.to(roomName).emit("gnss:new-position", position);

    console.log(`Emitted gnss:new-position to ${roomName}`);
}

export async function sendLiveGeofencePosition(
    userId: string | number,
    position: unknown,
) {
    if (!io) {
        console.warn("Socket.IO server is not ready");
        return;
    }

    const roomName = `user:${userId}`;
    const socketsInRoom = await io.in(roomName).fetchSockets();

    console.log("Trying to emit live geofence position");
    console.log("Room:", roomName);
    console.log("Sockets in room:", socketsInRoom.length);
    console.log("Geofence position:", position);

    io.to(roomName).emit("geofence:new-position", position);

    console.log(`Emitted geofence:new-position to ${roomName}`);
}

export async function sendLiveGeofenceAlert(
    userId: string | number,
    alert: unknown,
) {
    if (!io) {
        console.warn("Socket.IO server is not ready");
        return;
    }

    const roomName = `user:${userId}`;
    const socketsInRoom = await io.in(roomName).fetchSockets();

    console.log("Trying to emit live geofence alert");
    console.log("Room:", roomName);
    console.log("Sockets in room:", socketsInRoom.length);
    console.log("alert:", alert);

    io.to(roomName).emit("geofence:alert", alert);

    console.log(`Emitted geofence:alert to ${roomName}`);
}

export async function sendLiveDeviceStatus(
    userId: string | number,
    status: unknown,
) {
    if (!io) {
        console.warn("Socket.IO server is not ready");
        return;
    }

    const roomName = `user:${userId}`;
    const socketsInRoom = await io.in(roomName).fetchSockets();

    console.log("Trying to emit live device status");
    console.log("Room:", roomName);
    console.log("Sockets in room:", socketsInRoom.length);
    console.log("device_last_seen:", status);

    io.to(roomName).emit("device:status", status);

    console.log(`Emitted device:status to ${roomName}`);
}

export async function sendLiveDeviceFirmwareQue(
    userId: string | number,
    que_data: unknown,
) {
    if (!io) {
        console.warn("Socket.IO server is not ready");
        return;
    }

    const roomName = `user:${userId}`;
    const socketsInRoom = await io.in(roomName).fetchSockets();

    console.log("Trying to emit live que_data");
    console.log("Room:", roomName);
    console.log("Sockets in room:", socketsInRoom.length);
    console.log("que_data:", que_data);

    io.to(roomName).emit("device:firmware_que", que_data);

    console.log(`Emitted device:status to ${roomName}`);
}

export async function sendLiveDeviceLifeCycle(
    userId: string | number,
    lifecycle_data: unknown,
) {
    if (!io) {
        console.warn("Socket.IO server is not ready");
        return;
    }

    const roomName = `user:${userId}`;
    const socketsInRoom = await io.in(roomName).fetchSockets();

    console.log("Trying to emit live que_data");
    console.log("Room:", roomName);
    console.log("Sockets in room:", socketsInRoom.length);
    console.log("lifecycle_data:", lifecycle_data);

    io.to(roomName).emit("device:lifecycle", lifecycle_data);

    console.log(`Emitted device:status to ${roomName}`);
}

export async function sendLiveMotionSample(
    userId: string | number,
    sample: unknown,
) {
    if (!io) {
        console.warn("Socket.IO server is not ready");
        return;
    }

    const roomName = `user:${userId}`;
    const sequence = Number((sample as any)?.sequence ?? 0);

    /*
        Viktigt för latency:
        - fetchSockets() är användbart för debug
        - men det ska inte köras varje motion-packet
    */
    if (sequence % 20 === 0) {
        const socketsInRoom = await io.in(roomName).fetchSockets();

        console.log("Motion sample live emit");
        console.log("Room:", roomName);
        console.log("Sockets in room:", socketsInRoom.length);
        console.log("Sequence:", sequence);
    }

    io.to(roomName).emit("motion:new-sample", sample);
}
export function startApiServer() {
    const app = express();

    const port = Number(process.env.API_SERVER_PORT || 3000);
    const host = process.env.API_HOST_NAME || "127.0.0.1";

    const allowedOrigins = process.env.FRONTEND_ORIGIN
        ? process.env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim())
        : ["http://localhost:5173", "http://127.0.0.1:5173"];

    app.use(
        cors({
            origin: allowedOrigins,
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
        }),
    );

    app.use(express.json());

    // REST API routes
    app.use("/api", routes);

    app.get("/health", (req, res) => {
        res.send("API server is running");
    });

    // Create HTTP server from Express app
    const httpServer = createServer(app);

    // Attach Socket.IO to same HTTP server
    io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            allowedHeaders: ["Content-Type", "Authorization"],
        },
    });

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);

        socket.on("join-user-room", (userId) => {
            if (!userId) {
                return;
            }

            const roomName = `user:${userId}`;
            socket.join(roomName);

            console.log(`Socket ${socket.id} joined ${roomName}`);

            socket.emit("socket:joined", {
                room: roomName,
            });
        });

        socket.on("motion:sample", async (payload) => {
            if (!payload) {
                console.warn("Invalid motion sample: missing payload");
                return;
            }

            if (!payload.userId) {
                console.warn("Invalid motion sample: missing userId", payload);
                return;
            }

            if (!payload.deviceId) {
                console.warn(
                    "Invalid motion sample: missing deviceId",
                    payload,
                );
                return;
            }

            if (!payload.quaternion) {
                console.warn(
                    "Invalid motion sample: missing quaternion",
                    payload,
                );
                return;
            }

            const sample = {
                deviceId: payload.deviceId,
                receivedAt: new Date().toISOString(),

                version: payload.version,
                sequence: payload.sequence,
                rawHex: payload.rawHex,

                quaternion: {
                    w: payload.quaternion.w,
                    x: payload.quaternion.x,
                    y: payload.quaternion.y,
                    z: payload.quaternion.z,
                },

                euler: {
                    rollDeg: payload.euler?.rollDeg,
                    pitchDeg: payload.euler?.pitchDeg,
                    yawDeg: payload.euler?.yawDeg,
                },

                norm: payload.norm,
            };

            const sequence = Number(payload.sequence ?? 0);

            if (sequence % 20 === 0) {
                console.log("Motion sample received from gateway");
                console.log("From socket:", socket.id);
                console.log("User:", payload.userId);
                console.log("Sequence:", sequence);
            }

            await sendLiveMotionSample(payload.userId, sample);
        });

        socket.on("leave-user-room", (userId) => {
            if (!userId) {
                return;
            }

            const roomName = `user:${userId}`;
            socket.leave(roomName);

            console.log(`Socket ${socket.id} left ${roomName}`);
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });

    httpServer.listen(port, host, () => {
        console.log(`API server listening on http://${host}:${port}`);
        console.log(`GNSS API: http://${host}:${port}/api/gnss`);
        console.log("Socket.IO server running");
        console.log(`DB running: ${process.env.DB_NAME}`);
    });
}
