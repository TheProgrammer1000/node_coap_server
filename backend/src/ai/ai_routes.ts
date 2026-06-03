import { Router } from "express";
import {
    explainAlertWithOllama,
    explainDevicePayloadWithOllama,
} from "../services/ai/ollama.service.js";

const router = Router();

router.post("/explain-alert", async (req, res) => {
    const alertData = req.body;

    if (!alertData?.device_ID || !alertData?.to_status) {
        return res.status(400).json({
            success: false,
            error: "device_ID and alert data are required",
        });
    }

    try {
        const explanation = await explainAlertWithOllama(alertData);

        return res.json({
            success: true,
            explanation,
            alert: alertData,
        });
    } catch (error) {
        console.error("Failed to explain alert:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to explain alert",
        });
    }
});

router.post("/explain/device-payload", async (req, res) => {
    const payloadData = req.body;

    if (!payloadData) {
        return res.status(400).json({
            success: false,
            error: "payload is required",
        });
    }

    try {
        const explanation = await explainDevicePayloadWithOllama(payloadData);
        return res.status(200).json({
            success: true,
            explanation,
            payload: payloadData,
        });
    } catch (error) {
        console.error("Failed to explain device-payload", error);

        return res.status(500).json({
            success: false,
            error: "Failed to device-payload",
        });
    }
});

export default router;
