import { Router } from "express";
import { login_user, register_user } from "../../db/db.js";
import bcrypt from "bcrypt";
import { createUserToken } from "../../utils/jwt.js";

import { user_type } from "../../types.js";

const router = Router();

const SALT_ROUNDS = 12;

router.get("/", async (_req, res) => {
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

    const showUsername = String(user?.show_username ?? "").trim();
    const username = String(user?.username ?? "").trim();
    const email = String(user?.email ?? "")
        .trim()
        .toLowerCase();
    const password = String(user?.password ?? "");

    if (!showUsername || !username || !email || !password) {
        return res.status(400).json({
            success: false,
            error: "show_username, username, email and password are required",
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            error: "Password must be at least 8 characters",
        });
    }

    try {
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        const data = await register_user(
            showUsername,
            username,
            password_hash,
            email,
        );

        const firstRow = data?.[0];
        const isCreated = Number(firstRow?.is_created);

        console.log("register_user result:", data);
        console.log("is_created:", isCreated);

        if (isCreated === 1) {
            return res.status(409).json({
                success: false,
                message: "Username or email is already used",
            });
        }

        return res.status(201).json({
            success: true,
            message: "User is created!",
            data,
        });
    } catch (error: any) {
        console.error("Failed to register user:", error);

        if (error?.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                error: "Username or email is already used",
            });
        }

        return res.status(500).json({
            success: false,
            error: "Failed to register user",
        });
    }
});

router.post("/login", async (req, res) => {
    const loginValue = String(
        req.body?.username ?? req.body?.email ?? "",
    ).trim();

    const password = String(req.body?.password ?? "");

    if (!loginValue || !password) {
        return res.status(400).json({
            success: false,
            error: "username/email and password are required",
        });
    }

    try {
        const data = await login_user(loginValue, loginValue);

        if (!data || data.length === 0) {
            return res.status(401).json({
                success: false,
                error: "Wrong username/email or password",
            });
        }

        const dbUser = data[0];

        if (!dbUser.password_hash) {
            return res.status(401).json({
                success: false,
                error: "Wrong username/email or password",
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            dbUser.password_hash,
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                error: "Wrong username/email or password",
            });
        }

        const token = createUserToken({
            user_ID: Number(dbUser.user_ID),
            username: dbUser.username,
            email: dbUser.email,
            auth_provider: dbUser.auth_provider,
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            data: {
                user_ID: dbUser.user_ID,
                show_username: dbUser.show_username,
                username: dbUser.username,
                email: dbUser.email,
                auth_provider: dbUser.auth_provider,
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
