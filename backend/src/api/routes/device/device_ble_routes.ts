import { Router } from "express";
import {
    add_device_ble_motion_data,
    login_user,
    register_user,
    add_device_ble_data_session,
    update_device_ble_data_session,
    get_device_ble_motion_session_data_by_user,
    get_all_device_ble,
} from "../../../db/db.js";

import { ble_motion_packet_type } from "../../../types.js";

const router = Router();

router.get("/", async (req, res) => {
    try {
        return res.json({
            success: true,
        });
    } catch (error) {
        console.error("Failed to go to root user:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to user request",
        });
    }
});

router.post("/motion/data/add", async (req, res) => {
    const motion_data: ble_motion_packet_type = req.body;

    try {
        const data = await add_device_ble_motion_data(
            motion_data.device_ID,
            motion_data.quat_x,
            motion_data.quat_y,
            motion_data.quat_z,
            motion_data.quat_w,
            motion_data.data_packet,
            motion_data.firmware_version,
        );

        console.log(data);
        res.json({ success: true, data: motion_data });
    } catch (error) {
        console.error("Failed add ble packet data:", error);

        return res.status(500).json({
            success: false,
            error: "Failed add ble packet data",
        });
    }
});

router.post("/motion/session/add", async (req, res) => {
    const { device_ID } = req.body;

    if (!device_ID) {
        return res.status(400).json({
            success: false,
            error: "device_ID is required",
        });
    }

    try {
        const data = await add_device_ble_data_session(device_ID);

        console.log(data);

        res.json({ success: true, data: device_ID });
    } catch (error) {
        console.error("Failed add session :", error);

        return res.status(500).json({
            success: false,
            error: "Failed add session",
        });
    }
});

router.patch("/motion/session/update", async (req, res) => {
    const { device_ID } = req.body;

    if (!device_ID) {
        return res.status(400).json({
            success: false,
            error: "device_ID is required",
        });
    }

    try {
        const data = await update_device_ble_data_session(Number(device_ID));

        console.log(data);

        return res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Failed update motion session:", error);

        return res.status(500).json({
            success: false,
            error: "Failed update motion session",
        });
    }
});

router.get("/get/motion/sessions/data/:user_ID", async (req, res) => {
    const user_ID = Number(req.params.user_ID);

    if (!user_ID) {
        return res.status(400).json({
            success: false,
            error: "device_ID is required",
        });
    }

    try {
        const data = await get_device_ble_motion_session_data_by_user(user_ID);

        console.log(data);

        res.json({ success: true, data });
    } catch (error) {
        console.error("Failed get user sessions data :", error);

        return res.status(500).json({
            success: false,
            error: "Failed get user sessions data",
        });
    }
});

router.get("/get/all/:user_ID", async (req, res) => {
    const user_ID = Number(req.params.user_ID);

    console.log("user_ID: ", user_ID);

    if (!user_ID) {
        return res.status(400).json({
            success: false,
            error: "user_ID is required",
        });
    }

    try {
        const data = await get_all_device_ble(user_ID);

        console.log("data", data);

        res.json({ success: true, data });
    } catch (error) {
        console.error("Failed get user sessions data :", error);

        return res.status(500).json({
            success: false,
            error: "Failed get user sessions data",
        });
    }
});

export default router;
