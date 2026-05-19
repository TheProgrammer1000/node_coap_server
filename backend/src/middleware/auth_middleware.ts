import type { Request, Response, NextFunction } from "express";
import { verifyUserToken } from "../utils/jwt.js";
import type { JwtUserPayload } from "../utils/jwt.js";

export type AuthRequest = Request & {
    user?: JwtUserPayload;
};

export function requireAuth(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            error: "Missing authorization token",
        });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    try {
        const decodedUser = verifyUserToken(token);

        req.user = decodedUser;

        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: "Invalid or expired token",
        });
    }
}
