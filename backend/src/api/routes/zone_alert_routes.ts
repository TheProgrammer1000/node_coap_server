import { Router } from "express";
import { get_all_device_zone_alert } from "../../db/db.js";

import { user_type } from "../../types.js";

const router = Router();

router.get("/:device_ID", async (req, res) => {
    const device_ID = Number(req.params.device_ID);

    const [data] = await get_all_device_zone_alert(device_ID);
    console.log("data: ", data);

    try {
        return res.json({
            data,
            success: true,
        });
    } catch (error) {
        console.error("Failed get zone alerts:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get zone alerts",
        });
    }
});

export default router;
