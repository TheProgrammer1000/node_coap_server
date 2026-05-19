import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";

const jwtSecretFromEnv = process.env.JWT_SECRET;

if (!jwtSecretFromEnv) {
    throw new Error("JWT_SECRET saknas i .env");
}

const JWT_SECRET: Secret = jwtSecretFromEnv;

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
    "7d") as SignOptions["expiresIn"];

export type JwtUserPayload = {
    user_ID: number;
    username: string;
    email?: string | null;
    auth_provider?: string;
};

export function createUserToken(user: JwtUserPayload): string {
    const payload: JwtUserPayload = {
        user_ID: user.user_ID,
        username: user.username,
        email: user.email ?? null,
        auth_provider: user.auth_provider ?? "local",
    };

    const options: SignOptions = {
        expiresIn: JWT_EXPIRES_IN,
    };

    return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyUserToken(token: string): JwtUserPayload {
    return jwt.verify(token, JWT_SECRET) as JwtUserPayload;
}
