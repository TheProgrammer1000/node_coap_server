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
    add_device_event,
} from "../../../db/db.js";

import { device_event_type } from "../../../types.js";

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

router.post("/add", async (req, res) => {
    const device_event_data: device_event_type = req.body;

    console.log("device_event_data: ", device_event_data);

    try {
        const db_response = await add_device_event(
            device_event_data.device_ID,
            device_event_data.event_type,
            device_event_data.severity,
            device_event_data.message,
            device_event_data.data_transport,
            device_event_data.firmware_version,
        );

        console.log(db_response);

        res.status(201).json({ success: true, msg: db_response });
    } catch (error) {
        res.status(500).json({ success: false, msg: { error } });
    }
});

export default router;
