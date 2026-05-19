import { Router } from "express";
import dotenv from "dotenv";
import { find_or_create_oauth_user } from "../../db/db.js";
import { createUserToken } from "../../utils/jwt.js";

dotenv.config();

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

type GoogleUser = {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
};

function requireEnv(value: string | undefined, name: string) {
    if (!value) {
        throw new Error(`${name} saknas i .env`);
    }

    return value;
}

function createOAuthUsername(providerUserId: string) {
    const safeId = providerUserId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);

    return `google_${safeId}`;
}

function createSafeUser(user: any) {
    return {
        user_ID: Number(user.user_ID),
        show_username: user.show_username,
        username: user.username,
        email: user.email,
        auth_provider: user.auth_provider,
    };
}

function createJwtForDbUser(user: any) {
    return createUserToken({
        user_ID: Number(user.user_ID),
        username: user.username,
        email: user.email,
        auth_provider: user.auth_provider,
    });
}

function redirectToFrontendWithUser(user: any, token: string, res: any) {
    const safeUser = createSafeUser(user);

    const encodedUser = encodeURIComponent(JSON.stringify(safeUser));
    const encodedToken = encodeURIComponent(token);

    return res.redirect(
        `${FRONTEND_URL}/oauth/callback?user=${encodedUser}&token=${encodedToken}`,
    );
}

async function saveGoogleUserToDatabase(googleUser: GoogleUser) {
    const providerUserId = String(googleUser.sub || "");
    const email = String(googleUser.email || "").toLowerCase();
    const showUsername = String(
        googleUser.name || email.split("@")[0] || "Google user",
    );

    if (!providerUserId || !email) {
        throw new Error("Google user saknar email eller sub");
    }

    const username = createOAuthUsername(providerUserId);

    const rows = await find_or_create_oauth_user(
        showUsername,
        username,
        email,
        "google",
        providerUserId,
    );

    if (!rows || rows.length === 0) {
        throw new Error("Kunde inte hitta eller skapa Google user");
    }

    return rows[0];
}

router.get("/", (_req, res) => {
    return res.json({
        success: true,
        message: "Auth routes active",
    });
});

router.get("/google", (_req, res) => {
    try {
        const clientId = requireEnv(GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID");
        const redirectUri = requireEnv(
            GOOGLE_REDIRECT_URI,
            "GOOGLE_REDIRECT_URI",
        );

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "openid email profile",
            prompt: "select_account",
        });

        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

        return res.redirect(googleAuthUrl);
    } catch (error) {
        console.error("Google auth start failed:", error);

        return res.redirect(`${FRONTEND_URL}/login?oauth_error=google_config`);
    }
});

router.get("/google/callback", async (req, res) => {
    const code = String(req.query.code || "");

    if (!code) {
        return res.redirect(`${FRONTEND_URL}/login?oauth_error=missing_code`);
    }

    try {
        const clientId = requireEnv(GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID");
        const clientSecret = requireEnv(
            GOOGLE_CLIENT_SECRET,
            "GOOGLE_CLIENT_SECRET",
        );
        const redirectUri = requireEnv(
            GOOGLE_REDIRECT_URI,
            "GOOGLE_REDIRECT_URI",
        );

        const tokenResponse = await fetch(
            "https://oauth2.googleapis.com/token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri,
                    grant_type: "authorization_code",
                }),
            },
        );

        const tokenData: any = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error("Google token error:", tokenData);
            throw new Error("Google token exchange failed");
        }

        const accessToken = tokenData.access_token;

        if (!accessToken) {
            throw new Error("Google access_token saknas");
        }

        const userResponse = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        );

        const googleUser: GoogleUser = await userResponse.json();

        if (!userResponse.ok) {
            console.error("Google userinfo error:", googleUser);
            throw new Error("Google userinfo failed");
        }

        const dbUser = await saveGoogleUserToDatabase(googleUser);
        const token = createJwtForDbUser(dbUser);

        return redirectToFrontendWithUser(dbUser, token, res);
    } catch (error) {
        console.error("Google callback failed:", error);

        return res.redirect(`${FRONTEND_URL}/login?oauth_error=google_failed`);
    }
});

export default router;
