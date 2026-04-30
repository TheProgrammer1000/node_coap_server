import { Router } from "express";
import { login_user, register_user } from "../../db/db.js";

import { user_type } from "../../types.js";

const router = Router();

router.get("/", async (req, res) => {
    try {
        return res.json({
            success: true,
        });
    } catch (error) {
        console.error("Failed to go to root user:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to user request",
        });
    }
});

router.post("/register", async (req, res) => {
    const user: user_type = req.body;

    try {
        const data = await register_user(
            user.show_username,
            user.username,
            user.password,
        );

        const is_created = data[0].is_created;

        console.log("is_created: ", is_created);

        if (is_created == 1) {
            return res.json({
                success: false,
                message: "User is already created",
            });
        } else {
            return res.json({
                success: true,
                message: "User is created!",
                data,
            });
        }
    } catch (error) {
        console.error("Failed to register user:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to register user",
        });
    }
});

router.post("/login", async (req, res) => {
    const user: user_type = req.body;

    try {
        const data = await login_user(user.username, user.password);

        console.log(data);

        if (data.length > 0) {
            res.status(200).json({ success: true, data });
        }
    } catch (error) {
        console.error("Failed to login user:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to login user",
        });
    }
});

export default router;
