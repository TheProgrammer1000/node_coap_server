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
    get_device_event,
} from "../../../db/db.js";

const router = Router();

router.get("/get/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);
        const data_transport = String(req.query.data_transport);
        let limit = Number(req.query.limit);

        if (!limit) {
            limit = 1;
        }

        const data = await get_device_event(user_ID, data_transport, limit);

        console.log(data);

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Failed to get device_ID:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get device_ID",
        });
    }
});

export default router;
