import { Router } from "express";
import { getGnssDataByDeviceId, getLastPositions } from "../../db/db.js";

const router = Router();

router.get("/", async (req, res) => {
    try {
        const limit = Number(req.query.limit || 5);

        const data = await getLastPositions(limit);

        return res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Failed to get last positions:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get last positions",
        });
    }
});

router.get("/device/:deviceId", async (req, res) => {
    try {
        const deviceId = Number(req.params.deviceId);
        const limit = Number(req.query.limit || 50);

        if (Number.isNaN(deviceId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid device ID",
            });
        }

        const data = await getGnssDataByDeviceId(deviceId, limit);

        return res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Failed to get GNSS data by device:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get GNSS data by device",
        });
    }
});

export default router;
