import { Router } from "express";
import { login_user, register_user } from "../../db/db.js";
import bcrypt from "bcrypt";

import { user_type } from "../../types.js";

const router = Router();

const SALT_ROUNDS = 12;

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

    // Frontend ska skicka password, inte password_hash.
    if (!user?.show_username || !user?.username || !user?.password) {
        return res.status(400).json({
            success: false,
            error: "show_username, username and password are required",
        });
    }

    try {
        // Hasha lösenordet innan det sparas i databasen.
        // Databasen ska bara spara password_hash, inte lösenord i klartext.
        const password_hash = await bcrypt.hash(user.password, SALT_ROUNDS);

        const data = await register_user(
            user.show_username,
            user.username,
            password_hash,
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
    const user = req.body;

    if (!user?.username || !user?.password) {
        return res.status(400).json({
            success: false,
            error: "username and password are required",
        });
    }

    try {
        const data = await login_user(user.username);

        if (!data || data.length === 0) {
            return res.status(401).json({
                success: false,
                error: "Wrong username or password",
            });
        }

        const dbUser = data[0];

        if (!dbUser.password_hash) {
            return res.status(401).json({
                success: false,
                error: "Wrong username or password",
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            user.password,
            dbUser.password_hash,
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                error: "Wrong username or password",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user_ID: dbUser.user_ID,
                show_username: dbUser.show_username,
                username: dbUser.username,
            },
        });
    } catch (error) {
        console.error("Failed to login user:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to login user",
        });
    }
});

export default router;
