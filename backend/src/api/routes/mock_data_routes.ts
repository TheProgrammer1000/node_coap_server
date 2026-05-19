import { Router } from "express";
import { sendMockPositions } from "../../coap/demo_routes.js";

const router = Router();

router.post("/cellular", async (req, res) => {
    const device_ID = Number(req.body?.device_ID);
    const route = req.body?.route;
    const interval_ms = Number(req.body?.interval_ms ?? 2000);

    if (!Number.isFinite(device_ID) || device_ID <= 0) {
        return res.status(400).json({
            success: false,
            error: "device_ID is required",
        });
    }

    if (!Array.isArray(route) || route.length === 0) {
        return res.status(400).json({
            success: false,
            error: "route is required and must be an array",
        });
    }

    try {
        const result = await sendMockPositions({
            device_ID,
            route,
            interval_ms,
        });

        return res.status(200).json({
            success: true,
            message: "Mock cellular GNSS route sent",
            data: result,
        });
    } catch (error) {
        console.error("Failed to send mock cellular route:", error);

        return res.status(500).json({
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to send mock cellular route",
        });
    }
});

export default router;
