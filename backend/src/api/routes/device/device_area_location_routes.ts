import { Router } from "express";
import {
    add_device_arealocation,
    get_user_arealocations,
} from "../../../db/db.js";

import { work_area_payload } from "../../../types.js";

const router = Router();

router.post("/add", async (req, res) => {
    try {
        const payload: work_area_payload = req.body;

        console.log("payload: ", payload);

        const response = await add_device_arealocation(
            payload.user_ID,
            payload.device_ID,
            payload.lon,
            payload.lat,
            payload.circle_radius_m,
            payload.matchedAddress,
        );

        console.log(response);
        res.json({ success: true, data: response });
    } catch (err) {
        console.error("Failed to insert device location area ", err);
        res.status(500).json({
            success: false,
            message: "Failed to insert device location area",
        });
    }
});

router.get("/get/:user_ID", async (req, res) => {
    try {
        const user_ID = Number(req.params.user_ID);

        const data = await get_user_arealocations(user_ID);

        if (data.length > 0) {
            res.json({ success: true, devices: data });
        } else {
            res.json({
                success: false,
                msg: "No userid attach to area locations",
            });
        }
    } catch (error) {
        console.error("Failed to get area locations", error);

        return res.status(500).json({
            success: false,
            error: "Failed to get area locations",
        });
    }
});

export default router;
