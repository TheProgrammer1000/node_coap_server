import { Router } from "express";
import {
    add_device_firmware_que,
    get_device_firmware_que_all_done,
} from "../../../db/db.js";
// import { createUserToken } from "../../utils/jwt.js";

const router = Router();

router.post("/add/que", async (req, res) => {
    const device_ID = req?.body?.device_ID;
    const command = req?.body?.command;

    console.log("device_ID: ", device_ID);
    console.log("command: ", command);

    if (!req.body.device_ID || !req.body.command) {
        return res.status(400).json({
            success: false,
        });
    }

    try {
        const response = await add_device_firmware_que(device_ID, command);

        console.log("response: ", response);

        return res.status(200).json({
            success: true,
        });
    } catch (error) {
        console.error("Failed to go to root user:", error);

        return res.status(500).json({
            success: false,
            error,
        });
    }
});

router.get("/get/all/done", async (req, res) => {
    const user_ID = Number(req?.query?.user_ID);
    const device_ID = Number(req?.query?.device_ID);

    console.log("user_ID: ", user_ID);
    console.log("device_ID: ", device_ID);

    if (!user_ID || !device_ID) {
        return res.status(400).json({
            success: false,
        });
    }

    try {
        const response = await get_device_firmware_que_all_done(
            user_ID,
            device_ID,
        );

        return res.status(200).json({
            data: response,
            success: true,
        });
    } catch (error) {
        console.error("Failed to go to root user:", error);

        return res.status(500).json({
            success: false,
            error,
        });
    }
});

export default router;
