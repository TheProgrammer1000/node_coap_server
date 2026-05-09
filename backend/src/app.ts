import dotenv from "dotenv";

const dotenvResult = dotenv.config();

const requiredEnv = ["GEOAPIFY_API_KEY", "FRONTEND_ORIGIN"];

for (const key of requiredEnv) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

if (!process.env.GEOAPIFY_API_KEY) {
    throw new Error("Missing GEOAPIFY_API_KEY");
}

const { startApiServer } = await import("./api/api_server.js");
const { startCoapServer } = await import("./coap/coap_server.js");

startApiServer();
startCoapServer();
