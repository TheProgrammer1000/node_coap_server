import { Router } from "express";
import { get_all_devices_alert_by_type } from "../../db/db.js";

const router = Router();
router.get("/:device_ID", async (req, res) => {
    const device_ID = Number(req.params.device_ID);
    const status_type = String(req.query.status_type ?? "").trim();

    if (!Number.isFinite(device_ID)) {
        return res.status(400).json({
            success: false,
            error: "Invalid device_ID",
        });
    }

    try {
        const data = await get_all_devices_alert_by_type(
            device_ID,
            status_type,
        );

        return res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Failed to get device alerts:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get device alerts",
        });
    }
});

export default router;
