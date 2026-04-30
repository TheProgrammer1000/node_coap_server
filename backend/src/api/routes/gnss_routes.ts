import { Router } from "express";
import {
    getGnssDataByDeviceId,
    getLastPositions,
    get_gnss_user_device,
    get_deviceID_by_userID,
    get_gnss_data_by_user_deviceID,
} from "../../db/db.js";

const router = Router();

router.get("/device/:deviceId", async (req, res) => {
    try {
        const deviceId = Number(req.params.deviceId);
        console.log("deviceId: ", deviceId);

        const device_data = await get_gnss_user_device(deviceId);
        console.log("device_data: ", device_data);

        if (device_data.length <= 0) {
            return res.status(200).json({
                success: false,
                message: "No gnss data to get!",
            });
        } else {
            return res.json({
                success: true,
                device_data,
            });
        }
    } catch (error) {
        console.error("Failed to get GNSS data by device:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get GNSS data by device",
        });
    }
});

router.get("/user/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);

        const data = await get_deviceID_by_userID(user_ID);

        if (data.length > 0) {
            console.log(data[0].device_ID);

            const result = await get_gnss_data_by_user_deviceID(
                data[0].device_ID,
            );

            console.log(result);
            res.json({ success: true, data: result });
        } else {
            res.json({ success: false, msg: "No userid attach to deviceID" });
        }
    } catch (error) {
        console.error("Failed to get GNSS data by device:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get GNSS data by device",
        });
    }
});

// CALL get_deviceID_by_userID(userID, deviceID);

export default router;
