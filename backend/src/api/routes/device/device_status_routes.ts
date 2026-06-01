import { Router } from "express";
import {
    get_user_devices_with_status,
    get_user_devices_lastseen_status,
    get_user_device_with_status,
    add_device_health,
} from "../../../db/db.js";

import { device_param, work_area_payload } from "../../../types.js";

const router = Router();

router.get("/get/all/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);

        const data = await get_user_devices_with_status(user_ID);

        if (data.length > 0) {
            console.log(data);
            res.json({ success: true, data });
        } else {
            res.json({
                success: false,
                msg: "no devices register to user and cannot get device status",
            });
        }
    } catch (error) {
        console.error("Failed to get device status:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get device status",
        });
    }
});

router.get("/get/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);
        const device_ID = Number(req.query.device_ID);

        const data = await get_user_device_with_status(user_ID, device_ID);

        if (data.length > 0) {
            console.log(data);
            res.json({ success: true, data });
        } else {
            res.json({
                success: false,
                msg: "no devices register to user and cannot get device status",
            });
        }
    } catch (error) {
        console.error("Failed to get device status:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get device status",
        });
    }
});

router.post("/add", async (req, res) => {
    try {
        const { device_ID, battery_percent, firmware_version } = req.body;

        const status_response = await add_device_health(
            device_ID,
            battery_percent,
            firmware_version,
        );

        console.log(status_response);

        res.status(201).json({ success: true, status_response });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            error,
        });
    }
});

export default router;
