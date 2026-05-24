import { response, Router } from "express";

import { sendMockPositions } from "../../../coap/demo_routes.js";
import { add_device_status, add_device_state } from "../../../db/db.js";

const router = Router();

router.post("/cellular", async (req, res) => {
    const device_ID = Number(req.body?.device_ID);
    const route = req.body?.route;
    const interval_ms = Number(req.body?.interval_ms ?? 2000);

    if (!Number.isFinite(device_ID) || device_ID <= 0) {
        return res.status(400).json({
            success: false,
            error: "device_ID is required",
        });
    }

    if (!Array.isArray(route) || route.length === 0) {
        return res.status(400).json({
            success: false,
            error: "route is required and must be an array",
        });
    }

    try {
        const result = await sendMockPositions({
            device_ID,
            route,
            interval_ms,
        });

        return res.status(200).json({
            success: true,
            message: "Mock cellular GNSS route sent",
            data: result,
        });
    } catch (error) {
        console.error("Failed to send mock cellular route:", error);

        return res.status(500).json({
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to send mock cellular route",
        });
    }
});

router.post("/cellular/add/status", async (req, res) => {
    const device_ID = Number(req.body?.device_ID);
    const battery_percent = Math.floor(Math.random() * 100) + +1;
    const firmware_version = "1.0.1";

    const response = await add_device_status(
        device_ID,
        battery_percent,
        firmware_version,
    );

    if (!device_ID) {
        res.status(400).json({ success: false, msg: "device_ID is required" });
    }
    try {
        res.status(200).json({ success: true, msg: response });
    } catch (error) {
        res.status(500).json({ success: false, msg: error });
    }

    console.log("response: ", response);
});

router.post("/cellular/add/state", async (req, res) => {
    const device_ID = Number(req.body?.device_ID);
    const status_type = req.body?.status_type;
    const status_now = req.body?.status_now;
    const status_value = req.body?.status_value;

    if (!device_ID || !status_type || !status_now) {
        res.status(400).json({
            success: false,
            msg: "Body parameters is requirered",
        });
    }

    try {
        const response = await add_device_state(
            device_ID,
            status_type,
            status_now,
            -1,
        );

        console.log(response);

        res.status(200).json({ success: true, msg: response });
    } catch (error) {
        res.status(500).json({ success: false, msg: error });
    }

    console.log("response: ", response);
});

export default router;
