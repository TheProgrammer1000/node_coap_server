import dotenv from "dotenv";

const dotenvResult = dotenv.config();

if (!process.env.GEOAPIFY_API_KEY) {
    throw new Error("Missing GEOAPIFY_API_KEY");
}

const { startApiServer } = await import("./api/api_server.js");
const { startCoapServer } = await import("./coap/coap_server.js");

startApiServer();
startCoapServer();
