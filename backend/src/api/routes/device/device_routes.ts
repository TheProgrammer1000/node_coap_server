import { Router } from "express";
import {
    getGnssDataByDeviceId,
    get_user_devices_latest_positions,
    get_gnss_user_device,
    get_deviceID_by_userID,
    get_all_deviceID_by_userID,
    add_new_device,
    add_device_arealocation,
    get_user_arealocations,
    get_gnss_data_for_arealocation,
    get_device_user_by_userID,
    get_user_devices_with_status,
    get_all_devices_from_userID,
    get_user_device_with_status,
} from "../../../db/db.js";

import { device_param, work_area_payload } from "../../../types.js";
import { checkGeofenceStatus } from "../../../utils/geofence.js";

const router = Router();

router.post("/register", async (req, res) => {
    try {
        const device: device_param = req.body;

        const data = await add_new_device(
            device.user_ID,
            device.device_name,
            device.device_serienumber,
            device.data_transport,
        );

        console.log("data: ", data);

        if (data?.success === 1) {
            return res.status(200).json({
                success: true,
                data,
            });
        }

        return res.status(400).json({
            success: false,
            message: data?.message ?? "Device could not be registered",
        });
    } catch (error) {
        console.error("Failed to register device:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to register device",
        });
    }
});

router.get("/user/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);

        const data = await get_deviceID_by_userID(user_ID);

        if (data.length > 0) {
            console.log(data[0].device_ID);

            const device_ID = data[0].device_ID;
            res.json({ success: true, device_ID: device_ID });
        } else {
            res.json({ success: false, msg: "No userid attach to deviceID" });
        }
    } catch (error) {
        console.error("Failed to get device_ID:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get device_ID",
        });
    }
});

router.get("/get/user/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);

        const data = await get_device_user_by_userID(user_ID);

        console.log("data: ", data);

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

router.get("/get/all/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);

        const data = await get_all_devices_from_userID(user_ID);

        console.log("data: ", data);

        if (data.length > 0) {
            console.log(data);
            res.json({ success: true, data });
        } else {
            res.json({
                success: false,
                msg: "no devices",
            });
        }
    } catch (error) {
        console.error("Failed to get devices:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get devices",
        });
    }
});

export default router;
