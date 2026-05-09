import dotenv from "dotenv";

const dotenvResult = dotenv.config();

console.log("ENV DEBUG - CWD:", process.cwd());
console.log("ENV DEBUG - dotenv error:", dotenvResult.error);
console.log(
    "ENV DEBUG - dotenv parsed GEOAPIFY:",
    Boolean(dotenvResult.parsed?.GEOAPIFY_API_KEY),
);
console.log(
    "ENV DEBUG - process.env GEOAPIFY:",
    Boolean(process.env.GEOAPIFY_API_KEY),
);

import { startApiServer } from "./api/api_server.js";
import { startCoapServer } from "./coap/coap_server.js";

startApiServer();
startCoapServer();
