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
    get_device_lifecycle,
} from "../../../db/db.js";

import { device_param, work_area_payload } from "../../../types.js";
import { checkGeofenceStatus } from "../../../utils/geofence.js";

const router = Router();

router.get("/get/:user_ID/:device_ID/:limit", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);
        const device_ID = Number(req.params.device_ID);
        const limit = Number(req.params.limit);

        if (!user_ID || !device_ID) {
            console.error("user_ID and device_ID Required");
            res.status(400).json({
                success: false,
                msg: "user_ID and device_ID Required",
            });
        }

        const db_response = await get_device_lifecycle(
            user_ID,
            device_ID,
            limit,
        );
        console.log(db_response);

        res.status(200).json({ success: true, db_response });
    } catch (error) {
        console.error("Failed to get device_ID:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get device_ID",
        });
    }
});

export default router;
